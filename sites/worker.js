const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
  if (pathname === '/metrics.json') headers.set('Cache-Control', 'no-store')
  else if (pathname.startsWith('/assets/')) headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  else headers.set('Cache-Control', 'no-cache')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname
    const assetUrl = new URL(pathname, request.url)
    let response = await env.ASSETS.fetch(new Request(assetUrl, request))

    if (response.status === 404 && request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
      response = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
      return withHeaders(response, '/index.html')
    }

    return withHeaders(response, pathname)
  },
}
