import type { DisplayText } from "./text";
import { useDisplayText } from "./useDisplayText";

/** Also stays reactive when Ant Design stores a validation message. */
export function TranslatedText({ value }: { value: DisplayText }) {
  const translate = useDisplayText();

  return translate(value);
}
