import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing.");
}

const globalForDatabase = globalThis as unknown as {
  pgPool: Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pgPool =
  globalForDatabase.pgPool ??
  new Pool({
    connectionString: databaseUrl,

    // Small pool is enough for current development and serverless use.
    max: process.env.NODE_ENV === "production" ? 5 : 3,

    // Allow Neon enough time to wake/connect.
    connectionTimeoutMillis: 30_000,

    // Close unused database connections.
    idleTimeoutMillis: 30_000,

    // Do not keep Node running only because of idle connections.
    allowExitOnIdle: true,
  });

const prisma =
  globalForDatabase.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pgPool),

    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

globalForDatabase.pgPool = pgPool;
globalForDatabase.prisma = prisma;

export { prisma };