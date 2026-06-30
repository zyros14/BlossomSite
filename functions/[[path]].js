export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  if (url.pathname === '/api/auth/discord/login') {
    const clientId = env.DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID';
    const clientSecret = env.DISCORD_CLIENT_SECRET || 'YOUR_DISCORD_CLIENT_SECRET';
    const redirectUri = env.DISCORD_REDIRECT_URI || `${url.origin}/api/auth/discord/callback`;

    if (!clientId || clientId === 'YOUR_DISCORD_CLIENT_ID' || !clientSecret || clientSecret === 'YOUR_DISCORD_CLIENT_SECRET') {
      return Response.redirect(new URL('/admin.html?discord=disabled', request.url), 302);
    }

    const state = Math.random().toString(36).slice(2);
    const redirect = new URL('https://discord.com/api/oauth2/authorize');
    redirect.searchParams.set('client_id', clientId);
    redirect.searchParams.set('redirect_uri', redirectUri);
    redirect.searchParams.set('response_type', 'code');
    redirect.searchParams.set('scope', 'identify');
    redirect.searchParams.set('state', state);
    return Response.redirect(redirect.toString(), 302);
  }

  if (url.pathname === '/api/auth/discord/callback') {
    return new Response('Discord callback placeholder', { status: 200 });
  }

  if (url.pathname === '/api/auth/discord/me') {
    return Response.json({ ok: false });
  }

  return new Response('Not found', { status: 404 });
}
