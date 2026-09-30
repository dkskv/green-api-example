import { expect, it } from "vitest";
import { getDeletionError } from "./getDeletionError";

it("скрывает прежнюю ошибку при повторном удалении", () => {
  const failure = new Error("failed");

  expect(
    getDeletionError([
      { variables: { id: "a" }, error: failure },
      { variables: { id: "a" }, error: null },
    ]),
  ).toBeNull();
});

it("сохраняет ошибки других сообщений после успешного повтора", () => {
  const remaining = new Error("other deletion failed");

  expect(
    getDeletionError([
      { variables: { id: "a" }, error: new Error("failed") },
      { variables: { id: "b" }, error: remaining },
      { variables: { id: "a" }, error: null },
    ]),
  ).toBe(remaining);
});
