export async function onRequest(context) {
  const { request, env } = context;
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|; )blossom_session_id=([^;]+)/);
  const fallbackMatch = cookie.match(/(?:^|; )blossom_session=([^;]+)/);

  if (match && env.SESSIONS && typeof env.SESSIONS.get === 'function') {
    const sessionId = match[1];
    try {
      const raw = await env.SESSIONS.get(`sess:${sessionId}`);
      if (!raw) return new Response(JSON.stringify({ authorized: false }), { status: 200, headers: { 'content-type': 'application/json' } });
      const obj = JSON.parse(raw);
      if (Number(obj.expiresAt || 0) <= Date.now()) {
        return new Response(JSON.stringify({ authorized: false }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ authorized: true, user: { id: obj.id, username: obj.username } }), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ authorized: false }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }

  if (fallbackMatch) {
    try {
      const raw = decodeURIComponent(fallbackMatch[1]);
      const obj = JSON.parse(raw);
      if (Number(obj.expiresAt || 0) <= Date.now()) {
        return new Response(JSON.stringify({ authorized: false }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ authorized: true, user: { id: obj.id, username: obj.username } }), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ authorized: false }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ authorized: false }), { status: 200, headers: { 'content-type': 'application/json' } });
}
