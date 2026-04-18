/**
 * Smoke test i API-s në një proces të vetëm (në port të përkohshëm).
 * Ekzekuto: node scripts/smoke-api.js
 * Kërkon lidhje me databazën (si server.js).
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.SMOKE_PORT || '5055';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(origin, maxMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const res = await fetch(`${origin}/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(200);
  }
  throw new Error(`Health check timeout (${origin}/health)`);
}

async function j(method, url, { token, body } = {}) {
  const h = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    h['Content-Type'] = 'application/json; charset=utf-8';
  }
  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  return { res, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const origin = `http://127.0.0.1:${process.env.PORT}`;
  const api = `${origin}/api`;

  // Nis serverin (bootstrap + listen)
  // eslint-disable-next-line global-require
  require('../server');
  await waitForHealth(origin);

  const stamp = Date.now();
  const email = `smoke_${stamp}@matchday.test`;
  const password = 'SmokeTest2026!';

  // 1) Register
  let { res, data } = await j('POST', `${api}/auth/register`, {
    body: {
      firstName: 'Smoke',
      lastName: 'User',
      email,
      password,
      confirmPassword: password,
    },
  });
  assert(res.status === 201, `register: prisnim 201, morëm ${res.status}: ${JSON.stringify(data)}`);
  assert(data.token && data.user, `register: mungon token/user: ${JSON.stringify(data)}`);
  const userToken = data.token;

  // 2) Login
  ({ res, data } = await j('POST', `${api}/auth/login`, {
    body: { email, password },
  }));
  assert(res.status === 200, `login: prisnim 200, morëm ${res.status}: ${JSON.stringify(data)}`);
  const loginToken = data.token;
  assert(loginToken, 'login: pa token');

  // 3) Profile
  ({ res, data } = await j('GET', `${api}/auth/profile`, { token: loginToken }));
  assert(res.status === 200, `profile GET: ${res.status} ${JSON.stringify(data)}`);

  // 4) Fields
  ({ res, data } = await j('GET', `${api}/fields`, { token: loginToken }));
  assert(res.status === 200, `fields: ${res.status}`);
  assert(Array.isArray(data) && data.length > 0, 'fields: listë bosh');
  const field = data[0];
  const fieldId = field.id;
  const price = parseFloat(field.price_per_hour);

  // 5) Stats
  ({ res, data } = await j('GET', `${api}/matches/stats`, { token: loginToken }));
  assert(res.status === 200, `stats: ${res.status}`);

  // 6) Availability + check — zgjidh orë të lirë (jo fikse 10:00, që shpesh është e zënë)
  const pad2 = (n) => String(n).padStart(2, '0');
  let dateStr;
  let start;
  let end;
  let foundSlot = false;
  const now = Date.now();
  for (let dayOff = 3; dayOff < 45 && !foundSlot; dayOff += 1) {
    const d = new Date(now + dayOff * 24 * 3600000);
    dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    ({ res, data } = await j(
      'GET',
      `${api}/bookings/availability?fieldId=${fieldId}&date=${encodeURIComponent(dateStr)}`,
      { token: loginToken }
    ));
    assert(res.status === 200, `bookings/availability: ${res.status}`);
    assert(Array.isArray(data.occupiedHours), 'occupiedHours');
    const occ = new Set(data.occupiedHours);
    for (let H = 8; H <= 22; H += 1) {
      if (occ.has(H)) continue;
      const s = new Date(`${dateStr}T${pad2(H)}:00:00`);
      const e = new Date(s.getTime() + 3600000);
      if (s.getTime() <= now) continue;
      const chk = await j(
        'GET',
        `${api}/bookings/check?fieldId=${fieldId}&start=${encodeURIComponent(s.toISOString())}&end=${encodeURIComponent(e.toISOString())}`,
        { token: loginToken }
      );
      if (chk.res.status === 200 && chk.data.available === true) {
        start = s;
        end = e;
        foundSlot = true;
        break;
      }
    }
  }
  assert(foundSlot, 'Nuk u gjet interval i lirë për booking (45 ditë)');

  // 7) Create match
  ({ res, data } = await j('POST', `${api}/matches`, {
    token: loginToken,
    body: {
      fieldId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      totalPrice: price,
    },
  }));
  assert(res.status === 201, `POST matches: ${res.status} ${JSON.stringify(data)}`);
  const matchId = data.id;
  assert(matchId, 'match pa id');

  // 8) Get match detail
  ({ res, data } = await j('GET', `${api}/matches/${matchId}`, { token: loginToken }));
  assert(res.status === 200, `GET match: ${res.status}`);
  assert(data.match && data.players, 'match detail format');

  // 9) My matches
  ({ res, data } = await j('GET', `${api}/my-matches`, { token: loginToken }));
  assert(res.status === 200, `my-matches: ${res.status}`);
  assert(Array.isArray(data), 'my-matches jo array');

  // 10) Fields availability (calendar)
  ({ res, data } = await j('GET', `${api}/fields/availability?date=${encodeURIComponent(dateStr)}`, {
    token: loginToken,
  }));
  assert(res.status === 200, `fields/availability: ${res.status}`);
  assert(data.fields && data.fields.length > 0, 'fields/availability');

  // 11) Notifications read
  ({ res, data } = await j('POST', `${api}/notifications/read`, { token: loginToken }));
  assert(res.status === 200, `notifications/read: ${res.status}`);
  assert(data.ok === true, 'notifications/read ok');

  // 12) Admin login (nëse fjalëkalimi përputhet me seed në dev)
  const adminEmail = 'admin@matchday.com';
  const adminPass = 'MatchDay@Admin2026!';
  ({ res, data } = await j('POST', `${api}/auth/login`, {
    body: { email: adminEmail, password: adminPass },
  }));
  if (res.status === 200 && data.token) {
    const adminTok = data.token;
    ({ res, data } = await j('GET', `${api}/admin/users`, { token: adminTok }));
    assert(res.status === 200, `admin users: ${res.status}`);
    assert(Array.isArray(data), 'admin users jo array');
  } else {
    console.warn('[smoke] Admin login skip (kredencialet ose SYNC_ADMIN_PASSWORD në prod):', res.status, data);
  }

  console.log('[smoke] OK — të gjitha kontrollet kaluan.');
  console.log('[smoke] User test:', email);
  console.log('[smoke] Match i krijuar:', matchId);
  process.exit(0);
}

main().catch((e) => {
  console.error('[smoke] FAIL:', e.message || e);
  process.exit(1);
});
