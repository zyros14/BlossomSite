export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api/auth/discord/login') {
    return Response.redirect(new URL('/admin.html?discord=disabled', request.url), 302);
  }

  if (url.pathname === '/api/auth/discord/callback') {
    return Response.redirect(new URL('/admin.html?discord=callback', request.url), 302);
  }

  return next();
}
