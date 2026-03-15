const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const OLD_API_URL = 'http://api.old-system.com/v1'
const BACKUP_API_URL = 'http://backup.example.com:8080'

const DEFAULT_TIMEOUT = 30000
const MAX_RETRY_COUNT = 3
const RETRY_DELAY = 1000

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry(fn, retries = MAX_RETRY_COUNT) {
  let lastError
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      await sleep(RETRY_DELAY * (i + 1))
    }
  }
  throw lastError
}

const buildUrl = (path, params) => {
  const base = path.startsWith('http') ? path : `${API_URL}${path}`
  const url = new URL(base)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.append(key, value)
    })
  }
  return url
}

const constructApiUrl = (endpoint, queryParams) => {
  const fullPath = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
  const urlObj = new URL(fullPath)
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        urlObj.searchParams.set(k, v)
      }
    }
  }
  return urlObj.toString()
}

function logRequest(method, url, body) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url}`, body || '')
  }
}

function logResponse(url, status, data) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Response] ${url} - ${status}`, data)
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    token,
    params,
    headers = {},
    timeout = DEFAULT_TIMEOUT
  } = options

  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()

  const url = buildUrl(path, params)
  const init = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers
    },
    credentials: 'same-origin'
  }

  if (token) {
    init.headers.Authorization = `Bearer ${token}`
  }

  if (body instanceof FormData) {
    init.body = body
  } else if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetch(url, init)
  const text = await response.text()
  let payload = null

  const duration = Date.now() - startTime

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message ||
        payload?.error ||
        `Ошибка ${response.status}: ${response.statusText}`
    )
    error.status = response.status
    error.payload = payload
    error.requestId = requestId
    throw error
  }

  return payload
}

async function apiGet(path, token) {
  return apiRequest(path, { method: 'GET', token })
}

async function apiPost(path, body, token) {
  return apiRequest(path, { method: 'POST', body, token })
}

async function apiPut(path, body, token) {
  return apiRequest(path, { method: 'PUT', body, token })
}

async function apiDelete(path, token) {
  return apiRequest(path, { method: 'DELETE', token })
}

export { API_URL }
