const DEFAULT_RETRIGGER_BEHAVIOR = 'restart';

function normalizeRetriggerBehaviorOverride(value) {
    if (value == null || value === '' || value === 'default') return null;
    return String(value);
}

function hasRetriggerBehaviorOverride(cue) {
    return normalizeRetriggerBehaviorOverride(cue?.retriggerBehavior) != null;
}

function resolveEffectiveRetriggerBehavior(cue, appConfig = {}) {
    const override = normalizeRetriggerBehaviorOverride(cue?.retriggerBehavior);
    if (override) return override;

    if (cue && !Object.prototype.hasOwnProperty.call(cue, 'retriggerBehavior')) {
        const legacy = cue.retriggerAction || cue.retriggerActionCompanion;
        const legacyOverride = normalizeRetriggerBehaviorOverride(legacy);
        if (legacyOverride) return legacyOverride;
    }

    return appConfig.defaultRetriggerBehavior || DEFAULT_RETRIGGER_BEHAVIOR;
}

function retriggerOverrideToSelectValue(cue) {
    return hasRetriggerBehaviorOverride(cue) ? cue.retriggerBehavior : 'default';
}

function retriggerSelectValueToOverride(selectValue) {
    return normalizeRetriggerBehaviorOverride(selectValue);
}

function migrateCueRetriggerStorage(cue, defaultBehavior = DEFAULT_RETRIGGER_BEHAVIOR) {
    if (!cue) return cue;

    const next = { ...cue };
    const hadLegacy = cue.retriggerAction != null || cue.retriggerActionCompanion != null;
    const hadExplicitField = Object.prototype.hasOwnProperty.call(cue, 'retriggerBehavior');
    delete next.retriggerAction;
    delete next.retriggerActionCompanion;

    let override = hadExplicitField
        ? normalizeRetriggerBehaviorOverride(cue.retriggerBehavior)
        : null;

    if (override == null && hadLegacy) {
        override = normalizeRetriggerBehaviorOverride(cue.retriggerAction);
        if (override == null) {
            override = normalizeRetriggerBehaviorOverride(cue.retriggerActionCompanion);
        }
    }

    if (!hadExplicitField && hadLegacy) {
        // Legacy-only cues: only persist when different from the global default.
        next.retriggerBehavior = (override && override !== defaultBehavior) ? override : null;
    } else {
        // Explicit v1.6+ storage (including null): preserve user choice even when it matches global.
        next.retriggerBehavior = override;
    }

    return next;
}

module.exports = {
    DEFAULT_RETRIGGER_BEHAVIOR,
    normalizeRetriggerBehaviorOverride,
    hasRetriggerBehaviorOverride,
    resolveEffectiveRetriggerBehavior,
    retriggerOverrideToSelectValue,
    retriggerSelectValueToOverride,
    migrateCueRetriggerStorage
};
