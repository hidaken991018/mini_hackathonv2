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
        { status: 400 }
      );
    }

    // APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 }
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
            ingredients: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'レシートから抽出された食材・食品名のリスト（価格や数量は含めない）',
            },
            totalAmount: {
              type: SchemaType.NUMBER,
              description: 'レシートの合計金額（不明な場合はnull）',
              nullable: true,
            },
            storeName: {
              type: SchemaType.STRING,
              description: '店舗名（不明な場合はnull）',
              nullable: true,
            },
          },
          required: ['ingredients'],
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
食材名のみを抽出し、価格や数量は含めないでください。
レシートでない場合や読み取れない場合は、ingredientsを空配列にしてください。`;

    // Gemini APIに送信（構造化出力を使用）
    // responseMimeType: 'application/json' により、JSON形式で返される
    const result = await model.generateContent([prompt, imagePart]);
    
    const response = await result.response;
    const text = response.text();

    // 構造化出力により、text()は既にJSON文字列として返される
    try {
      const analysisResult = JSON.parse(text);
      
      return NextResponse.json({
        success: true,
        data: {
          ingredients: analysisResult.ingredients || [],
          totalAmount: analysisResult.totalAmount ?? null,
          storeName: analysisResult.storeName ?? null,
        },
      });
    } catch (parseError) {
      // JSONパースに失敗した場合（通常は発生しないはず）
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', text);
      
      return NextResponse.json({
        success: false,
        error: 'レシートの解析結果をパースできませんでした',
        rawResponse: text,
      }, { status: 500 });
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
