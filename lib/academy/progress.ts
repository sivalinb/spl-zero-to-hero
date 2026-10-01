export const PROGRESS_KEY = "spl-academy.progress.v1";
export type ProgressRecord = Record<
  string,
  { completedAt: string; quizScore: number }
>;
export function readProgress(): string {
  try {
    return localStorage.getItem(PROGRESS_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}
export function parseProgress(raw: string): ProgressRecord {
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || Array.isArray(p)) return {};
    return Object.fromEntries(
      Object.entries(p).filter(
        ([, v]) =>
          !!v &&
          typeof v === "object" &&
          typeof (v as { completedAt?: unknown }).completedAt === "string" &&
          (v as { quizScore?: unknown }).quizScore === 100,
      ),
    ) as ProgressRecord;
  } catch {
    return {};
  }
}
export function completeLesson(id: string): boolean {
  try {
    const p = parseProgress(readProgress());
    if (!p[id])
      p[id] = { completedAt: new Date().toISOString(), quizScore: 100 };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("academy-progress"));
    return true;
  } catch {
    return false;
  }
}
export function subscribeProgress(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("academy-progress", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("academy-progress", fn);
  };
}
