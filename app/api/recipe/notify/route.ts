import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveBase64Image } from '@/lib/image-storage';

type GeneratedIngredient = {
  name: string;
  quantityValue?: number | null;
  quantityUnit?: string | null;
};

type GeneratedStep = {
  step: number;
  instruction: string;
};
export const dynamic = 'force-dynamic';

type Candidate = {
  recipe: {
    id: string;
    title: string;
    ingredients: { name: string }[];
  };
  matchedIngredientCount: number;
  matchedInventoryNames: string[];
  closestDate: Date | null;
  score: number;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const normalize = (value: string) => value.trim().toLowerCase();

const isMatch = (ingredient: string, inventory: string) => {
  const a = normalize(ingredient);
  const b = normalize(inventory);
  return a.includes(b) || b.includes(a);
};

const formatInventoryLine = (item: {
  name: string;
  quantityValue: number | null;
  quantityUnit: string | null;
  expireDate: Date | null;
  consumeBy: Date | null;
}) => {
  const quantityText =
    item.quantityValue !== null
      ? `${item.quantityValue}${item.quantityUnit ?? ''}`
      : (item.quantityUnit ?? '');
  const expireText = item.expireDate
    ? item.expireDate.toISOString().slice(0, 10)
    : null;
  const consumeText = item.consumeBy
    ? item.consumeBy.toISOString().slice(0, 10)
    : null;

  const dateText = consumeText ?? expireText;
  const meta = [quantityText, dateText ? `期限:${dateText}` : null]
    .filter(Boolean)
    .join(' ');

  return `- ${item.name}${meta ? ` (${meta})` : ''}`;
};

const parseJsonFromText = (text: string) => {
  const cleaned = text.trim();
  if (!cleaned) return null;

  const withoutFence = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userId が必要です' },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 },
      );
    }

    const inventories = await prisma.inventory.findMany({
      where: { userId },
      select: {
        name: true,
        quantityValue: true,
        quantityUnit: true,
        expireDate: true,
        consumeBy: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (inventories.length === 0) {
      return NextResponse.json(
        { success: false, error: '在庫がありません' },
        { status: 200 },
      );
    }

    const inventoryList = inventories.map(formatInventoryLine).join('\n');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            canMakeWithInventory: { type: SchemaType.BOOLEAN },
            missingIngredients: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            ingredients: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  quantityValue: {
                    type: SchemaType.NUMBER,
                    nullable: true,
                  },
                  quantityUnit: {
                    type: SchemaType.STRING,
                    nullable: true,
                  },
                },
                required: ['name'],
              },
            },
            steps: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  step: { type: SchemaType.NUMBER },
                  instruction: { type: SchemaType.STRING },
                },
                required: ['step', 'instruction'],
              },
            },
            cookingTime: { type: SchemaType.STRING, nullable: true },
            servings: { type: SchemaType.STRING, nullable: true },
          },
          required: ['title', 'canMakeWithInventory', 'ingredients', 'steps'],
        },
      },
    });

    const prompt = `あなたは家庭料理のレシピ提案AIです。
次の在庫リストだけを使って、可能な限り「在庫のみ」で作れるレシピを1つ作成してください。
もし在庫だけでは現実的に難しい場合のみ、不足する材料を missingIngredients に明示してください。

ルール:
- 可能なら必ず在庫のみで作る（canMakeWithInventory=true, missingIngredients=[]）
- 在庫だけでは難しい場合は canMakeWithInventory=false にして、足りない材料を missingIngredients に列挙
- ingredients はレシピで使う材料のみ記載
- steps は調理手順を簡潔に、5〜8ステップ程度

在庫リスト:
${inventoryList}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsed = parseJsonFromText(text);

    if (!parsed) {
      const retry = await model.generateContent(prompt);
      const retryResponse = await retry.response;
      const retryText = retryResponse.text();
      parsed = parseJsonFromText(retryText);

      if (!parsed) {
        return NextResponse.json(
          {
            success: false,
            error: 'レシピ生成中にエラーが発生しました',
            details: 'GeminiのJSON解析に失敗しました',
            rawResponse: retryText.slice(0, 800),
          },
          { status: 502 },
        );
      }
    }

    const ingredientObjects: GeneratedIngredient[] = Array.isArray(
      parsed.ingredients,
    )
      ? parsed.ingredients.map((ingredient: GeneratedIngredient | string) => {
          if (typeof ingredient === 'string') {
            return { name: ingredient };
          }
          return {
            name: ingredient.name,
            quantityValue: ingredient.quantityValue ?? null,
            quantityUnit: ingredient.quantityUnit ?? null,
          };
        })
      : [];

    const steps: GeneratedStep[] = Array.isArray(parsed.steps)
      ? parsed.steps.map((step: GeneratedStep, index: number) => ({
          step: Number(step.step) || index + 1,
          instruction: step.instruction,
        }))
      : [];

    const inventoryNames = inventories.map((item) => item.name);
    const derivedMissing = ingredientObjects
      .map((ingredient) => ingredient.name)
      .filter(
        (name) => !inventoryNames.some((inventory) => isMatch(name, inventory)),
      );

    const rawMissing = Array.isArray(parsed.missingIngredients)
      ? (parsed.missingIngredients as unknown[])
      : [];

    const missingIngredients: string[] = rawMissing
      .filter((item: unknown): item is string => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);

    const normalizedMissing = missingIngredients.filter((name: string) =>
      inventoryNames.every((inventory) => !isMatch(name, inventory)),
    );

    const finalMissing =
      normalizedMissing.length > 0 ? normalizedMissing : derivedMissing;

    const canMakeWithInventory = finalMissing.length === 0;

    const recipeTitle =
      typeof parsed.title === 'string' && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : '在庫レシピ';

    const matchedInventoryNames = Array.from(
      new Set(
        inventories
          .filter((inventory) =>
            ingredientObjects.some((ingredient) =>
              isMatch(ingredient.name, inventory.name),
            ),
          )
          .map((inventory) => inventory.name),
      ),
    );

    const matchText =
      matchedInventoryNames.length > 0
        ? matchedInventoryNames.join('・')
        : '在庫の食材';

    const title = `今日のおすすめレシピ: ${recipeTitle}`;
    const body = canMakeWithInventory
      ? `在庫の「${matchText}」を使って「${recipeTitle}」を作りませんか？`
      : `在庫の「${matchText}」で作れるレシピです。足りない材料: ${finalMissing.join(
          '・',
        )}`;

    const recipe = await prisma.recipe.create({
      data: {
        title: recipeTitle,
        cookingTime: parsed.cookingTime ?? null,
        servings: parsed.servings ?? null,
        ingredients: {
          create: ingredientObjects.map((ingredient, index) => ({
            name: ingredient.name,
            quantityValue: ingredient.quantityValue ?? null,
            quantityUnit: ingredient.quantityUnit ?? null,
            sortOrder: index + 1,
          })),
        },
        steps: {
          create: steps.map((step, index) => ({
            stepNumber: step.step || index + 1,
            instruction: step.instruction,
          })),
        },
      },
    });

    // --- 画像生成処理 (Nano BananaPro / Gemini 2.5) ---
    let generatedImageUrl: string | null = null;
    try {
      // ユーザー指定のモデル名
      const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

      // 画像生成プロンプト
      const imagePrompt = `
      Create a high-quality visualization for a recipe titled "${recipeTitle}".
      The image MUST include two distinct elements combined into one composition:
      1. A delicious, professional-looking "Completed Image" of the final dish.
      2. A visual representation of the "Cooking Steps" (e.g., ingredients being prepared or a key cooking moment).
      
      Style: Photorealistic, appetizing, bright lighting, high resolution.
      `;

      // 画像生成実行
      // 注: 標準的なGeminiの画像生成は通常、generateContentで呼び出します。
      // レスポンスに画像データが含まれることを期待します。
      const imageResult = await imageModel.generateContent(imagePrompt);
      const imageResponse = await imageResult.response;
      
      // レスポンスから画像データを抽出
      // (SDKの仕様に基づき、inlineDataまたはtextに含まれるbase64を探す)
      // 注意: 現在のSDKバージョンで画像生成がどう返されるか、モデルの実装依存ですが
      // マニュアル実装として、parts配列からinlineDataを探すか、テキスト内のdata URLを探します。
      
      // ケース1: inlineDataとして返される場合 (Imagen on Vertex AIなど)
      // ケース2: Base64文字列としてテキストで返される場合
      
      // まずはpartsを確認
      let base64Data: string | null = null;
      if (imageResponse.candidates && imageResponse.candidates[0].content.parts) {
         for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
               base64Data = part.inlineData.data;
               break;
            }
         }
      }

      // partsになければ、テキストとして返ってきている可能性（JSON内など）を考慮
      // もしくは、画像生成モデルが標準的なgenerateContentではなく、別のメソッドを要求する可能性もありますが、
      // ここではSDK標準を用います。
      
      if (base64Data) {
        // 保存
        const savedPath = await saveBase64Image(base64Data);
        generatedImageUrl = savedPath;
      } else {
        console.warn('Image generation response did not contain inlineData.');
      }

    } catch (imgError) {
      console.error('Image generation failed:', imgError);
      // 画像生成失敗しても、レシピ生成自体は成功とする（画像なしで進む）
    }

    // レシピに画像を更新 (あれば)
    if (generatedImageUrl) {
        await prisma.recipe.update({
            where: { id: recipe.id },
            data: { imageUrl: generatedImageUrl }
        });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'recipe',
        title,
        body,
        recipeId: recipe.id,
        imageUrl: generatedImageUrl, // 通知にも画像を設定
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notification.id,
        recipeId: recipe.id,
        title: recipeTitle,
        canMakeWithInventory,
        missingIngredients: finalMissing,
        ingredients: ingredientObjects,
        steps,
        cookingTime: parsed.cookingTime ?? undefined,
        servings: parsed.servings ?? undefined,
      },
    });
  } catch (error) {
    console.error('Recipe generate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピ生成中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 },
    );
  }
}
