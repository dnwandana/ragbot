/**
 * Renders a tabular profile JSON into markdown for the embedding pipeline.
 */

/** Escapes a cell value so a pipe character does not break the markdown table. */
const escapeCell = (value) => String(value ?? "").replaceAll("|", "\\|")

/**
 * Renders the profile of one tabular file as markdown.
 *
 * @param {object} profile - The profile JSON from the sandbox profiling run.
 * @param {string} fileName - The original file name, used in the title.
 * @returns {string} Markdown with one section per sheet.
 */
export const renderProfileMarkdown = (profile, fileName) => {
  const lines = [`# Data file: ${fileName} (${profile.format})`, ""]
  if (profile.truncated) {
    lines.push("_The profile was truncated to fit the size cap._", "")
  }
  for (const sheet of profile.sheets) {
    lines.push(`## Sheet: ${sheet.name} — ${sheet.rows} rows`, "")
    lines.push("| column | dtype | non-null | unique | range | sample values |")
    lines.push("|---|---|---|---|---|---|")
    for (const col of sheet.columns) {
      const range = col.min === null ? "" : `${escapeCell(col.min)} – ${escapeCell(col.max)}`
      const samples = col.sample_values.map(escapeCell).join(", ")
      lines.push(
        `| ${escapeCell(col.name)} | ${col.dtype} | ${col.non_null} | ${col.unique} | ${range} | ${samples} |`,
      )
    }
    lines.push("")
  }
  return lines.join("\n")
}
