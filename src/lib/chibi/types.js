"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHIBI_ACTIONS = void 0;
exports.isEligibleStudentId = isEligibleStudentId;
exports.emptyChibiProfile = emptyChibiProfile;
exports.CHIBI_ACTIONS = ['idle', 'walk', 'pickup', 'touch'];
function isEligibleStudentId(id) {
    return typeof id === 'number' && Number.isInteger(id) && id >= 10000 && id <= 99999;
}
function emptyChibiProfile(label) {
    if (label === void 0) { label = 'Static preview'; }
    return {
        label: label,
        initialPose: null, idleLabel: 'Static preview · no verified idle',
        interactions: Object.fromEntries(exports.CHIBI_ACTIONS.map(function (action) { return [action, {
                state: 'unresolved', reason: 'No verified source clip has been assigned.',
            }]; })),
    };
}
