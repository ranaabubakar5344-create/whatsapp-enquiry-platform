import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from the .env file.");
}

const requiredVariables = [
  "SEED_COMPANY_NAME",
  "SEED_COMPANY_SLUG",
  "SEED_ADMIN_NAME",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
] as const;

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`${variable} is missing from the .env file.`);
  }
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const companyName = process.env.SEED_COMPANY_NAME!;
  const companySlug = process.env.SEED_COMPANY_SLUG!;
  const adminName = process.env.SEED_ADMIN_NAME!;
  const adminEmail = process.env.SEED_ADMIN_EMAIL!.toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!;

  if (adminPassword.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must contain at least 10 characters.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const company = await prisma.company.upsert({
    where: {
      slug: companySlug,
    },
    update: {
      name: companyName,
      isActive: true,
    },
    create: {
      name: companyName,
      slug: companySlug,
      primaryColor: "#25D366",
      timezone: "Asia/Dubai",
      botEnabled: true,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      name: adminName,
      passwordHash,
      companyId: company.id,
      role: UserRole.COMPANY_ADMIN,
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      companyId: company.id,
      role: UserRole.COMPANY_ADMIN,
      isActive: true,
    },
  });

  console.log("Seed completed successfully.");
  console.log(`Company: ${company.name}`);
  console.log(`Admin: ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });