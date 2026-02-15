import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { saveBase64Image } from '@/lib/image-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeneratedIngredient = {
  name: string;
  quantityValue?: number | null;
  quantityUnit?: string | null;
};

type GeneratedStep = {
  step: number;
  instruction: string;
};

/** Input parameters for recipe generation. */
export type RecipeGenerationInput = {
  /** Internal DB user ID. */
  userId: string;
  /** Number of servings (1-10). Defaults to 2. */
  servings?: number;
  /** Ingredient names to exclude (allergies, preferences). */
  excludeIngredients?: string[];
  /** When true, skip notification creation (e.g. manual AI generation from recipes page). */
  skipNotification?: boolean;
};

/** Successful result returned by `generateRecipeForUser`. */
export type RecipeGenerationResult = {
  notificationId?: string;
  recipeId: string;
  title: string;
  canMakeWithInventory: boolean;
  missingIngredients: string[];
  ingredients: GeneratedIngredient[];
  steps: GeneratedStep[];
  cookingTime?: string;
  servings?: string;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown when the user has zero inventory items. */
export class NoInventoryError extends Error {
  constructor() {
    super('在庫がありません');
    this.name = 'NoInventoryError';
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Normalize a string for fuzzy matching (trim + lowercase). */
export const normalize = (value: string) => value.trim().toLowerCase();

/** Check if two food names match via substring inclusion in either direction. */
export const isMatch = (ingredient: string, inventory: string) => {
  const a = normalize(ingredient);
  const b = normalize(inventory);
  return a.includes(b) || b.includes(a);
};

/** Format a single inventory item as a human-readable line for the Gemini prompt. */
export const formatInventoryLine = (item: {
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

/** Parse JSON from Gemini text output, stripping optional markdown fences. */
export const parseJsonFromText = (text: string) => {
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

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

/**
 * Generate a recipe for a user based on their current inventory.
 *
 * Performs the full pipeline:
 * 1. Fetch & sort user inventory (expiry-first)
 * 2. Build prompt & call Gemini structured output
 * 3. Fuzzy-match ingredients to inventory
 * 4. Persist recipe + notification to DB
 * 5. Generate dish & infographic images (best-effort)
 *
 * @throws {NoInventoryError} when the user has no inventory items
 * @throws {Error} on Gemini / DB failures
 */
export async function generateRecipeForUser(
  input: RecipeGenerationInput,
): Promise<RecipeGenerationResult> {
  const { userId } = input;
  const servings = input.servings ?? 2;
  const excludeIngredients = input.excludeIngredients ?? [];

  // Safety guard
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEYが設定されていません');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // ------ 1. Fetch inventory ------
  const inventories = await prisma.inventory.findMany({
    where: { userId },
    select: {
      name: true,
      quantityValue: true,
      quantityUnit: true,
      expireDate: true,
      consumeBy: true,
    },
  });

  if (inventories.length === 0) {
    throw new NoInventoryError();
  }

  // Sort by nearest expiry (null last)
  const sortedInventories = [...inventories].sort((a, b) => {
    const dateA = a.consumeBy ?? a.expireDate;
    const dateB = b.consumeBy ?? b.expireDate;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  // Filter out excluded ingredients
  const filteredInventories =
    excludeIngredients.length > 0
      ? sortedInventories.filter(
          (item) =>
            !excludeIngredients.some(
              (exc) =>
                normalize(item.name).includes(normalize(exc)) ||
                normalize(exc).includes(normalize(item.name)),
            ),
        )
      : sortedInventories;

  const inventoryList = filteredInventories.map(formatInventoryLine).join('\n');

  // ------ 2. Call Gemini for structured recipe ------
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

  const excludeSection =
    excludeIngredients.length > 0
      ? `\n除外食材（アレルギー・苦手）: ${excludeIngredients.join('、')}\n- 上記の食材は絶対に使用しないこと`
      : '';

  const prompt = `あなたは家庭料理のレシピ提案AIです。
次の在庫リストを使って、${servings}人分のレシピを1つ作成してください。

重要ルール:
- 【必須】賞味期限・消費期限が近い食材（リスト上位）を優先的に使うこと
- 可能なら在庫のみで作る（canMakeWithInventory=true, missingIngredients=[]）
- 在庫だけでは難しい場合は canMakeWithInventory=false にして、足りない材料を missingIngredients に列挙
- ingredients はレシピで使う材料と分量を${servings}人分で記載
- steps は調理手順を簡潔に、5〜8ステップ程度
- servings には "${servings}人分" を設定すること${excludeSection}

在庫リスト（期限が近い順）:
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
      const errorMessage = 'レシピ生成中にエラーが発生しました';
      const err = new Error(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        (err as Error & { details?: string; rawResponse?: string }).details =
          'GeminiのJSON解析に失敗しました';
        (err as Error & { rawResponse?: string }).rawResponse = retryText.slice(
          0,
          800,
        );
      }
      throw err;
    }
  }

  // ------ 3. Parse & match ingredients ------
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

  // ------ 4. Persist recipe to DB ------
  const recipe = await prisma.recipe.create({
    data: {
      userId: userId!,
      sourceType: 'ai_generated',
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

  // ------ 5. Image generation (best-effort) ------
  let generatedDishUrl: string | null = null;
  let generatedInfographicUrl: string | null = null;

  try {
    const imageModel = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    // 1. Dish completion image (for notification card)
    console.log('Generating Dish Image...');
    const dishPrompt = `
      Create a delicious, professional-looking "Completed Image" of the final dish titled "${recipeTitle}".
      Focus on the food itself, photorealistic, appetizing, bright lighting, high resolution.
      One single scene.
      `;

    const dishResult = await imageModel.generateContent(dishPrompt);
    const dishResponse = await dishResult.response;
    let dishBase64: string | null = null;

    if (dishResponse.candidates && dishResponse.candidates[0].content.parts) {
      for (const part of dishResponse.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          dishBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (dishBase64) {
      generatedDishUrl = await saveBase64Image(dishBase64, 'dishes');
    }

    // 2. Recipe infographic (for modal)
    console.log('Generating Infographic Image...');
    const infographicPrompt = `
      Create an infographic image for the recipe "${recipeTitle}".
      The image should visually explain the cooking process and key steps.
      Includes illustrations of ingredients and cooking actions (e.g., cutting, frying).
      Can include text labels (Japanese if possible, otherwise English) and icons.
      Style: Clean, modern infographic, easy to understand, instructional.
      `;

    const infoResult = await imageModel.generateContent(infographicPrompt);
    const infoResponse = await infoResult.response;
    let infoBase64: string | null = null;

    if (infoResponse.candidates && infoResponse.candidates[0].content.parts) {
      for (const part of infoResponse.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          infoBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (infoBase64) {
      generatedInfographicUrl = await saveBase64Image(
        infoBase64,
        'infographics',
      );
    }
  } catch (imgError) {
    console.error('Image generation failed:', imgError);
    // Image generation failure should not break recipe creation
  }

  // Update recipe with infographic image if available
  if (generatedInfographicUrl) {
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { imageUrl: generatedInfographicUrl },
    });
  }

  // ------ 6. Create notification (skip for manual AI generation) ------
  let notificationId: string | undefined;
  if (!input.skipNotification) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'recipe',
        title,
        body,
        recipeId: recipe.id,
        imageUrl: generatedDishUrl, // Notification card shows dish image
      },
    });
    notificationId = notification.id;
  }

  return {
    notificationId,
    recipeId: recipe.id,
    title: recipeTitle,
    canMakeWithInventory,
    missingIngredients: finalMissing,
    ingredients: ingredientObjects,
    steps,
    cookingTime: parsed.cookingTime ?? undefined,
    servings: parsed.servings ?? undefined,
  };
}
