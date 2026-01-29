const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  const addDays = (base, days) =>
    new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

  const user = await prisma.user.upsert({
    where: { id: 'mock-user-001' },
    update: {},
    create: {
      id: 'mock-user-001',
      name: 'テストユーザー',
    },
  })

  console.log('Created mock user:', user)

  const inventories = [
    {
      id: 'inv-expiry-0',
      name: '期限テスト（賞味期限:当日）',
      quantityValue: 1,
      quantityUnit: '個',
      expireDate: addDays(now, 0),
    },
    {
      id: 'inv-expiry-3',
      name: '期限テスト（賞味期限:3日前）',
      quantityValue: 1,
      quantityUnit: '個',
      expireDate: addDays(now, 3),
    },
    {
      id: 'inv-expiry-7',
      name: '期限テスト（賞味期限:7日前）',
      quantityValue: 1,
      quantityUnit: '個',
      expireDate: addDays(now, 7),
    },
    {
      id: 'inv-useby-0',
      name: '期限テスト（消費期限:当日）',
      quantityValue: 1,
      quantityUnit: '個',
      consumeBy: addDays(now, 0),
    },
    {
      id: 'inv-useby-1',
      name: '期限テスト（消費期限:前日）',
      quantityValue: 1,
      quantityUnit: '個',
      consumeBy: addDays(now, 1),
    },
    {
      id: 'inv-useby-3',
      name: '期限テスト（消費期限:3日前）',
      quantityValue: 1,
      quantityUnit: '個',
      consumeBy: addDays(now, 3),
    },
    {
      id: 'inv-tomato-001',
      name: 'トマト',
      quantityValue: 2,
      quantityUnit: '個',
      consumeBy: addDays(now, 2),
    },
    {
      id: 'inv-egg-001',
      name: '卵',
      quantityValue: 6,
      quantityUnit: '個',
      consumeBy: addDays(now, 5),
    },
    {
      id: 'inv-chicken-001',
      name: '鶏むね肉',
      quantityValue: 1,
      quantityUnit: '枚',
      consumeBy: addDays(now, 3),
    },
    {
      id: 'inv-onion-001',
      name: '玉ねぎ',
      quantityValue: 1,
      quantityUnit: '個',
      consumeBy: addDays(now, 7),
    },
    {
      id: 'inv-carrot-001',
      name: 'にんじん',
      quantityValue: 1,
      quantityUnit: '本',
      consumeBy: addDays(now, 6),
    },
    {
      id: 'inv-potato-001',
      name: 'じゃがいも',
      quantityValue: 2,
      quantityUnit: '個',
      consumeBy: addDays(now, 8),
    },
    {
      id: 'inv-miso-001',
      name: '味噌',
      quantityValue: 300,
      quantityUnit: 'g',
      consumeBy: addDays(now, 30),
    },
  ]

  for (const inv of inventories) {
    await prisma.inventory.upsert({
      where: { id: inv.id },
      update: {
        name: inv.name,
        quantityValue: inv.quantityValue,
        quantityUnit: inv.quantityUnit,
        expireDate: inv.expireDate,
        consumeBy: inv.consumeBy,
      },
      create: {
        id: inv.id,
        userId: user.id,
        name: inv.name,
        quantityValue: inv.quantityValue,
        quantityUnit: inv.quantityUnit,
        expireDate: inv.expireDate,
        consumeBy: inv.consumeBy,
      },
    })
  }

  console.log('Seeded inventories:', inventories.length)

  const recipes = [
    {
      id: 'recipe-tomato-egg-001',
      title: 'トマトと卵の炒め',
      cookingTime: '10分',
      servings: '2人分',
      ingredients: [
        {
          name: 'トマト',
          quantityValue: 2,
          quantityUnit: '個',
          sortOrder: 1,
          inventoryId: 'inv-tomato-001',
        },
        {
          name: '卵',
          quantityValue: 2,
          quantityUnit: '個',
          sortOrder: 2,
          inventoryId: 'inv-egg-001',
        },
        {
          name: '砂糖',
          quantityValue: 1,
          quantityUnit: '小さじ',
          sortOrder: 3,
        },
        {
          name: '塩',
          quantityValue: 1,
          quantityUnit: 'ひとつまみ',
          sortOrder: 4,
        },
      ],
      steps: [
        'トマトは一口大に切る。卵を溶いて軽く塩をする。',
        'フライパンで卵をふんわり炒めて一度取り出す。',
        '同じフライパンでトマトを炒め、砂糖と塩で調味する。',
        '卵を戻してさっと混ぜて完成。',
      ],
    },
    {
      id: 'recipe-chicken-001',
      title: '鶏むねのさっぱり煮',
      cookingTime: '20分',
      servings: '2人分',
      ingredients: [
        {
          name: '鶏むね肉',
          quantityValue: 1,
          quantityUnit: '枚',
          sortOrder: 1,
          inventoryId: 'inv-chicken-001',
        },
        {
          name: '玉ねぎ',
          quantityValue: 1,
          quantityUnit: '個',
          sortOrder: 2,
          inventoryId: 'inv-onion-001',
        },
        {
          name: 'しょうゆ',
          quantityValue: 2,
          quantityUnit: '大さじ',
          sortOrder: 3,
        },
        {
          name: 'みりん',
          quantityValue: 2,
          quantityUnit: '大さじ',
          sortOrder: 4,
        },
        {
          name: 'おろし生姜',
          quantityValue: 1,
          quantityUnit: '小さじ',
          sortOrder: 5,
        },
      ],
      steps: [
        '鶏むね肉はそぎ切り、玉ねぎは薄切りにする。',
        '鍋に調味料と玉ねぎを入れて火にかける。',
        '沸いたら鶏むね肉を入れて弱火で10分ほど煮る。',
        '火を止めて味をなじませて完成。',
      ],
    },
    {
      id: 'recipe-miso-soup-001',
      title: '野菜たっぷり味噌汁',
      cookingTime: '15分',
      servings: '2人分',
      ingredients: [
        {
          name: 'じゃがいも',
          quantityValue: 1,
          quantityUnit: '個',
          sortOrder: 1,
          inventoryId: 'inv-potato-001',
        },
        {
          name: 'にんじん',
          quantityValue: 1,
          quantityUnit: '1/2本',
          sortOrder: 2,
          inventoryId: 'inv-carrot-001',
        },
        {
          name: '玉ねぎ',
          quantityValue: 1,
          quantityUnit: '1/2個',
          sortOrder: 3,
          inventoryId: 'inv-onion-001',
        },
        {
          name: '味噌',
          quantityValue: 2,
          quantityUnit: '大さじ',
          sortOrder: 4,
          inventoryId: 'inv-miso-001',
        },
        {
          name: 'だし',
          quantityValue: 400,
          quantityUnit: 'ml',
          sortOrder: 5,
        },
      ],
      steps: [
        '野菜を食べやすい大きさに切る。',
        '鍋にだしと野菜を入れ、火が通るまで煮る。',
        '火を止めて味噌を溶き入れる。',
        'ひと煮立ちさせずに温めて完成。',
      ],
    },
  ]

  for (const recipe of recipes) {
    await prisma.recipe.upsert({
      where: { id: recipe.id },
      update: {
        title: recipe.title,
        cookingTime: recipe.cookingTime,
        servings: recipe.servings,
      },
      create: {
        id: recipe.id,
        title: recipe.title,
        cookingTime: recipe.cookingTime,
        servings: recipe.servings,
        ingredients: {
          create: recipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantityValue: ingredient.quantityValue,
            quantityUnit: ingredient.quantityUnit,
            sortOrder: ingredient.sortOrder,
            inventoryId: ingredient.inventoryId,
          })),
        },
        steps: {
          create: recipe.steps.map((instruction, index) => ({
            stepNumber: index + 1,
            instruction,
          })),
        },
      },
    })
  }

  console.log('Seeded recipes:', recipes.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
