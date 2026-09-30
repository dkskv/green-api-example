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

it("сохраняет контакт при смене токена и сбрасывает при смене аккаунта", () => {
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

it("очищает оба хранилища при выходе и игнорирует позднюю проверку", () => {
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

it("сбрасывает контакт при изменении адреса API", () => {
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
