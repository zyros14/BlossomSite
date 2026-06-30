import { createHmac, timingSafeEqual } from 'node:crypto';

function getConfig(env, request) {
  return {
    sessionSecret: env.ADMIN_SESSION_SECRET || 'REPLACE_WITH_LONG_RANDOM_SECRET'
  };
}

function verifySessionCookie(cookieHeader, secret) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;
  const value = decodeURIComponent(sessionCookie.slice('session='.length));
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  return payload;
}

export async function onRequest({ request, env }) {
  const config = getConfig(env, request);
  const payload = verifySessionCookie(request.headers.get('cookie'), config.sessionSecret);
  if (!payload) {
    return Response.json({ ok: false });
  }
  const [userId, username] = payload.split(':');
  return Response.json({ ok: true, userId, username });
}
