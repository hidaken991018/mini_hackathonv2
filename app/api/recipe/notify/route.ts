import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Candidate = {
  recipe: {
    id: string
    title: string
    ingredients: { name: string }[]
  }
  matchedIngredientCount: number
  matchedInventoryNames: string[]
  closestDate: Date | null
  score: number
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const normalize = (value: string) => value.trim().toLowerCase()

const isMatch = (ingredient: string, inventory: string) => {
  const a = normalize(ingredient)
  const b = normalize(inventory)
  return a.includes(b) || b.includes(a)
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userId が必要です' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 }
      )
    }

    const inventories = await prisma.inventory.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        consumeBy: true,
        expireDate: true,
      },
    })

    if (inventories.length === 0) {
      return NextResponse.json(
        { success: false, error: '在庫がありません' },
        { status: 200 }
      )
    }

    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          select: {
            name: true,
          },
        },
      },
    })

    if (recipes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'レシピがありません' },
        { status: 200 }
      )
    }

    const candidates: Candidate[] = recipes.map((recipe) => {
      const matchedInventoryNames = new Set<string>()
      let matchedIngredientCount = 0
      let closestDate: Date | null = null

      for (const ingredient of recipe.ingredients) {
        let matched = false

        for (const inventory of inventories) {
          if (!isMatch(ingredient.name, inventory.name)) continue

          matched = true
          matchedInventoryNames.add(inventory.name)

          const candidateDate = inventory.consumeBy ?? inventory.expireDate
          if (candidateDate) {
            if (!closestDate || candidateDate < closestDate) {
              closestDate = candidateDate
            }
          }
        }

        if (matched) {
          matchedIngredientCount += 1
        }
      }

      const ingredientCount = recipe.ingredients.length || 1
      const score = matchedIngredientCount / ingredientCount

      return {
        recipe,
        matchedIngredientCount,
        matchedInventoryNames: Array.from(matchedInventoryNames),
        closestDate,
        score,
      }
    })

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.closestDate && b.closestDate) {
        return a.closestDate.getTime() - b.closestDate.getTime()
      }
      if (a.closestDate) return -1
      if (b.closestDate) return 1
      return 0
    })

    const topCandidates = candidates.slice(0, 5)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            recipeId: { type: SchemaType.STRING },
          },
          required: ['recipeId'],
        },
      },
    })

    const prompt = `次の候補から1つだけ選び、recipeIdを返してください。
選定基準:
- 在庫マッチ数が多いものを優先
- 期限が近い食材を含むものを優先

候補:
${topCandidates
  .map((candidate) => {
    const closestDate = candidate.closestDate
      ? candidate.closestDate.toISOString().slice(0, 10)
      : 'なし'
    return `- id: ${candidate.recipe.id}
  title: ${candidate.recipe.title}
  matchCount: ${candidate.matchedIngredientCount}
  totalIngredients: ${candidate.recipe.ingredients.length}
  matchedIngredients: ${candidate.matchedInventoryNames.join('・') || 'なし'}
  nearestDate: ${closestDate}`
  })
  .join('\n')}`

    let selected = topCandidates[0]

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      const parsed = JSON.parse(text)

      const picked = topCandidates.find(
        (candidate) => candidate.recipe.id === parsed.recipeId
      )

      if (picked) {
        selected = picked
      }
    } catch (error) {
      console.error('Gemini selection error:', error)
    }

    const matchText =
      selected.matchedInventoryNames.length > 0
        ? selected.matchedInventoryNames.join('・')
        : '在庫の食材'

    const title = `今日のおすすめレシピ: ${selected.recipe.title}`
    const body =
      selected.matchedInventoryNames.length > 0
        ? `在庫の「${matchText}」を使って「${selected.recipe.title}」を作りませんか？`
        : `お手持ちの食材を使って「${selected.recipe.title}」を作りませんか？`

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'recipe',
        title,
        body,
        recipeId: selected.recipe.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notification.id,
        recipeId: selected.recipe.id,
        title,
        body,
        matchedIngredients: selected.matchedInventoryNames,
      },
    })
  } catch (error) {
    console.error('Recipe notify error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'レシピ通知の作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    )
  }
}
