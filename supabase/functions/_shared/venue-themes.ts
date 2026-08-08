/**
 * Deno-facing re-export of the canonical theme config in `@venora/lib`.
 *
 * The web app imports the same module through the package entrypoint, so the
 * theme list, labels, and prompt wording can never drift between the chip UI
 * and the prompt the model actually receives. The source file has no imports
 * of its own, so Deno can load it as-is.
 */
export * from "../../../packages/lib/src/venue-themes.ts";
