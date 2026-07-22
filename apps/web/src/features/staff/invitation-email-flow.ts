export type CoordinatorEmailFlow = "invite" | "magic_link";

export function resolveCoordinatorEmailFlow(
  existingUser: boolean | null,
): CoordinatorEmailFlow {
  return existingUser === false ? "invite" : "magic_link";
}
