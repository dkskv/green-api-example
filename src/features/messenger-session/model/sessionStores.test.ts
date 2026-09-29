// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ContactStore, CredentialsStore } from "./sessionStores";

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

it("restores saved credentials and contact without trusting the previous verification", () => {
  const contacts = new ContactStore();
  const session = new CredentialsStore(contacts);

  session.save(credentials);
  contacts.save(contact);

  const restoredContacts = new ContactStore();
  const restoredSession = new CredentialsStore(restoredContacts);

  restoredSession.restore();
  restoredContacts.restore();
  expect(restoredContacts.state.getState().contact).toEqual(contact);

  expect(restoredSession.state.getState()).toEqual({
    credentials,
    verified: false,
    sessionErrorMessage: "",
  });
});

it.each([
  "{invalid",
  "null",
  '"string"',
  '{"phone":12345678,"chatId":"chat"}',
  '{"phone":"+12345678","chatId":"chat"}',
  '{"phone":"123","chatId":"chat"}',
  '{"phone":"12345678","chatId":""}',
])("rejects invalid persisted contact: %s", (saved) => {
  const contacts = new ContactStore();

  contacts.save(contact);
  localStorage.setItem("green-api-active-chat", saved);
  contacts.restore();
  expect(contacts.state.getState().contact).toBeNull();
});

it.each([
  "{invalid",
  "null",
  "{}",
  JSON.stringify({ ...credentials, apiUrl: "http://example.com" }),
])("rejects invalid persisted credentials: %s", (saved) => {
  const session = new CredentialsStore(new ContactStore());

  session.save(credentials);
  localStorage.setItem("green-api-credentials", saved);
  session.restore();
  expect(session.state.getState().credentials).toBeNull();
  expect(session.state.getState().verified).toBe(false);
});

it("preserves the contact on token changes and clears it on account changes", () => {
  const contacts = new ContactStore();
  const session = new CredentialsStore(contacts);

  session.save(credentials);
  contacts.save(contact);
  session.save({ ...credentials, apiToken: "new-token" });
  expect(contacts.state.getState().contact).toEqual(contact);
  session.save({ ...credentials, instanceId: "other" });
  expect(contacts.state.getState().contact).toBeNull();
  contacts.restore();
  expect(contacts.state.getState().contact).toBeNull();
});

it("clears both stores on sign-out and ignores late verification", () => {
  const contacts = new ContactStore();
  const session = new CredentialsStore(contacts);

  session.save(credentials);
  contacts.save(contact);
  session.clear();
  session.setVerification(credentials);
  expect(session.state.getState().verified).toBe(false);
  session.restore();
  contacts.restore();
  expect(session.state.getState().credentials).toBeNull();
  expect(contacts.state.getState().contact).toBeNull();
});

it("handles unavailable browser storage during restore", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage unavailable");
  });

  const contacts = new ContactStore();
  const session = new CredentialsStore(contacts);

  expect(() => contacts.restore()).not.toThrow();
  expect(() => session.restore()).not.toThrow();
  expect(contacts.state.getState().contact).toBeNull();
  expect(session.state.getState().credentials).toBeNull();
});
