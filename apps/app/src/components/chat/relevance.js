/**
 * Maps a cosine relevance score to the label the UI shows.
 * @param {number} score - Relevance score between 0 and 1.
 * @returns {"High"|"Med"|"Low"}
 */
export const relevanceLabel = (score) => (score >= 0.85 ? "High" : score >= 0.6 ? "Med" : "Low")
