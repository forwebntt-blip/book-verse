import { PrismaPg } from "@prisma/adapter-pg";
import { getPgPool } from "./pg";

type PrismaClientModule = typeof import("../../generated/prisma/client.js");
type PrismaClientInstance = InstanceType<PrismaClientModule["PrismaClient"]>;

let prismaClient: PrismaClientInstance | null = null;

async function loadPrismaClientModule(): Promise<PrismaClientModule> {
  return import("../../generated/prisma/client.js");
}

export async function getPrismaClient(): Promise<PrismaClientInstance> {
  if (!prismaClient) {
    const { PrismaClient } = await loadPrismaClientModule();
    const adapter = new PrismaPg(getPgPool(), {
      schema: "public",
    });

    prismaClient = new PrismaClient({
      adapter,
    });
  }

  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
