// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

import { CredentialsStore } from "./credentialsStore";

const credentials = {
  apiUrl: "https://example.com",
  instanceId: "instance",
  apiToken: "token",
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

it.each([
  "{invalid",
  "null",
  "{}",
  JSON.stringify({
    state: { credentials: { ...credentials, apiUrl: "http://example.com" } },
    version: 0,
  }),
])("отклоняет некорректные сохранённые реквизиты: %s", (saved) => {
  localStorage.setItem("green-api-credentials", saved);
  const session = new CredentialsStore();

  expect(session.state.getState().credentials).toBeNull();
  expect(session.state.getState().verification).toBeNull();
});

it("сохраняет только реквизиты и игнорирует сохранённый статус проверки", () => {
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

it("держит ошибку проверки в памяти и допускает последующую успешную проверку", () => {
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

it("игнорирует ошибку проверки устаревших реквизитов", () => {
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
