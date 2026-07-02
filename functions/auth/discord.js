export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // derive redirect target but sanitize to avoid open-redirects
  let redirectTarget = url.searchParams.get('state') || url.searchParams.get('redirect') || '/admin.html';
  try {
    // only allow same-origin paths (must start with single '/') and forbid full URLs
    if (!redirectTarget || typeof redirectTarget !== 'string') redirectTarget = '/admin.html';
    // disallow protocol or host in redirect
    if (redirectTarget.startsWith('http:') || redirectTarget.startsWith('https:') || redirectTarget.startsWith('\\')) {
      redirectTarget = '/admin.html';
    }
    // only allow relative paths beginning with a single '/'
    if (!redirectTarget.startsWith('/') || redirectTarget.startsWith('//') || redirectTarget.includes(':')) {
      redirectTarget = '/admin.html';
    }
  } catch (e) {
    redirectTarget = '/admin.html';
  }
  const code = url.searchParams.get('code');
  const clientId = env.DISCORD_CLIENT_ID || env.DISCORD_CLIENTID;
  const clientSecret = env.DISCORD_CLIENT_SECRET || env.DISCORD_CLIENTSECRET;
  const allowedUserId = env.DISCORD_ALLOWED_USER_ID || env.DISCORD_ALLOWED_USER;
  const redirectUri = env.DISCORD_REDIRECT_URI || `${url.origin}/auth/discord`;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Discord auth is not configured yet. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in Cloudflare Pages project settings.'
    }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  if (!code) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify',
      state: redirectTarget
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
        'cache-control': 'no-store'
      }
    });
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !tokenData.access_token) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to exchange Discord code.', details: tokenData }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const userData = await userResponse.json().catch(() => ({}));

  if (!userResponse.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load Discord profile.', details: userData }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  if (allowedUserId && String(userData.id) !== String(allowedUserId)) {
    return new Response(JSON.stringify({ ok: false, error: 'Discord account is not authorized for this admin panel.' }), {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  const avatarUrl = userData.avatar
    ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(userData.discriminator || '0') % 5}.png`;

  const sessionObj = {
    id: userData.id,
    username: userData.username,
    globalName: userData.global_name || userData.username,
    avatarUrl,
    expiresAt
  };

  let sessionId = null;
  try {
    // prefer storing session server-side in KV (binding name: SESSIONS)
    if (env.SESSIONS && typeof env.SESSIONS.put === 'function') {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2, 10));
      await env.SESSIONS.put(`sess:${sessionId}`, JSON.stringify(sessionObj), { expirationTtl: 28800 });
    }
  } catch (e) {
    // KV unavailable — fall back to embedding session object in HttpOnly cookie
    sessionId = null;
  }

  let sessionCookie;
  if (sessionId) {
    sessionCookie = `blossom_session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
  } else {
    // fallback — embed opaque session object (less ideal)
    sessionCookie = `blossom_session=${encodeURIComponent(JSON.stringify(sessionObj))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
  }

  // Public (non-HttpOnly) cookie contains minimal, non-sensitive info for client-side UI
  const publicObj = { expiresAt, username: userData.username, avatarUrl };
  const publicCookie = `blossom_discord_public=${encodeURIComponent(JSON.stringify(publicObj))}; Path=/; Secure; SameSite=Lax; Max-Age=28800`;

  const setCookies = [sessionCookie, publicCookie];

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTarget,
      'Set-Cookie': setCookies,
      'cache-control': 'no-store'
    }
  });
}
