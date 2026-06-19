export function GET() {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap-index.xml\n`, {
    headers: { "Content-Type": "text/plain" },
  })
}
