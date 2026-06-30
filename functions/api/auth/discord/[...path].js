import { createHmac, timingSafeEqual } from 'node:crypto';

function getConfig(env, request) {
  const origin = new URL(request.url).origin;
  return {
    clientId: env.DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID',
    clientSecret: env.DISCORD_CLIENT_SECRET || 'YOUR_DISCORD_CLIENT_SECRET',
    redirectUri: env.DISCORD_REDIRECT_URI || `${origin}/api/auth/discord/callback`,
    allowedUserIds: (env.ALLOWED_DISCORD_USER_IDS || '1023663266003701790').split(',').map(v => v.trim()).filter(Boolean),
    sessionSecret: env.ADMIN_SESSION_SECRET || 'REPLACE_WITH_LONG_RANDOM_SECRET'
  };
}

function isConfigured(config) {
  return config.clientId !== 'YOUR_DISCORD_CLIENT_ID' && config.clientSecret !== 'YOUR_DISCORD_CLIENT_SECRET' && config.sessionSecret !== 'REPLACE_WITH_LONG_RANDOM_SECRET';
}

function sign(data, secret) {
  return createHmac('sha256', secret).update(data).digest('hex');
}

function createSessionCookie(userId, username, secret) {
  const payload = `${userId}:${username}:${Date.now()}`;
  const sig = sign(payload, secret);
  return `session=${encodeURIComponent(`${payload}.${sig}`)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`;
}

function verifySessionCookie(cookieHeader, secret) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;
  const value = decodeURIComponent(sessionCookie.slice('session='.length));
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  return payload;
}

function jsonResponse(body, init = {}) {
  return Response.json(body, init);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const config = getConfig(env, request);

  if (url.pathname.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state || !isConfigured(config)) {
      const headers = new Headers();
      headers.set('Location', '/admin.html?discord=error');
      return new Response(null, { status: 302, headers });
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      const headers = new Headers();
      headers.set('Location', '/admin.html?discord=error');
      return new Response(null, { status: 302, headers });
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    if (!userData.id || !config.allowedUserIds.includes(userData.id)) {
      const headers = new Headers();
      headers.set('Location', '/admin.html?discord=forbidden');
      return new Response(null, { status: 302, headers });
    }

    const headers = new Headers();
    headers.set('Set-Cookie', createSessionCookie(userData.id, userData.username, config.sessionSecret));
    headers.set('Location', '/admin.html');
    return new Response(null, { status: 302, headers });
  }

  return new Response('Not found', { status: 404 });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const config = getConfig(env, request);

  if (url.pathname.endsWith('/login')) {
    if (!isConfigured(config)) {
      return Response.redirect(new URL('/admin.html?discord=disabled', request.url), 302);
    }

    const state = Math.random().toString(36).slice(2);
    const redirect = new URL('https://discord.com/api/oauth2/authorize');
    redirect.searchParams.set('client_id', config.clientId);
    redirect.searchParams.set('redirect_uri', config.redirectUri);
    redirect.searchParams.set('response_type', 'code');
    redirect.searchParams.set('scope', 'identify');
    redirect.searchParams.set('state', state);
    return Response.redirect(redirect.toString(), 302);
  }

  if (url.pathname.endsWith('/logout')) {
    const headers = new Headers();
    headers.set('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    headers.set('Location', '/admin.html');
    return new Response(null, { status: 302, headers });
  }

  if (url.pathname.endsWith('/me')) {
    const payload = verifySessionCookie(request.headers.get('cookie'), config.sessionSecret);
    if (!payload) {
      return jsonResponse({ ok: false, configured: isConfigured(config) });
    }
    const [userId, username] = payload.split(':');
    return jsonResponse({ ok: true, configured: true, userId, username });
  }

  return new Response('Not found', { status: 404 });
}
