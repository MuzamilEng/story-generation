/**
 * Seed the BETA_MANIFEST beta code into the database.
 *
 * Run with:  npx tsx scripts/seed-beta-manifest.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const code = "BETA_MANIFEST";

    const existing = await prisma.betaCode.findUnique({
        where: { code },
    });

    if (existing) {
        console.log(`Beta code "${code}" already exists (id: ${existing.id}, type: ${existing.type}). Updating type to manifester_2_months...`);
        await prisma.betaCode.update({
            where: { code },
            data: { type: "manifester_2_months", isActive: true },
        });
        console.log("Updated successfully.");
    } else {
        const created = await prisma.betaCode.create({
            data: {
                code,
                type: "manifester_2_months",
                max_uses: 10000,
                current_uses: 0,
                isActive: true,
            },
        });
        console.log(`Created beta code "${code}" (id: ${created.id})`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
