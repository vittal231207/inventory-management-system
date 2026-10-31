const DEFAULT_BASE_URL = '/api/v1'

export class ApiError extends Error {
  constructor({ status, code, message, fieldErrors = {}, requestId }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.requestId = requestId
  }
}

let accessToken = null
const ACCESS_TOKEN_KEY = 'stockroom-access-token'
export const tokenStore = {
  get() { if (accessToken) return accessToken; try { accessToken = globalThis.sessionStorage?.getItem(ACCESS_TOKEN_KEY) || null } catch { accessToken = null } return accessToken },
  set(token) { accessToken = token; try { globalThis.sessionStorage?.setItem(ACCESS_TOKEN_KEY, token) } catch { /* memory-only fallback */ } },
  clear() { accessToken = null; try { globalThis.sessionStorage?.removeItem(ACCESS_TOKEN_KEY) } catch { /* memory-only fallback */ } },
}

export function createHttpClient({ baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL, fetchImpl = fetch } = {}) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  return async function request(path, options = {}) {
    const headers = new Headers(options.headers || {})
    headers.set('Accept', 'application/json')
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    const token = tokenStore.get()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    let response
    try {
      response = await fetchImpl(`${normalizedBaseUrl}${path}`, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
    } catch (error) {
      throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: error.message || 'The API could not be reached.' })
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) {
      const problem = payload || {}
      throw new ApiError({ status: response.status, code: problem.code || 'REQUEST_FAILED', message: problem.detail || problem.title || 'The request failed.', fieldErrors: problem.errors || {}, requestId: problem.requestId })
    }
    return payload
  }
}
