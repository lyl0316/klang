// Date helpers. All concert times are Swiss local time (Europe/Zurich).
// A "day key" is a 'YYYY-MM-DD' string for a calendar day in Zurich.

export const TZ = 'Europe/Zurich';

const pad = (n) => String(n).padStart(2, '0');

function lastSundayOf(year, monthIndex) {
  const d = new Date(Date.UTC(year, monthIndex + 1, 0)); // last day of month
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getUTCDate();
}

// UTC offset for an evening on the given Zurich day (CEST between the last Sundays
// of March and October). Good enough for concert start times.
export function zurichOffset(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const start = lastSundayOf(y, 2);
  const end = lastSundayOf(y, 9);
  const afterStart = m > 3 || (m === 3 && d >= start);
  const beforeEnd = m < 10 || (m === 10 && d < end);
  return afterStart && beforeEnd ? '+02:00' : '+01:00';
}

export function zurichISO(dayKey, hhmm) {
  return `${dayKey}T${hhmm}:00${zurichOffset(dayKey)}`;
}

export function addDays(dayKey, n) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// 0 = Sunday … 6 = Saturday
export function weekdayOf(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function zurichParts(date) {
  const o = {};
  for (const p of partsFmt.formatToParts(date)) o[p.type] = p.value;
  return o;
}

// Zurich calendar day of an instant (ISO string or Date)
export function dayKeyOf(iso) {
  const p = zurichParts(typeof iso === 'string' ? new Date(iso) : iso);
  return `${p.year}-${p.month}-${p.day}`;
}

export function timeOf(iso) {
  const p = zurichParts(new Date(iso));
  return `${p.hour}:${p.minute}`;
}

export function todayKey() {
  return dayKeyOf(new Date());
}

export function monthKeyOf(dayKey) {
  return dayKey.slice(0, 7);
}

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const weekdayShort = (dayKey) => WD_SHORT[weekdayOf(dayKey)];
export const monthShort = (dayKey) => MONTH_SHORT[Number(dayKey.slice(5, 7)) - 1];
export const monthLong = (monthKey) => MONTH_LONG[Number(monthKey.slice(5, 7)) - 1];
export const dayNum = (dayKey) => Number(dayKey.slice(8, 10));
export const yearOf = (dayKey) => Number(dayKey.slice(0, 4));

// "Today" / "Tomorrow" / "Sat, Nov 1" (+ year when not the current year)
export function relDayLabel(dayKey, today = todayKey()) {
  const diff = daysBetween(today, dayKey);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const base = `${weekdayShort(dayKey)}, ${monthShort(dayKey)} ${dayNum(dayKey)}`;
  return yearOf(dayKey) === yearOf(today) ? base : `${base}, ${yearOf(dayKey)}`;
}

// "Sun, Oct 25, 2026 · 19:30"
export function fullDateTime(iso) {
  const k = dayKeyOf(iso);
  return `${weekdayShort(k)}, ${monthShort(k)} ${dayNum(k)}, ${yearOf(k)} · ${timeOf(iso)}`;
}

export function isPast(iso, durationMin = 0) {
  return new Date(iso).getTime() + durationMin * 60000 < Date.now();
}
