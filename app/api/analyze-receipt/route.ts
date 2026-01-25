import { GoogleGenerativeAI } from '@google/generative-ai';
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
    const prompt = `このレシート画像を解析して、購入された食材・食品を抽出してください。

以下のJSON形式で回答してください。必ず有効なJSONのみを返してください（説明文は不要です）：

{
  "ingredients": ["食材1", "食材2", "食材3"],
  "totalAmount": 1234,
  "storeName": "店舗名"
}

注意事項：
- ingredients には食材・食品名のみを配列で入れてください
- 価格、数量、税などは ingredients に含めないでください
- totalAmount は合計金額を数値で入れてください（不明な場合は null）
- storeName は店舗名を入れてください（不明な場合は null）
- レシートでない場合や食材が読み取れない場合は、ingredients を空配列 [] にしてください`;

    // Gemini APIに送信
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // JSONをパース
    // Geminiの応答からJSONを抽出（```json ... ``` で囲まれている場合にも対応）
    let jsonText = text;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    try {
      const analysisResult = JSON.parse(jsonText);
      
      return NextResponse.json({
        success: true,
        data: {
          ingredients: analysisResult.ingredients || [],
          totalAmount: analysisResult.totalAmount || null,
          storeName: analysisResult.storeName || null,
        },
      });
    } catch (parseError) {
      // JSONパースに失敗した場合
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
