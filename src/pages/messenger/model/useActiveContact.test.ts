// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";

import { expect, it } from "vitest";

import { contactStore } from "@/features/green-api-session";

import { useActiveContact } from "./useActiveContact";

import { type VerifiedContact } from "@/entities/contact";

import { setup, deferred } from "./testing/setupMessengerTest";

it("сохраняет только последнюю проверку при нарушении порядка ответов", async () => {
  const { client, wrapper } = setup();
  const first = deferred<VerifiedContact>();
  const second = deferred<VerifiedContact>();

  client.resolveContact.mockImplementation((phone) =>
    phone === "12345678" ? first.promise : second.promise,
  );

  const { result } = renderHook(() => useActiveContact(client), { wrapper });

  act(() => result.current.selectContact("12345678"));
  await waitFor(() => expect(client.resolveContact).toHaveBeenCalledTimes(1));
  act(() => result.current.selectContact("87654321"));
  await waitFor(() => expect(client.resolveContact).toHaveBeenCalledTimes(2));

  await act(async () => {
    second.resolve({ phone: "87654321", chatId: "b" });
    await second.promise;
  });

  await waitFor(() => expect(result.current.activeContact?.chatId).toBe("b"));

  await act(async () => {
    first.resolve({ phone: "12345678", chatId: "a" });
    await first.promise;
  });

  expect(result.current.activeContact?.chatId).toBe("b");
  contactStore.state.persist.rehydrate();
  expect(contactStore.state.getState().contact?.chatId).toBe("b");
  expect(client.getChatHistory).not.toHaveBeenCalled();
});

it("не выбирает контакт после размонтирования", async () => {
  const { client, wrapper } = setup();
  const response = deferred<VerifiedContact>();

  client.resolveContact.mockReturnValue(response.promise);
  const { result, unmount } = renderHook(() => useActiveContact(client), {
    wrapper,
  });

  act(() => result.current.selectContact("12345678"));
  await waitFor(() => expect(client.resolveContact).toHaveBeenCalled());
  unmount();

  await act(async () => {
    response.resolve({ phone: "12345678", chatId: "a" });
    await response.promise;
  });

  contactStore.state.persist.rehydrate();
  expect(contactStore.state.getState().contact).toBeNull();
});

it("сохраняет текущий контакт при ошибке проверки", async () => {
  const { client, wrapper } = setup();
  const previous = { phone: "12345678", chatId: "a" };

  contactStore.save(previous);
  client.resolveContact.mockRejectedValue(new Error("Contact unavailable"));
  const { result } = renderHook(() => useActiveContact(client), { wrapper });

  act(() => result.current.selectContact("87654321"));

  await waitFor(() =>
    expect(result.current.error?.message).toBe("Contact unavailable"),
  );

  expect(result.current.activeContact).toEqual(previous);
});
