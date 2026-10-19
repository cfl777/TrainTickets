/**
 * Joins class names, dropping the missing ones. CSS-module keys are
 * `string | undefined` under noUncheckedIndexedAccess, and some consumers
 * (React Aria's className) want a plain string.
 */
export function cx(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined).join(" ");
}
