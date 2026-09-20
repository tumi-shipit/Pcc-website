import { getSouthAfricaDateKey } from "./dateHelpers";

export type RegistrationSchedule = {
  registration_status?: string | null;
  registration_open_date?: string | null;
  registration_close_date?: string | null;
  registration_schedule_enabled?: boolean | null;
};

// Dates are inclusive, in South African time. Draft/postponed/completed events
// never publish themselves. Manual mode remains available for emergency closure.
export function registrationStatusAt(t: RegistrationSchedule, now = new Date()): string {
  const status = t.registration_status ?? "Closed";
  if (!t.registration_schedule_enabled || !["Open", "Closed"].includes(status)) return status;
  const today = getSouthAfricaDateKey(now);
  const opens = t.registration_open_date?.slice(0, 10);
  const closes = t.registration_close_date?.slice(0, 10);
  if (!today || !opens || !closes || opens > closes) return "Closed";
  return today >= opens && today <= closes ? "Open" : "Closed";
}
