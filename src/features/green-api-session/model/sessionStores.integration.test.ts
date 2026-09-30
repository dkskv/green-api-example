// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ActiveContactStore } from "./contactStore";
import { CredentialsStore } from "./credentialsStore";

const credentials = {
  apiUrl: "https://example.com",
  instanceId: "instance",
  apiToken: "token",
};
const contact = { phone: "12345678", chatId: "chat" };

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

it("восстанавливает реквизиты и контакт без восстановления прежней проверки", () => {
  const contacts = new ActiveContactStore();
  const session = new CredentialsStore();

  session.save(credentials);
  contacts.save(contact);

  const restoredContacts = new ActiveContactStore();
  const restoredSession = new CredentialsStore();

  expect(restoredContacts.state.getState().contact).toEqual(contact);

  expect(restoredSession.state.getState()).toEqual({
    credentials,
    verification: null,
  });
});

it("обрабатывает недоступность хранилища браузера при восстановлении", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage unavailable");
  });

  const contacts = new ActiveContactStore();
  const session = new CredentialsStore();

  expect(() => contacts.state.persist.rehydrate()).not.toThrow();
  expect(() => session.state.persist.rehydrate()).not.toThrow();
  expect(contacts.state.getState().contact).toBeNull();
  expect(session.state.getState().credentials).toBeNull();
});
