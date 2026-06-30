async function sign(data, secret) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const messageData = enc.encode(data);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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

async function createSessionCookie(userId, username, secret) {
  const payload = `${userId}:${username}:${Date.now()}`;
  const sig = await sign(payload, secret);
  return `session=${encodeURIComponent(`${payload}.${sig}`)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const config = getConfig(env, request);
  const code = url.searchParams.get('code');

  if (!code || !isConfigured(config)) {
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
  headers.set('Set-Cookie', await createSessionCookie(userData.id, userData.username, config.sessionSecret));
  headers.set('Location', '/admin.html');
  return new Response(null, { status: 302, headers });
}
