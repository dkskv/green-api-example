import { expect, it } from "vitest";
import { boundMethod } from "./boundMethod";

it("keeps callbacks bound to their own instance with a stable reference", () => {
  class Counter {
    value = 0;

    @boundMethod
    increment(amount: number) {
      this.value += amount;

      return this.value;
    }
  }

  const first = new Counter();
  const second = new Counter();
  const increment = first.increment;
  const incrementOther = second.increment;

  expect(increment(2)).toBe(2);
  expect(incrementOther(5)).toBe(5);
  expect(increment(3)).toBe(5);
  expect(first.increment).toBe(increment);
  expect(second.increment).toBe(incrementOther);
});
