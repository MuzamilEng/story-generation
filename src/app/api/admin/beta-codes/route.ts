import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const codes = await prisma.betaCode.findMany({
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(codes);
    } catch (error) {
        console.error("[BETA_CODES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code, maxUses } = await req.json();

        if (!code || !maxUses) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Default beta code type gives them 2 months free of amplifier
        // We compute expires_at dynamically when they redeem it.
        const newCode = await prisma.betaCode.create({
            data: {
                code,
                max_uses: maxUses,
                type: "amplifier_2_months",
            },
        });

        return NextResponse.json(newCode);
    } catch (error: any) {
        console.error("[BETA_CODES_POST]", error);
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Code already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
