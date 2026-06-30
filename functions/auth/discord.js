import { createHmac, timingSafeEqual } from 'node:crypto';

const DISCORD_CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID';
const DISCORD_CLIENT_SECRET = 'YOUR_DISCORD_CLIENT_SECRET';
const DISCORD_REDIRECT_URI = 'https://blossoms-mp.com/api/auth/discord/callback';
const ALLOWED_DISCORD_USER_IDS = ['1023663266003701790'];
const SESSION_SECRET = 'REPLACE_WITH_LONG_RANDOM_SECRET';

function sign(data) {
  return createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
}

function createSessionCookie(userId, username) {
  const payload = `${userId}:${username}:${Date.now()}`;
  const sig = sign(payload);
  return `session=${encodeURIComponent(`${payload}.${sig}`)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`;
}

function verifySessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;
  const value = decodeURIComponent(sessionCookie.slice('session='.length));
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  return payload;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return new Response('Discord token exchange failed', { status: 400 });
  }

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const userData = await userResponse.json();

  if (!userData.id || !ALLOWED_DISCORD_USER_IDS.includes(userData.id)) {
    return new Response('You are not an approved admin.', { status: 403 });
  }

  const headers = new Headers();
  headers.set('Set-Cookie', createSessionCookie(userData.id, userData.username));
  headers.set('Location', '/admin.html');
  return new Response(null, { status: 302, headers });
}

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie');

  if (url.pathname === '/api/auth/discord/login') {
    const state = Math.random().toString(36).slice(2);
    const redirect = new URL('https://discord.com/api/oauth2/authorize');
    redirect.searchParams.set('client_id', DISCORD_CLIENT_ID);
    redirect.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
    redirect.searchParams.set('response_type', 'code');
    redirect.searchParams.set('scope', 'identify guilds');
    redirect.searchParams.set('state', state);
    return Response.redirect(redirect.toString(), 302);
  }

  if (url.pathname === '/api/auth/discord/logout') {
    const headers = new Headers();
    headers.set('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    headers.set('Location', '/admin.html');
    return new Response(null, { status: 302, headers });
  }

  if (url.pathname === '/api/auth/discord/me') {
    const payload = verifySessionCookie(cookieHeader);
    if (!payload) {
      return Response.json({ ok: false });
    }
    const [userId, username] = payload.split(':');
    return Response.json({ ok: true, userId, username });
  }

  return next();
}
