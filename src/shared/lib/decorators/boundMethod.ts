/** Привязывает метод к экземпляру при первом обращении и сохраняет callback. */
export function boundMethod<
  This extends object,
  Args extends unknown[],
  Result,
>(
  _target: This,
  name: string | symbol,
  descriptor: TypedPropertyDescriptor<(this: This, ...args: Args) => Result>,
): TypedPropertyDescriptor<(this: This, ...args: Args) => Result> {
  const method = descriptor.value!;

  return {
    configurable: true,
    get(this: This) {
      const bound = method.bind(this);

      Object.defineProperty(this, name, {
        value: bound,
        configurable: true,
        writable: true,
      });

      return bound;
    },
  };
}
