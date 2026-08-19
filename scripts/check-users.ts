import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
      isActive: true,
      company: {
        select: {
          name: true,
          isActive: true,
        },
      },
    },
  });

  console.log(users);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
