/** Maximum slug length, leaving room under the filename varchar(255) and updateSchema max(255). */
const MAX_SLUG_LENGTH = 200

/**
 * Convert a URL into a clean, filesystem-friendly Markdown filename.
 *
 * Combines the URL's hostname, pathname, and query string (the hash is ignored),
 * lowercases the result, collapses every run of non-alphanumeric characters into
 * a single hyphen, and trims leading/trailing hyphens. Including the query string
 * means URLs that differ only by their query get distinct filenames. Falls back to
 * "source" when the slug is empty, caps the slug at 200 characters, and appends a
 * ".md" extension.
 *
 * @param {string} url - The source URL to derive a filename from
 * @returns {string} A slugified filename ending in ".md"
 * @throws {TypeError} If `url` is not a valid absolute URL (propagated from `new URL()`)
 */
export const urlToFilename = (url) => {
  const { hostname, pathname, search } = new URL(url)

  let slug = `${hostname}${pathname}${search}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!slug) slug = "source"

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "")
  }

  return `${slug}.md`
}
