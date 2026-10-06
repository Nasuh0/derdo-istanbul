import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const username = process.argv[2]?.trim().toLowerCase();
  if (!username) {
    throw new Error("Usage: pnpm admin:promote -- <username>");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true }
    });

    if (!user) {
      throw new Error(`User "${username}" was not found`);
    }

    if (user.role === "ADMIN") {
      console.log(`${user.username} is already an ADMIN`);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: user.id },
        data: {
          role: "ADMIN",
          tokenVersion: { increment: 1 },
          refreshTokenHash: null
        },
        select: { id: true, username: true, role: true }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ADMIN_PROMOTED_CLI",
          targetType: "USER",
          targetId: user.id,
          metadata: { username: user.username }
        }
      });

      return next;
    });

    console.log(`Promoted ${updated.username} to ${updated.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
