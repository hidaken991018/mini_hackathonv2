import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

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

    // Gemini 2.0 Flash モデルを使用（画像解析に対応、最新版）
    // 構造化出力（Structured Output）を使用してJSON形式を保証
    // 参考: https://ai.google.dev/gemini-api/docs/structured-output?hl=ja
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
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
                    description: '食材・食品の名前',
                  },
                  quantityValue: {
                    type: SchemaType.NUMBER,
                    description: '数量の数値部分（例: 6個なら6）',
                    nullable: false,
                  },
                  quantityUnit: {
                    type: SchemaType.STRING,
                    description: '数量の単位（例: 個、パック、ml、g）',
                    nullable: false,
                  },
                  expireDate: {
                    type: SchemaType.STRING,
                    description:
                      '賞味期限（YYYY-MM-DD形式）。レシートに記載がある場合のみ。',
                    nullable: false,
                  },
                  consumeBy: {
                    type: SchemaType.STRING,
                    description:
                      '消費期限（YYYY-MM-DD形式）。レシートに記載がある場合のみ。',
                    nullable: false,
                  },
                },
                required: ['name'],
              },
              description: 'レシートから抽出された食材・食品リスト（構造化）',
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
    const prompt = `このレシート画像を解析して、購入された食材・食品を抽出してください。

各食材について以下の情報を抽出してください：
- name: 食材名（例: 卵、りんご、牛乳）
- quantityValue: 数量の数値（例: 6個なら6、1000mlなら1000）
- quantityUnit: 単位（例: 個、パック、ml、g、本）
- expireDate: 賞味期限（YYYY-MM-DD形式）。レシートや商品に記載がある場合のみ。
- consumeBy: 消費期限（YYYY-MM-DD形式）。レシートや商品に記載がある場合のみ。

賞味期限と消費期限の違い：
- 賞味期限（expireDate）: 美味しく食べられる期限。過ぎても食べられる場合がある。
- 消費期限（consumeBy）: 安全に食べられる期限。過ぎたら食べない方が良い。

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
