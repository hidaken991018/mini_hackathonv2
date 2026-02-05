import { VertexAI, GenerateContentRequest } from '@google-cloud/vertexai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Vertex AI クライアントの初期化
// Cloud Run 上では Application Default Credentials (ADC) で自動認証
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || '';
const LOCATION = process.env.VERTEX_AI_LOCATION || 'asia-northeast1';

const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

// レスポンスの JSON Schema 定義
const responseSchema = {
  type: 'object' as const,
  properties: {
    items: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string' as const,
            description: '食材・食品の名前',
          },
          quantityValue: {
            type: 'number' as const,
            description: '数量の数値部分（例: 6個なら6）',
            nullable: true,
          },
          quantityUnit: {
            type: 'string' as const,
            description: '数量の単位（例: 個、パック、ml、g）',
            nullable: true,
          },
          expireDate: {
            type: 'string' as const,
            description: '賞味期限（YYYY-MM-DD形式）。推論する。',
            nullable: false,
          },
          consumeBy: {
            type: 'string' as const,
            description: '消費期限（YYYY-MM-DD形式）。推論する。',
            nullable: false,
          },
        },
        required: ['name'],
      },
      description: 'レシートから抽出された食材・食品リスト（構造化）',
    },
  },
  required: ['items'],
};

export async function POST(request: NextRequest) {
  try {
    // リクエストボディから画像データを取得
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: '画像データが必要です' },
        { status: 400 }
      );
    }

    // プロジェクトIDの確認
    if (!PROJECT_ID) {
      return NextResponse.json(
        { error: 'GOOGLE_CLOUD_PROJECTが設定されていません' },
        { status: 500 }
      );
    }

    // Gemini 2.0 Flash モデルを取得
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    // Base64データからプレフィックスを除去
    // 例: "data:image/jpeg;base64,/9j/4AAQ..." → "/9j/4AAQ..."
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // プロンプト：レシートから食材を抽出するよう指示
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

    // Vertex AI に送信
    const generateContentRequest: GenerateContentRequest = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const result = await model.generateContent(generateContentRequest);
    const response = result.response;

    // レスポンスからテキストを取得
    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text || '{"items":[]}';

    // 構造化出力により、text は既に JSON 文字列として返される
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
        }
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
        { status: 500 }
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
      { status: 500 }
    );
  }
}
