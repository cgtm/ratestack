function capHaptics() {
  return window.Capacitor?.Plugins?.Haptics;
}

function vibrateMs(ms) {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(ms);
  }
}

/**
 * Short vibration pulses.
 * Uses Capacitor Haptics plugin when available (native iOS/Android via RateGaze),
 * falls back to Vibration API (Android PWA / Chrome).
 * iOS Safari PWA: no-op on both paths.
 */
export function haptic(ms = 12) {
  const h = capHaptics();
  if (h) {
    h.impact({ style: "LIGHT" });
  } else {
    vibrateMs(ms);
  }
}

export function hapticSuccess() {
  const h = capHaptics();
  if (h) {
    h.notification({ type: "SUCCESS" });
  } else {
    vibrateMs(15);
  }
}

export function hapticCommit() {
  const h = capHaptics();
  if (h) {
    h.impact({ style: "MEDIUM" });
  } else {
    vibrateMs(20);
  }
}
