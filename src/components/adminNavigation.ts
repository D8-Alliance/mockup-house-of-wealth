let pendingSection: string | null = null;

/** Asks the Admin Center to open this section when it next loads, e.g. pdp_applications from My reviews. */
export function openAdminSection(section: string): void {
  pendingSection = section;
}

export function takeAdminSection(): string | null {
  const section = pendingSection;
  pendingSection = null;
  return section;
}
