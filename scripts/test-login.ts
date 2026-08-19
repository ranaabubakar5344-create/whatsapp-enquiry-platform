import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: npx tsx --env-file=.env.local scripts/test-login.ts "email" "password"');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user) {
    console.log("USER NOT FOUND");
    return;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  console.log("Email:", user.email);
  console.log("Role:", user.role);
  console.log("User Active:", user.isActive);
  console.log("Company Active:", user.company?.isActive ?? "No company");
  console.log("PASSWORD MATCH:", passwordMatches);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
