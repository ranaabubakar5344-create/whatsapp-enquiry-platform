import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: npx tsx --env-file=.env.local scripts/reset-admin-password.ts "email" "password"');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log("ERROR: User not found:", email);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log("PASSWORD CHANGED SUCCESSFULLY");
  console.log("Email:", user.email);
  console.log("Name:", user.name);
  console.log("Role:", user.role);
  console.log("Active:", user.isActive);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
