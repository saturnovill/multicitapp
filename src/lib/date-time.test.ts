import { describe, expect, it } from "vitest";

import { addCalendarDays, dateInTimezone, isValidCalendarDate, zonedDateTimeToUtc } from "./date-time";

describe("date-time", () => {
  it("convierte la hora de Hermosillo a UTC", () => {
    expect(zonedDateTimeToUtc("2026-08-30", "09:15", "America/Hermosillo").toISOString()).toBe("2026-08-30T16:15:00.000Z");
  });

  it("respeta el cambio de día de la zona horaria", () => {
    expect(dateInTimezone(new Date("2026-08-30T03:00:00.000Z"), "America/Hermosillo")).toBe("2026-08-29");
  });

  it("suma días de calendario y rechaza fechas imposibles", () => {
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(isValidCalendarDate("2026-02-29")).toBe(false);
    expect(isValidCalendarDate("2026-09-01")).toBe(true);
  });
});
