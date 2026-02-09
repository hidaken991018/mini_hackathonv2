import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // リクエストボディから画像データを取得
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: '画像データが必要です' },
        { status: 400 },
      );
    }

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
                    type: SchemaType.NUMBER,
                    description: '購入パッケージ単位での数量（例: 卵10個入り→10、牛乳1本→1、ビール350ml缶→1）',
                    nullable: true,
                  },
                  quantityUnit: {
                    type: SchemaType.STRING,
                    description: '購入パッケージ単位（個、本、パック、袋、房、束、枚、玉、株。g/ml/kg/Lは調味料・乳製品のみ）',
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
                },
                required: ['name'],
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

【数量の記録ルール - 非常に重要】
数量は「購入時のパッケージ単位（自然な購入単位）」で記録してください。
グラム(g)やミリリットル(ml)での記録は避け、パッケージ単位を使います。

具体例:
- ブロッコリー1株 → quantityValue: 1, quantityUnit: "株"（×496gとしない）
- にんじん3本入り → quantityValue: 3, quantityUnit: "本"
- 牛乳1L → quantityValue: 1, quantityUnit: "本"（×1000mlとしない）
- ビール350ml缶 → quantityValue: 1, quantityUnit: "本"（×350mlとしない）
- 卵10個入り → quantityValue: 10, quantityUnit: "個"
- 豚バラ肉 → quantityValue: 1, quantityUnit: "パック"（×200gとしない）
- 食パン6枚切り → quantityValue: 1, quantityUnit: "袋"
- バナナ1房 → quantityValue: 1, quantityUnit: "房"
- ほうれん草 → quantityValue: 1, quantityUnit: "束"
- ヨーグルト400g → quantityValue: 400, quantityUnit: "g"（内容量をそのまま使用）
- クリームチーズ200g → quantityValue: 200, quantityUnit: "g"（内容量をそのまま使用）

使用する単位: 個、本、パック、袋、房、束、枚、玉、株
g/ml/kg/Lは以下の場合に使用してください：
- 調味料（砂糖1kg、醤油1L等）
- 乳製品で内容量表記のもの（ヨーグルト400g、クリームチーズ200g等）
- 上記以外の食材はパッケージ単位を使用

各食材について以下の情報を抽出してください：
- name: 食材名（例: 卵、りんご、牛乳）
- quantityValue: 数量の数値（パッケージ単位での数量）
- quantityUnit: 単位（個、本、パック、袋、房、束、枚など）
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
      const analysisResult = JSON.parse(text);
      const items = analysisResult.items || [];

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
          rawResponse: text,
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
