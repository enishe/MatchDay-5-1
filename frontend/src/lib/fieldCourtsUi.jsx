const COURTS_PREVIEW_STYLE = {
  marginTop: 6,
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(34, 197, 94, 0.08)',
  border: '1px solid rgba(34, 197, 94, 0.2)',
  color: '#22c55e',
  fontSize: 13,
};

const COURTS_REDUCE_WARNING_STYLE = {
  marginTop: 6,
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(249, 115, 22, 0.08)',
  border: '1px solid rgba(249, 115, 22, 0.35)',
  color: '#f97316',
  fontSize: 13,
};

export function CourtsCountPreview({ count }) {
  const n = parseInt(count, 10) || 0;
  if (n <= 0) return null;
  const verb = n === 1 ? 'krijohet' : 'krijohen';
  const noun = n === 1 ? 'fushë' : 'fusha';
  return (
    <div style={COURTS_PREVIEW_STYLE}>
      ℹ️ Do të {verb} {n} {noun}:&nbsp;
      {Array.from({ length: n }, (_, i) => `Court ${i + 1}`).join(' • ')}
    </div>
  );
}

export function CourtsCountEditPreview({ count, originalCount }) {
  const n = parseInt(count, 10) || 0;
  const orig = parseInt(originalCount, 10) || 0;
  return (
    <>
      <CourtsCountPreview count={count} />
      {orig > 0 && n > 0 && n < orig && (
        <div style={COURTS_REDUCE_WARNING_STYLE}>
          ⚠️ Duke ulur nga {orig} në {n} fusha. Rezervimet ekzistuese për Court {n + 1}..{orig} mund të preken.
        </div>
      )}
    </>
  );
}
