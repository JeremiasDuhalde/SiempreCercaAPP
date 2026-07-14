import { useCallback } from "react";

export function useAlertSound() {
  const playAlert = useCallback((priority: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = priority >= 3 ? 880 : 440;
      osc.type = priority >= 3 ? "sawtooth" : "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + (priority >= 3 ? 1.2 : 0.6),
      );
      osc.start();
      osc.stop(ctx.currentTime + (priority >= 3 ? 1.2 : 0.6));
    } catch {
      // AudioContext may be unavailable or blocked — silently ignore
    }
  }, []);

  return { playAlert };
}
