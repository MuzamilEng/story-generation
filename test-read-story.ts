import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const s = await prisma.story.findFirst({ orderBy: { createdAt: 'desc' } });
    console.log(s.story_text_draft);
}
run().finally(() => prisma.$disconnect());
