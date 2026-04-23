/**
 * Cross-collection invariant reporter.
 *
 * Returns a function that either throws (strict mode, in CI) or warns
 * (dev). Shared by the cross-collection consistency checks in
 * `src/lib/data.ts`. Use this when a cross-collection check cannot be
 * expressed as a zod schema — i.e., when validation requires data from
 * two or more files loaded independently by `loadValidated` callers.
 *
 * The strict/dev split gates on `process.env.CI === "true"` at the call
 * site — pass the boolean in rather than reading env here, so callers
 * remain pure functions of their inputs.
 *
 * @example
 * ```ts
 * const report = createReporter(process.env.CI === "true");
 * if (!parent.childIds.includes(child.id)) {
 *   report(`[backref-drift] ${child.id} missing from ${parent.id}.childIds`);
 * }
 * ```
 */
export function createReporter(strict: boolean): (msg: string) => void {
  return (msg) => {
    if (strict) throw new Error(msg);
    console.warn(msg);
  };
}
