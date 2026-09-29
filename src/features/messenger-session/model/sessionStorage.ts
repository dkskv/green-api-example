import { createJSONStorage } from "zustand/middleware";

/** Читает и прежний формат (сам объект), и стандартную оболочку persist. */
export function createSessionStorage<T>(field: keyof T) {
  return createJSONStorage<T>(() => localStorage, {
    reviver: (key, value: unknown) => {
      if (key !== "") return value;

      if (value && typeof value === "object" && "state" in value) return value;

      return { state: { [field]: value }, version: 0 };
    },
  });
}
