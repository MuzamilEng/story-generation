import { Plan } from "@prisma/client";

/**
 * Maps a BetaCode.type string to a Plan enum value.
 * Convention: type is "{plan}_{duration}" e.g. "manifester_2_months", "amplifier_2_months"
 * Falls back to "amplifier" for unrecognised types (backwards-compatible).
 */
export function betaTypeToPlan(type: string): Plan {
    const normalised = type.toLowerCase();

    if (normalised.startsWith("manifester")) return "manifester";
    if (normalised.startsWith("activator")) return "activator";
    if (normalised.startsWith("amplifier")) return "amplifier";

    // Legacy/default: treat unknown types as amplifier (existing behaviour)
    return "amplifier";
}

export function betaTypeToDurationMonths(type: string): number {
    const normalised = type.toLowerCase();
    const match = normalised.match(/_(\d+)_months?/);

    if (!match) {
        return 2;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}
