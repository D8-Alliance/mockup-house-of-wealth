/**
 * Lets another screen open the Sponsor Portal with the Register Project form already open,
 * e.g. the dashboard's "Submit New Project" button. The portal reads it once when it opens.
 */
let registrationRequested = false;

export function requestProjectRegistration(): void {
  registrationRequested = true;
}

export function takeProjectRegistrationRequest(): boolean {
  const requested = registrationRequested;
  registrationRequested = false;
  return requested;
}
