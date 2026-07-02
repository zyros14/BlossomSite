const defaultContent = {
  heroEyebrow: 'Java & Bedrock · 1.21.11',
  heroLine1: 'A slower kind of',
  heroLine2: 'survival.',
  heroSubtitle: 'Blossom SMP is a chill, community-built survival world — no pay-to-win, no crates, just a calm cherry-blossom map and a friendly playerbase.',
  aboutP1: 'Blossom SMP is a chill Minecraft survival server built for players who want a relaxed, community-focused experience without pay-to-win systems or overcomplicated mechanics. Set in a calm, cherry-blossom-inspired world, the server is designed around simple survival gameplay enhanced with quality-of-life features like Waystones, proximity voice chat, and land claims to keep things fair and fun.',
  aboutP2: "Whether you're building, exploring, or just hanging out with friends, Blossom SMP focuses on creativity, community, and a laid-back atmosphere where everyone can play at their own pace. No crates, no unfair advantages — just pure survival with a friendly playerbase.",
  statusTitle: 'Server Status',
  statusSubtitle: 'Live data pulled directly from the server — always up to date.',
  ctaTitle: 'Come hang out',
  ctaText: 'Join the Discord for updates, support, and to meet the community before you log on.',
  ctaButton: 'Join the Discord →'
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (request.method === 'GET') {
    try {
      if (env.CONTENT_KV && typeof env.CONTENT_KV.get === 'function') {
        const raw = await env.CONTENT_KV.get('content');
        if (raw) return new Response(raw, { status: 200, headers: { 'content-type': 'application/json' } });
      }
    } catch (e) { /* ignore */ }
    return new Response(JSON.stringify(defaultContent), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (request.method === 'POST') {
    // require authenticated session via SESSIONS KV
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
        await env.CONTENT_KV.put('content', payload);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: false, error: 'no-kv' }), { status: 500, headers: { 'content-type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
  }

  return new Response(null, { status: 405 });
}
