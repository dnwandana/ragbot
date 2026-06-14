import { message } from "ant-design-vue"
import { clearUserData } from "./storage"
import { useAuthStore } from "@/stores/auth"
import router from "@/router"

export const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"

const DEFAULT_TIMEOUT = 10000

// Auth endpoints that must never trigger the refresh-retry logic
const NO_RETRY_ENDPOINTS = ["/auth/signin", "/auth/signup", "/auth/refresh"]

// Stores access `error.response?.data?.message` in catch blocks (see auth store).
// We attach a `response` property so existing store error handling works
// without any changes.
export class HttpError extends Error {
  constructor(status, data, messageText) {
    super(messageText)
    this.name = "HttpError"
    this.status = status
    this.data = data
    this.response = { data, status }
  }
}

// Single shared refresh promise so concurrent 401s trigger only one refresh.
let refreshPromise = null

/**
 * Refresh the auth tokens at most once for any number of concurrent callers.
 * All callers await the same in-flight promise, which is cleared once it settles.
 *
 * @returns {Promise<void>}
 * @throws {HttpError} When the refresh request fails.
 */
function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${baseURL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new HttpError(response.status, errorData, errorData.message || "Refresh failed")
      }
      await response.json().catch(() => ({}))
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/**
 * Run a single shared refresh, then replay the original request once. On
 * refresh failure, clear local auth state and redirect to the login page.
 *
 * @param {Object} originalOptions - Snapshot of the original request to replay.
 * @returns {Promise<{data: any, status: number}>}
 * @throws {HttpError}
 */
async function handleRefresh(originalOptions) {
  try {
    await refreshOnce()
    return send(originalOptions.method, originalOptions.url, { ...originalOptions, _retry: true })
  } catch (error) {
    clearUserData()
    useAuthStore().user = null
    router.push("/login")
    throw error
  }
}

function buildURL(url, params) {
  let fullURL = `${baseURL}${url}`
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) searchParams.append(key, value)
    })
    fullURL += `?${searchParams.toString()}`
  }
  return fullURL
}

async function send(method, url, options = {}) {
  const {
    body,
    headers: customHeaders = {},
    params,
    timeout = DEFAULT_TIMEOUT,
    _retry = false,
  } = options

  // AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const headers = { ...customHeaders }

  const fullURL = buildURL(url, params)

  try {
    const fetchOptions = { method, headers, signal: controller.signal }
    fetchOptions.credentials = "include"
    if (body instanceof FormData) {
      fetchOptions.body = body
      // Do NOT set Content-Type — browser sets it automatically with the multipart boundary
    } else if (body) {
      headers["Content-Type"] = "application/json"
      fetchOptions.body = JSON.stringify(body)
    }
    const response = await fetch(fullURL, fetchOptions)

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || response.statusText || "An error occurred"

      // 401 handling — attempt token refresh (unless excluded endpoint or already retried)
      if (
        response.status === 401 &&
        !_retry &&
        !(body instanceof FormData) &&
        !NO_RETRY_ENDPOINTS.some((ep) => url.includes(ep))
      ) {
        return handleRefresh({
          method,
          url,
          body,
          headers: customHeaders,
          params,
          timeout,
          silent: options.silent,
        })
      }

      // Show error toast for non-401 errors unless caller opts out with { silent: true }
      if (response.status !== 401 && !options.silent) {
        message.error(errorMessage)
      }

      throw new HttpError(response.status, errorData, errorMessage)
    }

    // Return axios-compatible response shape: { data, status }
    // Stores access `response.data` and `response.data.data` — this preserves that.
    const data = await response.json()
    return { data, status: response.status }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === "AbortError") {
      throw new HttpError(0, null, "Request timed out")
    }

    // Re-throw HttpError and other errors as-is
    throw error
  }
}

export const request = {
  send,

  /**
   * @param {string} url
   * @param {{ params?: object, headers?: object, timeout?: number }} [options={}]
   * @returns {Promise<{data: any, status: number}>}
   * @throws {HttpError}
   */
  get(url, options = {}) {
    return send("GET", url, options)
  },

  /**
   * @param {string} url
   * @param {object|FormData} body
   * @param {{ headers?: object, timeout?: number }} [options={}]
   * @returns {Promise<{data: any, status: number}>}
   * @throws {HttpError}
   */
  post(url, body, options = {}) {
    return send("POST", url, { body, ...options })
  },

  /**
   * @param {string} url
   * @param {object|FormData} body
   * @param {{ headers?: object, timeout?: number, silent?: boolean }} [options={}]
   * @returns {Promise<{data: any, status: number}>}
   * @throws {HttpError}
   */
  put(url, body, options = {}) {
    return send("PUT", url, { body, ...options })
  },

  /**
   * @param {string} url
   * @param {object|FormData} body
   * @param {{ headers?: object, timeout?: number, silent?: boolean }} [options={}]
   * @returns {Promise<{data: any, status: number}>}
   * @throws {HttpError}
   */
  patch(url, body, options = {}) {
    return send("PATCH", url, { body, ...options })
  },

  del(url, options = {}) {
    return send("DELETE", url, { ...options })
  },
}
