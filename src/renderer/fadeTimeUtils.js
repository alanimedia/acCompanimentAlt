/**
 * Resolve fade-out duration for cue stops and retrigger fade_out_and_stop.
 * Priority: cue value (if > 0) → default cue fade out → stop-all fade out.
 */
export function resolveEffectiveFadeOutTime(cue, appConfig = {}, { stopReason = null } = {}) {
    if (stopReason === 'stop_all') {
        const stopAllFade = appConfig.defaultStopAllFadeOutTime;
        return stopAllFade !== undefined && stopAllFade !== null ? stopAllFade : 1500;
    }

    const cueFade = cue?.fadeOutTime;
    if (cueFade !== undefined && cueFade !== null && cueFade > 0) {
        return cueFade;
    }

    const defaultFade = appConfig.defaultFadeOutTime;
    if (defaultFade !== undefined && defaultFade !== null && defaultFade > 0) {
        return defaultFade;
    }

    const stopAllFade = appConfig.defaultStopAllFadeOutTime;
    if (stopAllFade !== undefined && stopAllFade !== null && stopAllFade > 0) {
        return stopAllFade;
    }

    return 0;
}
