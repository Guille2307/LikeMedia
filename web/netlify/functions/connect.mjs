const API_ORIGIN = 'https://api-production-5c96.up.railway.app';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'host',
  'transfer-encoding',
]);

export default async function handler(request) {
  const incoming = new URL(request.url);
  const upstreamPath = incoming.pathname
    .replace(/^\/\.netlify\/functions\/connect/, '')
    .replace(/^\/connect/, '')
    .replace(/^\/api/, '') || '/';
  const target = new URL(`/api${upstreamPath}`, API_ORIGIN);
  target.search = incoming.search;

  const headers = new Headers();
  for (const [name, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && ['authorization', 'content-type', 'accept'].includes(name.toLowerCase())) {
      headers.set(name, value);
    }
  }

  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();

  try {
    const upstream = await fetch(target, init);
    // Buffer the small JSON API response before returning it. Passing the
    // upstream stream through directly can leave some browsers waiting for
    // the stream to close even though Railway has already completed it.
    const payload = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    for (const [name, value] of upstream.headers.entries()) {
      if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name.toLowerCase() !== 'set-cookie') responseHeaders.set(name, value);
    }
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(payload, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: 'No se pudo conectar con el servidor.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
