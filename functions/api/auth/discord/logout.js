export async function onRequest() {
  const headers = new Headers();
  headers.set('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  headers.set('Location', '/admin.html');
  return new Response(null, { status: 302, headers });
}
