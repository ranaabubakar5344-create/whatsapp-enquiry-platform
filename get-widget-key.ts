import { prisma } from "./lib/prisma";

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      name: true,
      widgetKey: true,
    },
  });

  console.table(companies);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
