import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { betaTypeToPlan } from "@/lib/beta-utils"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, betaCode, role } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Optional: Validate beta code early if provided
    let validBetaCode: any = null;
    if (betaCode) {
      validBetaCode = await prisma.betaCode.findUnique({
        where: { code: betaCode.toUpperCase() }
      });
      if (!validBetaCode || !validBetaCode.isActive || validBetaCode.current_uses >= validBetaCode.max_uses) {
        return NextResponse.json({ error: "Invalid or expired beta code." }, { status: 400 });
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user and link beta code if valid
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name,
          email,
          password_hash: hashedPassword,
          role: (role === "ADMIN" ? "ADMIN" : "USER") as any,
        }
      });

      if (validBetaCode) {
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        // Derive plan from beta code type (e.g. "manifester_2_months" → manifester)
        const betaPlan = betaTypeToPlan(validBetaCode.type);

        await tx.user.update({
          where: { id: newUser.id },
          data: { plan: betaPlan }
        });

        await tx.userBetaCode.create({
          data: {
            userId: newUser.id,
            codeId: validBetaCode.id,
            expiresAt: twoMonthsFromNow
          }
        });

        await tx.betaCode.update({
          where: { id: validBetaCode.id },
          data: { current_uses: { increment: 1 } }
        });
      }

      return newUser;
    });

    // Return user without password
    const { password_hash: _, ...userWithoutPassword } = user as any;

    return NextResponse.json({
      message: "User created successfully",
      user: userWithoutPassword
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
