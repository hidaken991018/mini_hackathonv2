import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const USER_ID = 'mock-user-001';

async function main() {
  console.log('--- Verification Start ---');

  // 1. Ensure User exists
  const user = await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      name: 'Test User',
    },
  });
  console.log('User synced:', user.id);

  // 2. Clear old inventories for clean test (optional, but good for reliable generation)
  // await prisma.inventory.deleteMany({ where: { userId: USER_ID } });

  // 3. Add Ingredients
  const ingredients = [
    { name: 'トマト', quantityValue: 2, quantityUnit: '個' },
    { name: '卵', quantityValue: 4, quantityUnit: '個' },
    { name: 'ベーコン', quantityValue: 50, quantityUnit: 'g' },
  ];

  for (const ing of ingredients) {
    await prisma.inventory.create({
      data: {
        userId: USER_ID,
        ...ing,
      },
    });
  }
  console.log('Inventory added:', ingredients.map(i => i.name).join(', '));

  // 4. Call API（手動AIレシピ生成は通知を作成せず、レシピのみ作成）
  console.log('Calling Recipe Notify API...');
  try {
    const res = await axios.post('http://localhost:3000/api/recipe/notify', {
      userId: USER_ID,
    });

    console.log('API Response Status:', res.status);
    if (res.data.success) {
      const data = res.data.data;
      console.log('Recipe ID:', data.recipeId);
      console.log('Recipe Title:', data.title);

      // Check DB for recipe image
      const recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
      });
      console.log('Recipe in DB Infographic URL:', recipe?.imageUrl);

      if (recipe?.imageUrl) {
        const localPath = path.join(process.cwd(), 'public', recipe.imageUrl);
        const exists = fs.existsSync(localPath);
        console.log(`Infographic File Exists at ${localPath}?`, exists);
      } else {
        console.warn('WARNING: No Infographic URL generated.');
      }
    } else {
      console.error('API Failed:', res.data);
    }
  } catch (error) {
    console.error('API Call Error:', error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
