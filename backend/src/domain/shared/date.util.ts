/** Fecha de "hoy" en formato `YYYY-MM-DD` (mismo criterio que Book/Reward). */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
