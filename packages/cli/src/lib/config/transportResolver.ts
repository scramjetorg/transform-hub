import { ApiCommandError } from "../apiCommandError";
import { profileManager } from "./index";
import { validateVerser2Profile } from "./verser2Profile";

export type TransportMode = "native" | "legacy-http";
export type ResolvedTransport = { mode: TransportMode; profile?: any; provenance: "configured" | "manual-v0" | "compatibility" };
export const NATIVE_TIMEOUT_MS = 1500;
export const MAX_NATIVE_TIMEOUT_MS = 5000;

export function effectiveNativeProfile(profile: any): any {
    const timeoutMs = Number(profile.timeoutMs);
    return { ...profile, timeoutMs: Number.isFinite(timeoutMs) ? Math.min(timeoutMs, MAX_NATIVE_TIMEOUT_MS) : NATIVE_TIMEOUT_MS };
}

/** The sole selection gate used by raw API, named capabilities, and HTTP clients. */
export function resolveSelectedTransport(input: any = profileManager.getProfileConfig()): ResolvedTransport {
    const stored = (input as any).configuration || input.get();
    const profile = input.get();
    if (stored.verser2Draft && !stored.verser2) throw new ApiCommandError("PROFILE", 61, "Selected native profile has an incomplete Verser2 draft");
    if (stored.transportMode === "native") {
        if (!profile.verser2 || !validateVerser2Profile(profile.verser2)) throw new ApiCommandError("PROFILE", 61, "Selected native profile has no complete Verser2 connection");
        return { mode: "native", profile: effectiveNativeProfile(profile.verser2), provenance: "configured" };
    }
    if (profile.verser2) {
        if (!validateVerser2Profile(profile.verser2)) throw new ApiCommandError("PROFILE", 61, "Selected Verser2 profile is incomplete or malformed");
        return { mode: "native", profile: effectiveNativeProfile(profile.verser2), provenance: "manual-v0" };
    }
    return { mode: "legacy-http", provenance: "compatibility" };
}
