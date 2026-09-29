// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ActiveContactStore } from "./contactStore";
import { CredentialsStore } from "./credentialsStore";
import { createSessionActions } from "./sessionActions";

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
  const contacts = new ActiveContactStore();
  const session = new CredentialsStore();

  session.save(credentials);
  contacts.save(contact);

  const restoredContacts = new ActiveContactStore();
  const restoredSession = new CredentialsStore();

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
  localStorage.setItem("green-api-active-chat", saved);
  const restored = new ActiveContactStore();

  expect(restored.state.getState().contact).toBeNull();
});

it.each([
  "{invalid",
  "null",
  "{}",
  JSON.stringify({ ...credentials, apiUrl: "http://example.com" }),
])("rejects invalid persisted credentials: %s", (saved) => {
  localStorage.setItem("green-api-credentials", saved);
  const session = new CredentialsStore();

  expect(session.state.getState().credentials).toBeNull();
  expect(session.state.getState().verified).toBe(false);
});

it("preserves the contact on token changes and clears it on account changes", () => {
  const contacts = new ActiveContactStore();
  const session = new CredentialsStore();

  session.save(credentials);
  contacts.save(contact);
  const actions = createSessionActions(session, contacts);

  actions.acceptVerifiedSession({ ...credentials, apiToken: "new-token" });
  expect(contacts.state.getState().contact).toEqual(contact);
  actions.acceptVerifiedSession({ ...credentials, instanceId: "other" });
  expect(contacts.state.getState().contact).toBeNull();
  contacts.state.persist.rehydrate();
  expect(contacts.state.getState().contact).toBeNull();
});

it("clears both stores on sign-out and ignores late verification", () => {
  const contacts = new ActiveContactStore();
  const session = new CredentialsStore();

  session.save(credentials);
  contacts.save(contact);
  createSessionActions(session, contacts).signOut();
  session.setVerification(credentials);
  expect(session.state.getState().verified).toBe(false);
  session.state.persist.rehydrate();
  contacts.state.persist.rehydrate();
  expect(session.state.getState().credentials).toBeNull();
  expect(contacts.state.getState().contact).toBeNull();
});

it("handles unavailable browser storage during restore", () => {
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

it("reads the previous storage format", () => {
  localStorage.setItem("green-api-credentials", JSON.stringify(credentials));
  localStorage.setItem("green-api-active-chat", JSON.stringify(contact));

  expect(new CredentialsStore().state.getState()).toEqual({
    credentials,
    verified: false,
    sessionErrorMessage: "",
  });

  expect(new ActiveContactStore().state.getState().contact).toEqual(contact);
});

it("persists only credentials and ignores stored verification flags", () => {
  const session = new CredentialsStore();

  session.save(credentials);

  expect(JSON.parse(localStorage.getItem("green-api-credentials")!)).toEqual({
    state: { credentials },
    version: 0,
  });

  localStorage.setItem(
    "green-api-credentials",
    JSON.stringify({
      state: { credentials, verified: true, sessionErrorMessage: "old error" },
      version: 0,
    }),
  );

  expect(new CredentialsStore().state.getState()).toEqual({
    credentials,
    verified: false,
    sessionErrorMessage: "",
  });
});

it("clears the contact when the API URL changes", () => {
  const session = new CredentialsStore();
  const contacts = new ActiveContactStore();
  const actions = createSessionActions(session, contacts);

  actions.acceptVerifiedSession(credentials);
  contacts.save(contact);

  actions.acceptVerifiedSession({
    ...credentials,
    apiUrl: "https://other.example.com",
  });

  expect(contacts.state.getState().contact).toBeNull();
  expect(localStorage.getItem("green-api-active-chat")).toBeNull();
});

it("rejects invalid data inside the persist envelope", () => {
  localStorage.setItem(
    "green-api-credentials",
    JSON.stringify({
      state: { credentials: { ...credentials, apiUrl: "http://example.com" } },
      version: 0,
    }),
  );

  localStorage.setItem(
    "green-api-active-chat",
    JSON.stringify({
      state: { contact: { ...contact, phone: "123" } },
      version: 0,
    }),
  );

  expect(new CredentialsStore().state.getState().credentials).toBeNull();
  expect(new ActiveContactStore().state.getState().contact).toBeNull();
});
