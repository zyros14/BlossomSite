const defaultChangelog = [
  { date: 'June 2026', title: 'Site rebuild + admin panel', body: 'Streamlined the site to Home, Rules, Gallery, and Changelog, with live server status and a staff admin panel for easy editing.' },
  { date: 'May 2026', title: 'TAB & tab-list overhaul', body: 'Cleaner, Stray-SMP-inspired tab list with compact stat display: ping, TPS, RAM, online/staff counts.' },
  { date: 'April 2026', title: 'Playtime plugin added', body: 'Playtime tracking introduced for future stat displays.' },
  { date: 'March 2026', title: 'Server launch', body: 'Blossom SMP opens with Waystones, proximity chat, and land claims on a fresh cherry-blossom map.' }
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    try {
      if (env.CONTENT_KV && typeof env.CONTENT_KV.get === 'function') {
        const raw = await env.CONTENT_KV.get('changelog');
        if (raw) return new Response(raw, { status: 200, headers: { 'content-type': 'application/json' } });
      }
    } catch (e) { /* ignore */ }

    return new Response(JSON.stringify(defaultChangelog), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|; )blossom_session_id=([^;]+)/);
    const fallbackMatch = cookie.match(/(?:^|; )blossom_session=([^;]+)/);

    let authorized = false;
    const allowedUserId = env.DISCORD_ALLOWED_USER_ID || env.DISCORD_ALLOWED_USER;
  if (match && env.SESSIONS && typeof env.SESSIONS.get === 'function') {
      try {
        const raw = await env.SESSIONS.get(`sess:${match[1]}`);
        if (raw) {
          const obj = JSON.parse(raw);
          if (Number(obj.expiresAt || 0) > Date.now()) {
            if (!allowedUserId || String(obj.id) === String(allowedUserId)) {
              authorized = true;
            }
          }
        }
      } catch (e) { authorized = false; }
    } else if (fallbackMatch) {
      try {
        const raw = JSON.parse(decodeURIComponent(fallbackMatch[1]));
        if (Number(raw.expiresAt || 0) > Date.now()) {
          if (!allowedUserId || String(raw.id) === String(allowedUserId)) {
            authorized = true;
          }
        }
      } catch (e) { authorized = false; }
    }

    if (!authorized) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 403, headers: { 'content-type': 'application/json' } });

    try {
      const body = await request.json();
      const payload = JSON.stringify(body);
      if (env.CONTENT_KV && typeof env.CONTENT_KV.put === 'function') {
        await env.CONTENT_KV.put('changelog', payload);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: false, error: 'no-kv' }), { status: 500, headers: { 'content-type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
  }

  return new Response(null, { status: 405 });
}
