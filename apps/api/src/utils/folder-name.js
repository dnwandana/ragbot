import joi from "joi"

/** Name of the unique index on sibling folder names. The index ignores case. */
export const SIBLING_INDEX = "dataset_folders_sibling_name"

/** Joi rule for one folder name. It matches the dataset_folders_name_valid CHECK constraint. */
export const folderNameSchema = joi
  .string()
  .trim()
  .min(1)
  .max(255)
  .pattern(/^[^/]+$/)
  .invalid(".", "..")
  .messages({
    "string.pattern.base": "Folder name must not contain /",
    "any.invalid": "Folder name must not be . or ..",
  })

/**
 * Returns the 409 message for a duplicate folder name.
 *
 * @param {string} name - Folder name that the user typed
 * @param {string} containerName - Name of the parent folder, or the dataset name at the root
 * @returns {string} The conflict message
 */
export const conflictMessage = (name, containerName) =>
  `A folder named "${name}" already exists in "${containerName}".`
