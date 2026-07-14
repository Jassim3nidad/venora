export function getRemainingVenueCount(total: number, visible: number) {
  return Math.max(total - visible, 0);
}
