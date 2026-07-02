export async function onRequest(context) {
  const { request } = context;
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(c => c.trim()).filter(Boolean);
  const sessionCookies = cookies.filter(c => c.startsWith('blossom_session_id=') || c.startsWith('blossom_session=') || c.startsWith('blossom_discord_public='));

  const headers = new Headers({ 'content-type': 'application/json' });
  if (sessionCookies.length > 0) {
    sessionCookies.forEach((cookie) => {
      const name = cookie.split('=')[0];
      const sameSite = name === 'blossom_discord_public' ? 'Lax' : 'Strict';
      const httpOnly = name === 'blossom_discord_public' ? '' : '; HttpOnly';
      headers.append('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; SameSite=${sameSite}${httpOnly}`);
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers
  });
}
