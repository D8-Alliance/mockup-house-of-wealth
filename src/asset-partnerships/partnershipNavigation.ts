let pendingEngagementId: string | null = null;

/** Asks the Asset Partnerships page to open this partnership when it next loads, e.g. from My reviews. */
export function openPartnership(id: string): void {
  pendingEngagementId = id;
}

export function takePartnership(): string | null {
  const id = pendingEngagementId;
  pendingEngagementId = null;
  return id;
}
