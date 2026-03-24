/**
 * Short vibration pulses where `navigator.vibrate` exists (mostly Android PWA / Chrome).
 * iOS Safari does not expose Vibration API — calls are no-ops there.
 */
export function haptic(ms = 12) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  }
}

export function hapticSuccess() {
  haptic(15);
}

export function hapticCommit() {
  haptic(20);
}
