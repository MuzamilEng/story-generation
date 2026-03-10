const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users);
  const accounts = await prisma.account.findMany();
  console.log("Accounts:", accounts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
