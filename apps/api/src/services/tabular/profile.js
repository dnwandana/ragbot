/**
 * Profiles one tabular dataset file through the sandbox.
 *
 * The API owns the profiling code (profile-script.py); the model never
 * supplies it. A failed profiling run throws so the worker marks the
 * file failed through its normal failure path.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { executeCode } from "../sandbox.js"
import { getObjectBuffer } from "../storage.js"
import { renderProfileMarkdown } from "./profile-markdown.js"

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "profile-script.py")

/** The profiling script source, read once at module load. */
const PROFILE_SCRIPT = readFileSync(scriptPath, "utf8")

/**
 * Downloads a tabular file, profiles it in the sandbox, and renders markdown.
 *
 * @param {Object} datasetFile - The dataset_files row (needs filename and storage_path)
 * @returns {Promise<{ profile: Object, markdown: string }>} Profile JSON and its markdown
 * @throws {Error} If the sandbox run fails or stdout is not valid profile JSON
 */
export const profileTabularFile = async (datasetFile) => {
  const content = await getObjectBuffer(datasetFile.storage_path)
  const extension = path.extname(datasetFile.filename).slice(1).toLowerCase()

  const result = await executeCode({
    code: PROFILE_SCRIPT,
    files: [{ name: `data.${extension}`, content }],
  })

  if (!result.ok) {
    throw new Error(`Tabular profiling failed (${result.error}): ${result.stderr}`)
  }

  const profile = JSON.parse(result.stdout)
  return { profile, markdown: renderProfileMarkdown(profile, datasetFile.filename) }
}
