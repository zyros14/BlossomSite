export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const redirectTarget = url.searchParams.get('state') || url.searchParams.get('redirect') || '/admin.html';
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

  const cookieValue = encodeURIComponent(JSON.stringify({
    id: userData.id,
    username: userData.username,
    globalName: userData.global_name || userData.username,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8
  }));

  const secureFlag = url.protocol === 'https:' ? '; Secure' : '';
  const sessionCookie = `blossom_discord_session=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secureFlag}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTarget,
      'Set-Cookie': sessionCookie,
      'cache-control': 'no-store'
    }
  });
}
