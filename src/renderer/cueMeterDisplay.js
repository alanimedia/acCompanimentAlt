/**
 * Shared dBFS cue meter display: scale, zone colors, peak-hold above 0 dBFS.
 */

export const CUE_METER_FLOOR_DBFS = -48;
export const CUE_METER_PEAK_HOLD_MS = 3000;

export function dbfsToMeterRatio(dbfs) {
    if (dbfs == null || !Number.isFinite(dbfs) || dbfs <= CUE_METER_FLOOR_DBFS) return 0;
    if (dbfs >= 0) return 1;
    return (dbfs - CUE_METER_FLOOR_DBFS) / (0 - CUE_METER_FLOOR_DBFS);
}

/** Green −∞…−18, yellow −18…−6, red −6…0 (height ratios from bottom). */
export function getCueMeterZoneStops() {
    return {
        greenTop: dbfsToMeterRatio(-18),
        yellowTop: dbfsToMeterRatio(-6)
    };
}

export function isMeterOverDbfs(dbfs) {
    return Number.isFinite(dbfs) && dbfs >= 0;
}

/** Returns true while peak-hold indicator should show (orange line at top). */
export function updateCueMeterPeakHold(holdUntilById, cueId, dbfs) {
    if (isMeterOverDbfs(dbfs)) {
        holdUntilById[cueId] = Date.now() + CUE_METER_PEAK_HOLD_MS;
    }
    const expiresAt = holdUntilById[cueId];
    return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function clearCueMeterPeakHold(holdUntilById, cueId) {
    delete holdUntilById[cueId];
}

export function formatCueMeterDbfsLabel(dbfs) {
    if (dbfs == null || !Number.isFinite(dbfs) || dbfs <= -100) return '−∞';
    return dbfs.toFixed(1);
}

export function buildCueMeterZonesGradient() {
    const { greenTop, yellowTop } = getCueMeterZoneStops();
    const g = greenTop * 100;
    const y = yellowTop * 100;
    return `linear-gradient(to top,
        #1faa59 0%,
        #1faa59 ${g}%,
        #d4a017 ${g}%,
        #d4a017 ${y}%,
        #d64545 ${y}%,
        #d64545 100%)`;
}

/** Map linear peak (0–1) to meter fill ratio on the −48…0 dBFS scale. */
export function peakToMeterRatio(peak) {
    const linear = Math.max(0, Math.min(1, Number(peak) || 0));
    if (linear <= 1e-6) return 0;
    return dbfsToMeterRatio(20 * Math.log10(linear));
}

export function buildOutputMeterZonesGradient() {
    const { greenTop, yellowTop } = getCueMeterZoneStops();
    const g = greenTop * 100;
    const y = yellowTop * 100;
    return `linear-gradient(to right,
        #1faa59 0%,
        #1faa59 ${g}%,
        #d4a017 ${g}%,
        #d4a017 ${y}%,
        #d64545 ${y}%,
        #d64545 100%)`;
}
