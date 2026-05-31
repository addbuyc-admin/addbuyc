export function createSafeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, (n) => n.toString(16).padStart(8, "0")).join("-");
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
