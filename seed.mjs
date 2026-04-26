import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  await prisma.search.createMany({
    data: [
      {
        name: 'Dracaufeu & Charizard',
        keywords: JSON.stringify(['dracaufeu', 'charizard']),
        platforms: JSON.stringify(['leboncoin', 'vinted']),
        maxPrice: 150,
        active: true,
      },
      {
        name: 'Lots Pokémon vintage',
        keywords: JSON.stringify(['lot pokemon', 'collection pokemon', 'vieux pokemon']),
        platforms: JSON.stringify(['leboncoin', 'vinted']),
        maxPrice: 100,
        active: true,
      },
      {
        name: 'Neo Destiny / Neo Genesis',
        keywords: JSON.stringify(['neo destiny', 'neo genesis', 'neo revelation']),
        platforms: JSON.stringify(['leboncoin', 'vinted']),
        maxPrice: 200,
        active: true,
      },
    ],

  })

  console.log('✅ 3 recherches créées !')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
