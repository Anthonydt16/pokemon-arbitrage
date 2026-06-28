import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GLOBAL_SEARCHES = [
  {
    name: 'ETB — Toutes collections',
    keywords: JSON.stringify(['etb', 'coffret dresseur élite', 'elite trainer box']),
    platforms: JSON.stringify(['vinted', 'leboncoin', 'ebay']),
    minPrice: 30,
    maxPrice: 200,
  },
  {
    name: 'Display — Toutes collections',
    keywords: JSON.stringify(['display', '36 boosters', 'boite boosters']),
    platforms: JSON.stringify(['vinted', 'leboncoin', 'ebay']),
    minPrice: 50,
    maxPrice: 500,
  },
  {
    name: 'Booster — Toutes collections',
    keywords: JSON.stringify(['booster pokemon scellé', 'booster neuf']),
    platforms: JSON.stringify(['vinted', 'leboncoin', 'ebay']),
    minPrice: 3,
    maxPrice: 50,
  },
  {
    name: 'Tripack — Toutes collections',
    keywords: JSON.stringify(['tripack pokemon', 'tri pack', '3 boosters']),
    platforms: JSON.stringify(['vinted', 'leboncoin', 'ebay']),
    minPrice: 8,
    maxPrice: 80,
  },
]

async function main() {
  console.log('🌱 Seeding global searches...')

  for (const data of GLOBAL_SEARCHES) {
    const existing = await prisma.search.findFirst({
      where: { name: data.name, isGlobal: true },
    })

    if (existing) {
      console.log(`  ⏭  Already exists: ${data.name}`)
      continue
    }

    const created = await prisma.search.create({
      data: {
        ...data,
        isGlobal: true,
        active: true,
        userId: null,
      },
    })
    console.log(`  ✅ Created: ${created.name} (id: ${created.id})`)
  }

  console.log('🌱 Seed complete.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
