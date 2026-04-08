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
