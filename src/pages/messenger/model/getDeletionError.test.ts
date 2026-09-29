import { expect, it } from "vitest";
import { getDeletionError } from "./getDeletionError";

it("hides an old failure when the same deletion is retried", () => {
  const failure = new Error("failed");

  expect(
    getDeletionError([
      { variables: { id: "a" }, error: failure },
      { variables: { id: "a" }, error: null },
    ]),
  ).toBeNull();
});

it("keeps failures of other messages after a successful retry", () => {
  const remaining = new Error("other deletion failed");

  expect(
    getDeletionError([
      { variables: { id: "a" }, error: new Error("failed") },
      { variables: { id: "b" }, error: remaining },
      { variables: { id: "a" }, error: null },
    ]),
  ).toBe(remaining);
});
