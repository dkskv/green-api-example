// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useBypassStrictMode } from "./useBypassStrictMode";

afterEach(() => vi.unstubAllEnvs());

it("is ready on the first production render without scheduling another render", async () => {
  vi.stubEnv("PROD", true);
  let renders = 0;
  const { result, unmount } = renderHook(() => {
    renders += 1;

    return useBypassStrictMode();
  });

  expect(result.current).toBe(true);
  await act(async () => {});
  expect(renders).toBe(1);
  unmount();
});
