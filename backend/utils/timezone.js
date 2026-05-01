const BELGRADE_TIMEZONE = 'Europe/Belgrade';

function parseGmtOffsetToMinutes(offsetText) {
  const normalized = String(offsetText || '').replace('GMT', '');
  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

function getTimeZoneOffsetMinutes(date, timeZone = BELGRADE_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT+0';
  return parseGmtOffsetToMinutes(zoneName);
}

function createUtcDateFromBelgradeLocal(dateStr, hour = 0, minute = 0) {
  const [yearStr, monthStr, dayStr] = String(dateStr || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return new Date(NaN);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), BELGRADE_TIMEZONE);
  return new Date(utcGuess - offsetMinutes * 60 * 1000);
}

function createUtcDateFromBelgradeHourLabel(dateStr, hourLabel) {
  const [hourText, minuteText = '00'] = String(hourLabel || '').split(':');
  return createUtcDateFromBelgradeLocal(dateStr, Number(hourText), Number(minuteText));
}

function formatBelgradeYmd(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BELGRADE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

module.exports = {
  BELGRADE_TIMEZONE,
  createUtcDateFromBelgradeLocal,
  createUtcDateFromBelgradeHourLabel,
  formatBelgradeYmd,
};
