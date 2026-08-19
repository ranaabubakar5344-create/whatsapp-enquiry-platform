import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log("Email aur password required hain.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log("USER NOT FOUND:", email);
    process.exit(1);
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: newHash,
    },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!updatedUser) {
    console.log("User disappeared after update.");
    process.exit(1);
  }

  const verified = await bcrypt.compare(
    newPassword,
    updatedUser.passwordHash
  );

  console.log("");
  console.log("PASSWORD UPDATED ?");
  console.log("Email:", updatedUser.email);
  console.log("Role:", updatedUser.role);
  console.log("Active:", updatedUser.isActive);
  console.log("NEW PASSWORD MATCH:", verified);
}

main()
  .catch((error) => {
    console.error("ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
