import db from "../config/database.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as chunkModel from "../models/dataset-file-chunks.js"
import * as textSplitter from "./text-splitter.js"
import * as openrouterService from "./openrouter.js"
import * as questionGenerator from "./question-generator.js"
import * as questionModel from "../models/dataset-file-questions.js"

/**
 * Runs the full RAG processing pipeline for a dataset file.
 *
 * Splits markdown into chunks, generates embeddings in batches via OpenRouter, and
 * generates exploration questions. Then one short transaction replaces the file's
 * dataset_file_chunks and dataset_file_questions and marks the file 'completed'. The
 * transaction locks the file row first, so it and a file delete run one after the other.
 * File metadata is left untouched. Throws on any failure so the caller can let BullMQ
 * retry the parent job.
 *
 * @param {Object} params
 * @param {string} params.datasetFileId - UUID of the dataset_files record
 * @param {string} params.markdownContent - Parsed markdown content to process
 * @param {Object} params.dataset - Dataset record with chunk_size, chunk_overlap, embedding_model
 * @returns {Promise<boolean>} false when the file was deleted, so nothing was written
 * @throws {Error} If text splitting, embedding, DB write, or question generation fails
 */
export const runProcessingPipeline = async ({ datasetFileId, markdownContent, dataset }) => {
  const chunks = await textSplitter.splitText(
    markdownContent,
    dataset.chunk_size,
    dataset.chunk_overlap,
  )
  const embeddings = chunks.length
    ? await openrouterService.embedBatch(chunks, dataset.embedding_model)
    : []
  const questions = chunks.length ? await questionGenerator.generateQuestions(markdownContent) : []

  return db.transaction(async (trx) => {
    // FOR UPDATE waits for a running delete. After the wait, a deleted row no longer matches.
    const live = await trx("dataset_files")
      .select("id")
      .where({ id: datasetFileId })
      .whereNull("deleted_at")
      .forUpdate()
      .first()
    if (!live) return false

    await chunkModel.deleteByFileId(datasetFileId, trx)
    await chunkModel.bulkInsert(
      chunks.map((content, i) => ({
        id: crypto.randomUUID(),
        dataset_file_id: datasetFileId,
        content,
        chunk_index: i,
        embedding: embeddings[i],
      })),
      trx,
    )
    await questionModel.deleteByFileId(datasetFileId, trx)
    await questionModel.bulkInsert(
      questions.map((question) => ({
        id: crypto.randomUUID(),
        dataset_file_id: datasetFileId,
        question,
      })),
      trx,
    )
    await datasetFileModel.update(
      datasetFileId,
      { status: "completed", chunk_count: chunks.length, updated_at: new Date() },
      trx,
    )
    return true
  })
}
