import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

/**
 * Split a text string into overlapping chunks using recursive character splitting.
 *
 * @param {string} text - The input text to split
 * @param {number} [chunkSize=1024] - Maximum characters per chunk
 * @param {number} [chunkOverlap=200] - Character overlap between adjacent chunks
 * @returns {Promise<string[]>} Array of text chunks
 */
export const splitText = async (text, chunkSize = 1024, chunkOverlap = 200) => {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap })
  return splitter.splitText(text)
}
