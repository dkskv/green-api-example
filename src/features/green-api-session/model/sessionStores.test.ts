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
    verification: null,
  });
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
])("rejects invalid persisted contact: %s", (saved) => {
  localStorage.setItem("green-api-active-chat", saved);
  const restored = new ActiveContactStore();

  expect(restored.state.getState().contact).toBeNull();
});

it.each([
  "{invalid",
  "null",
  "{}",
  JSON.stringify({
    state: { credentials: { ...credentials, apiUrl: "http://example.com" } },
    version: 0,
  }),
])("rejects invalid persisted credentials: %s", (saved) => {
  localStorage.setItem("green-api-credentials", saved);
  const session = new CredentialsStore();

  expect(session.state.getState().credentials).toBeNull();
  expect(session.state.getState().verification).toBeNull();
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
  session.setVerification(credentials, { status: "success" });
  expect(session.state.getState().verification).toBeNull();
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
      state: { credentials, verification: { status: "success" } },
      version: 0,
    }),
  );

  expect(new CredentialsStore().state.getState()).toEqual({
    credentials,
    verification: null,
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

it("keeps the verification error without persisting it and allows a later success", () => {
  const session = new CredentialsStore();
  const error = new Error("Network unavailable");

  session.save(credentials);
  session.setVerification(credentials, { status: "error", error });

  expect(session.state.getState().verification).toEqual({
    status: "error",
    error,
  });

  expect(JSON.parse(localStorage.getItem("green-api-credentials")!)).toEqual({
    state: { credentials },
    version: 0,
  });

  expect(new CredentialsStore().state.getState().verification).toBeNull();
  session.setVerification(credentials, { status: "success" });
  expect(session.state.getState().verification).toEqual({ status: "success" });
});

it("ignores a verification error for replaced credentials", () => {
  const session = new CredentialsStore();
  const next = { ...credentials, apiToken: "new-token" };

  session.save(credentials);
  session.save(next);

  session.setVerification(credentials, {
    status: "error",
    error: new Error("Late failure"),
  });

  expect(session.state.getState()).toEqual({
    credentials: next,
    verification: { status: "success" },
  });
});

it("нормализует сохранённые реквизиты по тем же правилам, что и форма", () => {
  localStorage.setItem(
    "green-api-credentials",
    JSON.stringify({
      state: {
        credentials: {
          apiUrl: " https://example.com/path?query=1 ",
          instanceId: " instance ",
          apiToken: " token ",
        },
      },
      version: 0,
    }),
  );

  expect(new CredentialsStore().state.getState()).toEqual({
    credentials,
    verification: null,
  });
});
