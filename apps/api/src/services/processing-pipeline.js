import * as datasetFileModel from "../models/dataset-files.js"
import * as chunkModel from "../models/dataset-file-chunks.js"
import * as textSplitter from "./text-splitter.js"
import * as openrouterService from "./openrouter.js"
import * as questionGenerator from "./question-generator.js"
import * as questionModel from "../models/dataset-file-questions.js"

/**
 * Runs the full RAG processing pipeline for a dataset file.
 *
 * Splits markdown into chunks, generates embeddings in batches via OpenRouter,
 * replaces the file's dataset_file_chunks, generates exploration questions and stores
 * them in dataset_file_questions (replacing any prior questions), and marks the file
 * 'completed'. File metadata is left untouched. Throws on any failure so the caller
 * can let BullMQ retry the parent job.
 *
 * @param {Object} params
 * @param {string} params.datasetFileId - UUID of the dataset_files record
 * @param {string} params.markdownContent - Parsed markdown content to process
 * @param {Object} params.dataset - Dataset record with chunk_size, chunk_overlap, embedding_model
 * @returns {Promise<void>}
 * @throws {Error} If text splitting, embedding, DB write, or question generation fails
 */
export const runProcessingPipeline = async ({ datasetFileId, markdownContent, dataset }) => {
  const chunks = await textSplitter.splitText(
    markdownContent,
    dataset.chunk_size,
    dataset.chunk_overlap,
  )

  if (!chunks.length) {
    await chunkModel.deleteByFileId(datasetFileId)
    await questionModel.deleteByFileId(datasetFileId)
    await datasetFileModel.update(datasetFileId, {
      status: "completed",
      chunk_count: 0,
      updated_at: new Date(),
    })
    return
  }

  const embeddings = await openrouterService.embedBatch(chunks, dataset.embedding_model)

  await chunkModel.deleteByFileId(datasetFileId)
  await chunkModel.bulkInsert(
    chunks.map((content, i) => ({
      id: crypto.randomUUID(),
      dataset_file_id: datasetFileId,
      content,
      chunk_index: i,
      embedding: embeddings[i],
    })),
  )

  const questions = await questionGenerator.generateQuestions(markdownContent)
  await questionModel.deleteByFileId(datasetFileId)
  await questionModel.bulkInsert(
    questions.map((question) => ({
      id: crypto.randomUUID(),
      dataset_file_id: datasetFileId,
      question,
    })),
  )

  await datasetFileModel.update(datasetFileId, {
    status: "completed",
    chunk_count: chunks.length,
    updated_at: new Date(),
  })
}
