import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    console.log("Connecting to Prisma...");
    const stories = await prisma.story.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    console.log("Recent stories in DB:");
    for (const s of stories) {
        console.log(`- ID: ${s.id}, Length: ${s.story_text_draft ? s.story_text_draft.length : 0}`);
        console.log(`  Goals: ${JSON.stringify(s.goal_intake_json)}`);
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
