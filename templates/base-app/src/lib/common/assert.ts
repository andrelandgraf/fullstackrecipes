const prefix: string = "Assertion failed";

/**
 * TypeScript assertion function that narrows types when condition is truthy.
 * Throws if condition is falsy. Message can be string or lazy function.
 */
export default function assert(
  condition: any,
  message?: string | (() => string),
): asserts condition {
  if (condition) {
    return;
  }

  const provided: string | undefined =
    typeof message === "function" ? message() : message;
  const value: string = provided ? `${prefix}: ${provided}` : prefix;
  throw new Error(value);
}
