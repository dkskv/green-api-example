import { useTranslation } from "./index";
import type { DisplayText } from "./text";

export function useDisplayText() {
  const { t } = useTranslation(["ui", "errors", "messages"]);

  function translate(value: DisplayText): string {
    if (typeof value === "string") return value;

    const params = Object.fromEntries(
      Object.entries(value.params ?? {}).map(([key, param]) => [
        key,
        typeof param === "number" ? param : translate(param),
      ]),
    );

    return t(value.key, params);
  }

  return translate;
}
