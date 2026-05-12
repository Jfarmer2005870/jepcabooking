// Generate and download an .ics calendar file for a booking.
// Works with Apple Calendar, Google Calendar (import), Outlook, etc.

interface CalendarEventInput {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM or HH:MM:SS
  durationMinutes?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

const formatLocalICSDate = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

const escapeICS = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export const buildICS = (event: CalendarEventInput): string => {
  const [y, m, d] = event.date.split("-").map(Number);
  let start: Date;
  let end: Date;
  let allDay = false;

  if (event.time) {
    const [hh, mm] = event.time.split(":").map(Number);
    start = new Date(y, m - 1, d, hh, mm, 0);
    end = new Date(start.getTime() + (event.durationMinutes || 60) * 60_000);
  } else {
    allDay = true;
    start = new Date(y, m - 1, d);
    end = new Date(y, m - 1, d + 1);
  }

  const dtStamp = formatLocalICSDate(new Date());
  const uid = `${event.id}@jepca`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jepca//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    allDay
      ? `DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`
      : `DTSTART:${formatLocalICSDate(start)}`,
    allDay
      ? `DTEND;VALUE=DATE:${formatLocalICSDate(end).slice(0, 8)}`
      : `DTEND:${formatLocalICSDate(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.location ? `LOCATION:${escapeICS(event.location)}` : "",
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
};

export const downloadBookingICS = (event: CalendarEventInput) => {
  const ics = buildICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jepca-booking-${event.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
