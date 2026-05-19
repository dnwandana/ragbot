const BASE = "https://api.firecrawl.dev/v2"

/**
 * Scrape a URL and return its content as markdown via Firecrawl.
 *
 * @param {string} url - The URL to scrape
 * @returns {Promise<string>} Page content as markdown
 * @throws {Error} If the API returns a non-2xx status or reports a scrape failure
 */
export const scrapeUrl = async (url) => {
  const res = await fetch(`${BASE}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  })
  if (!res.ok) throw new Error(`Firecrawl scrape error: ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(`Firecrawl scrape failed: ${json.error}`)
  return json.data.markdown
}
