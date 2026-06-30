async function sign(data, secret) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const messageData = enc.encode(data);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getConfig(env, request) {
  return {
    sessionSecret: env.ADMIN_SESSION_SECRET || 'REPLACE_WITH_LONG_RANDOM_SECRET'
  };
}

async function verifySessionCookie(cookieHeader, secret) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;
  const value = decodeURIComponent(sessionCookie.slice('session='.length));
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = await sign(payload, secret);
  if (expected !== sig) return null;
  return payload;
}

export async function onRequest({ request, env }) {
  const config = getConfig(env, request);
  const payload = await verifySessionCookie(request.headers.get('cookie'), config.sessionSecret);
  if (!payload) {
    return Response.json({ ok: false });
  }
  const [userId, username] = payload.split(':');
  return Response.json({ ok: true, userId, username });
}
