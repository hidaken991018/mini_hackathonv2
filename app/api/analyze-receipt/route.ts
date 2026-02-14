import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getDefaultExpiryDates } from '@/lib/expiry-defaults';
import { isStapleFood } from '@/lib/food-category';
import { requireAuth } from '@/lib/auth-helpers';
import { createValidationErrorResponse } from '@/lib/validation/error-response';
import { analyzeReceiptRequestSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic'

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    // リクエストボディから画像データを取得（形式・サイズを検証）
    const body = await request.json();
    const validation = analyzeReceiptRequestSchema.safeParse(body);
    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error,
        'リクエストボディの検証に失敗しました',
      );
    }

    const { imageData } = validation.data;

    // APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 },
      );
    }

    // Gemini 1.5 Flash モデルを使用（画像解析に対応、安定版）
    // 構造化出力（Structured Output）を使用してJSON形式を保証
    // 参考: https://ai.google.dev/gemini-api/docs/structured-output?hl=ja
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: '食材・食品・飲料の名前（日用品は含めない）',
                  },
                  quantityValue: {
                    type: SchemaType.INTEGER,
                    description: '数量を整数で返す（例: 卵10個入り→10、牛乳1本→1、冷凍ブロッコリー300g→300、食パン6枚切り→6）',
                    nullable: true,
                  },
                  quantityUnit: {
                    type: SchemaType.STRING,
                    description: '単位（個、本、パック、袋、房、束、枚、玉、株、g、kg、ml、L）',
                    nullable: true,
                  },
                  expireDate: {
                    type: SchemaType.STRING,
                    description: '賞味期限（YYYY-MM-DD形式）。レシートに記載がなければnull。',
                    nullable: true,
                  },
                  consumeBy: {
                    type: SchemaType.STRING,
                    description: '消費期限（YYYY-MM-DD形式）。レシートに記載がなければnull。',
                    nullable: true,
                  },
                  isStaple: {
                    type: SchemaType.BOOLEAN,
                    description: '常備品（調味料・油・バター等、少量ずつ長期間使うもの）ならtrue、使い切り食材（肉・魚・野菜等）ならfalse',
                  },
                },
                required: ['name', 'isStaple'],
              },
              description: 'レシートから抽出された食材・食品・飲料リスト（日用品は除外）',
            },
          },
          required: ['items'],
        },
      },
    });

    // Base64データからプレフィックスを除去
    // 例: "data:image/jpeg;base64,/9j/4AAQ..." → "/9j/4AAQ..."
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // 画像データを準備
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg', // 多くの場合JPEGで問題ない
      },
    };

    // プロンプト：レシートから食材を抽出するよう指示
    // スキーマで出力形式を保証しているため、プロンプトはシンプルに
    const prompt = `このレシート画像を解析して、購入された「食べられるもの・飲めるもの」のみを抽出してください。

【重要】以下のカテゴリは絶対に含めないでください：
- 日用品（洗剤、柔軟剤、食器用洗剤、ハンドソープ、シャンプー等）
- 消耗品（ラップ、アルミホイル、ゴミ袋、ティッシュ、トイレットペーパー、キッチンペーパー等）
- 雑貨・文房具・衣類・電池・その他の非食品
- 判断に迷う場合は除外してください

【対象とするもの】
- 食材（肉、魚、野菜、果物、卵、豆腐等）
- 加工食品（パン、麺、冷凍食品、缶詰、レトルト等）
- 調味料（醤油、味噌、塩、砂糖、油等）
- 飲料（牛乳、ジュース、お茶、水、酒類等）
- お菓子・スナック類

【食材の分類ルール - 非常に重要】
各食材を「常備品」か「使い切り食材」に分類してください。

■ 常備品（isStaple: true）- 調理で少量ずつ使い、1回では使い切らないもの
  - 調味料: 醤油、味噌、塩、砂糖、酢、みりん、料理酒、ソース、ケチャップ、マヨネーズ等
  - 油脂類: バター、オリーブオイル、サラダ油、ごま油等
  - 粉類: 小麦粉、片栗粉、パン粉等
  - スパイス: こしょう、カレー粉等
  - 常備品は必ず quantityValue: 1, quantityUnit: "個" または "本" で登録
  - 商品名の重量表記（例: バター200g）はパッケージ仕様であり、数量ではない

■ 使い切り食材（isStaple: false）- 調理で消費される一般食材
  - 肉、魚、野菜、果物、卵、豆腐、パン、牛乳、ヨーグルト、冷凍食品等
  - 食材カテゴリに応じた最適な単位で記録する（下記ルール参照）

【数量の記録ルール - カテゴリ別】
食材の種類ごとに「ユーザーが消費を把握しやすい単位」で記録してください。

■ 常備品の例（isStaple: true）— 必ず1個または1本:
- 雪印北海道バター(200g) → name: "北海道バター", quantityValue: 1, quantityUnit: "個", isStaple: true
  （200gは商品の仕様であり購入数量ではない。1個として登録）
- BOSCOオリーブオイル → quantityValue: 1, quantityUnit: "本", isStaple: true
- キッコーマン醤油1L → quantityValue: 1, quantityUnit: "本", isStaple: true

■ 使い切り食材の例（isStaple: false）— カテゴリ別に単位を選ぶ:

【冷凍野菜】→ パッケージの重量(g)をそのまま使う:
- 冷凍ブロッコリー(300g) → quantityValue: 300, quantityUnit: "g"
- 冷凍ほうれん草(200g) → quantityValue: 200, quantityUnit: "g"
- 冷凍枝豆(400g) → quantityValue: 400, quantityUnit: "g"

【冷凍おかず・冷凍食品】→ 袋または個:
- 冷凍餃子(12個入) → quantityValue: 1, quantityUnit: "袋"
- 冷凍チャーハン → quantityValue: 1, quantityUnit: "袋"

【ヨーグルト】→ サイズで判断:
- 大容量ヨーグルト(400g) → quantityValue: 400, quantityUnit: "g"（少しずつ食べるため重さで管理）
- 個装ヨーグルト(4個パック) → quantityValue: 4, quantityUnit: "個"（1個ずつ食べるため個数で管理）

【食パン】→ 枚数:
- 食パン6枚切り → quantityValue: 6, quantityUnit: "枚"
- 食パン8枚切り → quantityValue: 8, quantityUnit: "枚"

【牛乳・飲料】→ 本:
- 牛乳1L → quantityValue: 1, quantityUnit: "本"
- 牛乳500ml → quantityValue: 1, quantityUnit: "本"
- ジュース → quantityValue: 1, quantityUnit: "本"

【肉・魚】→ パック:
- 国産牛肩ロース薄切り → quantityValue: 1, quantityUnit: "パック"
- 鶏むね肉 → quantityValue: 1, quantityUnit: "パック"
- サーモン刺身 → quantityValue: 1, quantityUnit: "パック"

【野菜・果物】→ 自然な個数単位:
- レタス → quantityValue: 1, quantityUnit: "個"
- ネギ → quantityValue: 1, quantityUnit: "本"
- ほうれん草 → quantityValue: 1, quantityUnit: "束"
- トマト(3個入) → quantityValue: 3, quantityUnit: "個"
- バナナ → quantityValue: 1, quantityUnit: "房"
- 玉ねぎ → quantityValue: 1, quantityUnit: "玉"

【卵】→ 個数:
- 卵10個入り → quantityValue: 10, quantityUnit: "個"

使用する単位: 個、本、パック、袋、房、束、枚、玉、株、g、kg、ml、L

各食材について以下の情報を抽出してください：
- name: 食材名（例: 卵、りんご、牛乳）
- quantityValue: 数量の数値（整数のみ。小数は使わず、必ず整数で返すこと）
- quantityUnit: 単位（個、本、パック、袋、房、束、枚、g、kg、ml、Lなど）
- isStaple: 常備品ならtrue、使い切り食材ならfalse
- expireDate: 賞味期限（YYYY-MM-DD形式）。レシートや商品に記載がある場合のみ。
- consumeBy: 消費期限（YYYY-MM-DD形式）。レシートや商品に記載がある場合のみ。

賞味期限と消費期限の違い：
- 賞味期限（expireDate）: 美味しく食べられる期限。過ぎても食べられる場合がある。
- 消費期限（consumeBy）: 安全に食べられる期限。過ぎたら食べない方が良い。

数量がレシートから判断できない場合は、quantityValue: 1, quantityUnit: "個" をデフォルトとしてください。
価格や合計金額、店舗名は含めないでください。
レシートでない場合や読み取れない場合は、itemsを空配列にしてください。`;

    // Gemini APIに送信（構造化出力を使用）
    // responseMimeType: 'application/json' により、JSON形式で返される
    const result = await model.generateContent([prompt, imagePart]);

    const response = await result.response;
    const text = response.text();

    // 構造化出力により、text()は既にJSON文字列として返される
    try {
      // Geminiが異常に長い数値（数千桁の浮動小数点）を返す場合があるため、
      // 16文字以上の数値列をJavaScriptのNumber型で安全な精度に変換する
      const sanitizedText = text.replace(
        /-?\d[\d.]{15,}/g,
        (match) => String(Number(match) || 0)
      );
      const analysisResult = JSON.parse(sanitizedText);

      // 後処理: 常備品フラグのダブルチェック + デフォルト期限の自動設定
      const items = (analysisResult.items || []).map(
        (item: {
          name: string;
          quantityValue?: number;
          quantityUnit?: string;
          expireDate?: string;
          consumeBy?: string;
          isStaple?: boolean;
        }) => {
          // Geminiの判定が不正確な場合、キーワード辞書でフォールバック判定
          const staple = item.isStaple === true || isStapleFood(item.name);
          const processed = { ...item, isStaple: staple };

          // 生鮮食材のみ、食材カテゴリ別のデフォルト期限を自動設定
          // 常備品・調味料等は期限を設定しない（手動入力に任せる）
          if (!staple && !processed.expireDate && !processed.consumeBy) {
            const defaults = getDefaultExpiryDates(processed.name);
            if (defaults.expireDate || defaults.consumeBy) {
              return { ...processed, expireDate: defaults.expireDate, consumeBy: defaults.consumeBy };
            }
          }
          return processed;
        },
      );

      // 後方互換性のため、文字列形式の ingredients も生成
      const ingredients = items.map(
        (item: {
          name: string;
          quantityValue?: number;
          quantityUnit?: string;
        }) => {
          if (item.quantityValue && item.quantityUnit) {
            return `${item.name} ${item.quantityValue}${item.quantityUnit}`;
          }
          return item.name;
        },
      );

      return NextResponse.json({
        success: true,
        data: {
          ingredients, // 後方互換性
          items, // 新しい構造化形式
        },
      });
    } catch (parseError) {
      // JSONパースに失敗した場合（通常は発生しないはず）
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', text);

      return NextResponse.json(
        {
          success: false,
          error: 'レシートの解析結果をパースできませんでした',
          ...(process.env.NODE_ENV === 'development' && { rawResponse: text }),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Receipt analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'レシートの解析中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 },
    );
  }
}
