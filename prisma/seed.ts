import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // モックユーザーを作成
  const user = await prisma.user.upsert({
    where: { id: 'mock-user-001' },
    update: {},
    create: {
      id: 'mock-user-001',
      name: 'テストユーザー',
    },
  })

  console.log('Created mock user:', user)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
