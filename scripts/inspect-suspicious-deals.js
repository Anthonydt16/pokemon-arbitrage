const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.deal.findMany({
    where: {
      search: {
        name: {
          in: [
            'Tripack Forces Temporelles',
            'Display Forces Temporelles',
            'Display Failles Paradoxales',
          ],
        },
      },
    },
    include: { search: { select: { name: true } } },
    orderBy: { foundAt: 'desc' },
    take: 80,
  });

  for (const d of rows) {
    console.log(`[${d.search.name}] ${d.price}€ | ${d.title}`);
  }

  console.log('Total rows:', rows.length);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
