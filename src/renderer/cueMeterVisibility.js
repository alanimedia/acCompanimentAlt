/**
 * Global + per-cue visibility for cue card level meters.
 */

export function resolveShowCueMeter(cue, appConfig = {}) {
    if (!cue) return false;
    if (cue.showCueMeter === true) return true;
    if (cue.showCueMeter === false) return false;
    return appConfig.defaultShowCueMeter !== false;
}

export function shouldShowCueMeter(cue, appConfig = {}) {
    return resolveShowCueMeter(cue, appConfig);
}
