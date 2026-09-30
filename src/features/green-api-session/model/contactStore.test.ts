// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ActiveContactStore } from "./contactStore";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

it.each([
  "{invalid",
  "null",
  '"string"',
  JSON.stringify({
    state: { contact: { phone: 12345678, chatId: "chat" } },
    version: 0,
  }),
  JSON.stringify({
    state: { contact: { phone: "+12345678", chatId: "chat" } },
    version: 0,
  }),
  JSON.stringify({
    state: { contact: { phone: "123", chatId: "chat" } },
    version: 0,
  }),
  JSON.stringify({
    state: { contact: { phone: "12345678", chatId: "" } },
    version: 0,
  }),
])("отклоняет некорректный сохранённый контакт: %s", (saved) => {
  localStorage.setItem("green-api-active-chat", saved);
  const restored = new ActiveContactStore();

  expect(restored.state.getState().contact).toBeNull();
});
