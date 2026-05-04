import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { betaTypeToPlan } from "@/lib/beta-utils"
import { appLog } from "@/lib/app-logger"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, betaCode } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Beta code is REQUIRED for signup during pre-launch
    if (!betaCode) {
      return NextResponse.json(
        { error: "A beta access code is required to create an account." },
        { status: 400 }
      )
    }

    // Validate beta code — check BetaSignup table first, then legacy BetaCode table
    const upperCode = betaCode.toUpperCase().trim();
    let validBetaCode: any = null;
    let betaSignup: any = null;

    // Check BetaSignup access codes (MFST-XXXX-XXXX)
    betaSignup = await prisma.betaSignup.findUnique({
      where: { access_code: upperCode }
    });

    if (betaSignup) {
      if (betaSignup.user_id) {
        return NextResponse.json({ error: "This beta code has already been used." }, { status: 400 });
      }
    } else {
      // Fall back to legacy BetaCode table
      validBetaCode = await prisma.betaCode.findUnique({
        where: { code: upperCode }
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

    // Create user and link beta code
    const user = await prisma.$transaction(async (tx) => {
      const twoMonthsFromNow = new Date();
      twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

      if (betaSignup) {
        // BetaSignup code path — grant manifester plan (beta, not paid)
        // Find the matching BetaCode record created during beta signup
        const matchingBetaCode = await tx.betaCode.findUnique({
          where: { code: upperCode },
        });

        const newUser = await tx.user.create({
          data: {
            name: name,
            email,
            password_hash: hashedPassword,
            role: "USER" as any,
            is_beta: true,
            beta_source: "signup",
            plan: "manifester",
          }
        });

        await tx.betaSignup.update({
          where: { id: betaSignup.id },
          data: {
            user_id: newUser.id,
            status: "activated",
            activated_at: new Date(),
          }
        });

        // Link user to BetaCode so dashboard/subscription pages detect beta status
        if (matchingBetaCode) {
          await tx.userBetaCode.create({
            data: {
              userId: newUser.id,
              codeId: matchingBetaCode.id,
              expiresAt: twoMonthsFromNow,
            }
          });

          await tx.betaCode.update({
            where: { id: matchingBetaCode.id },
            data: { current_uses: { increment: 1 } },
          });
        }

        return newUser;
      } else {
        // Legacy BetaCode path
        const betaPlan = betaTypeToPlan(validBetaCode.type);

        const newUser = await tx.user.create({
          data: {
            name: name,
            email,
            password_hash: hashedPassword,
            role: "USER" as any,
            is_beta: true,
            beta_source: upperCode,
            plan: betaPlan,
          }
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

        return newUser;
      }
    });

    // Return user without password
    const { password_hash: _, ...userWithoutPassword } = user as any;

    appLog({ level: "info", source: "auth/signup", message: `New user signed up: ${email}`, userId: user.id, meta: { plan: user.plan } });

    return NextResponse.json({
      message: "User created successfully",
      user: userWithoutPassword
    })
  } catch (error) {
    console.error("Signup error:", error)
    appLog({ level: "error", source: "auth/signup", message: `Signup failed: ${(error as Error).message}` });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
