import { Globe, Youtube } from "lucide-vue-next"
import { isYouTubeUrl } from "@/utils/files"

/**
 * Ordered source detectors for the Add source "Link" field.
 * The field walks this list and the first `match` wins; the final `web`
 * entry matches everything, so a valid URL always resolves to one detector.
 * Add a future source (X, LinkedIn, Twitch) by inserting an entry before `web`.
 * @type {Array<{ key: string, label: string, icon: object, cueClass: string, cue: string, match: (url: string) => boolean }>}
 */
export const SOURCE_DETECTORS = [
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    cueClass: "source-cue--youtube",
    cue: "YouTube video — we'll use captions or transcribe the audio.",
    match: (url) => isYouTubeUrl(url),
  },
  {
    key: "web",
    label: "Web",
    icon: Globe,
    cueClass: "source-cue--web",
    cue: "Web page — we'll scrape and index its content.",
    match: () => true,
  },
]

/**
 * Resolve a URL to its source detector (first match wins; `web` is the fallback).
 * @param {string} url - The URL to classify.
 * @returns {{ key: string, label: string, icon: object, cueClass: string, cue: string, match: (url: string) => boolean }} The matching detector.
 */
export function detectSource(url) {
  return SOURCE_DETECTORS.find((d) => d.match(url)) ?? SOURCE_DETECTORS[SOURCE_DETECTORS.length - 1]
}
