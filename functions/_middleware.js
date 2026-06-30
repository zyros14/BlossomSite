export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    return Response.redirect(new URL('/admin.html', request.url), 302);
  }

  return next();
}
