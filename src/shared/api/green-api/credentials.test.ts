import { expect, it } from "vitest";
import { greenApiCredentialsSchema } from "./credentials";

const credentials = {
  apiUrl: "https://example.com",
  instanceId: "instance",
  apiToken: "token",
};

it.each([
  { apiUrl: "http://example.com" },
  { apiUrl: "invalid" },
  { apiUrl: "" },
  { instanceId: "   " },
  { apiToken: "   " },
  { apiToken: undefined },
])("отклоняет некорректные реквизиты: %j", (invalid) => {
  expect(
    greenApiCredentialsSchema.safeParse({ ...credentials, ...invalid }).success,
  ).toBe(false);
});
