const DEFAULT_RETRIGGER_BEHAVIOR = 'restart';

export function normalizeRetriggerBehaviorOverride(value) {
    if (value == null || value === '' || value === 'default') return null;
    return String(value);
}

export function hasRetriggerBehaviorOverride(cue) {
    return normalizeRetriggerBehaviorOverride(cue?.retriggerBehavior) != null;
}

export function resolveEffectiveRetriggerBehavior(cue, appConfig = {}) {
    const override = normalizeRetriggerBehaviorOverride(cue?.retriggerBehavior);
    if (override) return override;

    // Legacy fields only apply when the cue predates per-cue retriggerBehavior storage.
    if (cue && !Object.prototype.hasOwnProperty.call(cue, 'retriggerBehavior')) {
        const legacy = cue.retriggerAction || cue.retriggerActionCompanion;
        const legacyOverride = normalizeRetriggerBehaviorOverride(legacy);
        if (legacyOverride) return legacyOverride;
    }

    return appConfig.defaultRetriggerBehavior || DEFAULT_RETRIGGER_BEHAVIOR;
}

export function retriggerOverrideToSelectValue(cue) {
    return hasRetriggerBehaviorOverride(cue) ? cue.retriggerBehavior : 'default';
}

export function retriggerSelectValueToOverride(selectValue) {
    return normalizeRetriggerBehaviorOverride(selectValue);
}
