// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/entities/message";
import { useChatAutoScroll } from "./useChatAutoScroll";

function History({
  chatId,
  messages,
}: {
  chatId: string;
  messages: ChatMessage[];
}) {
  const { historyRef, onHistoryScroll } = useChatAutoScroll(chatId, messages);

  return (
    <div ref={historyRef} onScroll={onHistoryScroll} data-testid="history" />
  );
}

function setup() {
  let height = 1000;

  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
    () => height,
  );

  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);

  const view = render(<History chatId="first" messages={[]} />);
  const history = view.getByTestId("history");
  const update = (nextHeight: number, chatId = "first") => {
    height = nextHeight;
    view.rerender(<History chatId={chatId} messages={[]} />);
  };
  const scrollTo = (top: number) => {
    history.scrollTop = top;
    fireEvent.scroll(history);
  };

  return { history, update, scrollTo };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("открывает чат внизу и прокручивает вслед за сообщениями выше порога", () => {
  const { history, update, scrollTo } = setup();

  expect(history.scrollTop).toBe(700);
  scrollTo(700);
  update(1500);
  expect(history.scrollTop).toBe(1200);
});

it("сохраняет позицию чтения и возобновляет прокрутку возле конца", () => {
  const { history, update, scrollTo } = setup();

  scrollTo(200);
  update(1500);
  expect(history.scrollTop).toBe(200);

  scrollTo(1150);
  update(1800);
  expect(history.scrollTop).toBe(1500);
});

it("возобновляет прокрутку при смене чата и отложенной загрузке истории", () => {
  const { history, update, scrollTo } = setup();

  scrollTo(200);
  update(0, "second");
  expect(history.scrollTop).toBe(0);
  update(1300, "second");
  expect(history.scrollTop).toBe(1000);
});

it("прокручивает короткий чат, когда сообщения перестают помещаться", () => {
  const { history, update, scrollTo } = setup();

  update(200, "short");
  scrollTo(0);
  update(800, "short");
  expect(history.scrollTop).toBe(500);
});
