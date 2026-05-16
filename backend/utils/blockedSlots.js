const { formatBelgradeYmd } = require('./timezone');

function belgradeHourFromDate(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Belgrade',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
}

async function isSlotBlocked(client, fieldId, startTime) {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const dateYmd = formatBelgradeYmd(start);
  const belgradeHour = belgradeHourFromDate(start);

  const blockedResult = await client.query(
    `SELECT id FROM blocked_slots
     WHERE field_id = $1
     AND (
       (block_type = 'hour'
         AND blocked_date = $2::date
         AND blocked_hour = $3)
       OR
       (block_type = 'full_day'
         AND blocked_date = $2::date)
       OR
       (block_type = 'weekday'
         AND weekday = EXTRACT(DOW FROM $2::date)
     )
     LIMIT 1`,
    [fieldId, dateYmd, belgradeHour]
  );
  return blockedResult.rows.length > 0;
}

module.exports = {
  belgradeHourFromDate,
  isSlotBlocked,
};
