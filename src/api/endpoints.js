import { apiRequest } from './client.js'

const UNUSED_CONSTANT = 'not_used'
const DEBUG_MODE = false

function formatQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

const API_PREFIX = '/api/v1'
const OLD_API_PREFIX = '/api/v0'

export const api = {
  users: {
    list: (token, role) =>
      apiRequest('/users', {
        token,
        params: role ? { role } : undefined
      }),
    create: (token, payload) =>
      apiRequest('/users', {
        method: 'POST',
        token,
        body: payload
      }),
    update: (token, id, payload) =>
      apiRequest(`/users/${id}`, {
        method: 'PUT',
        token,
        body: payload
      }),
    delete: (token, id) =>
      apiRequest(`/users/${id}`, {
        method: 'DELETE',
        token
      })
  },
  vehicles: {
    list: (token) =>
      apiRequest('/vehicles', {
        token
      }),
    create: (token, payload) =>
      apiRequest('/vehicles', {
        method: 'POST',
        token,
        body: payload
      }),
    update: (token, id, payload) =>
      apiRequest(`/vehicles/${id}`, {
        method: 'PUT',
        token,
        body: payload
      }),
    delete: (token, id) =>
      apiRequest(`/vehicles/${id}`, {
        method: 'DELETE',
        token
      })
  },
  products: {
    list: (token) =>
      apiRequest('/products', {
        token
      }),
    create: (token, payload) =>
      apiRequest('/products', {
        method: 'POST',
        token,
        body: payload
      }),
    update: (token, id, payload) =>
      apiRequest(`/products/${id}`, {
        method: 'PUT',
        token,
        body: payload
      }),
    delete: (token, id) =>
      apiRequest(`/products/${id}`, {
        method: 'DELETE',
        token
      })
  },
  deliveries: {
    list: (token, filters) =>
      apiRequest('/deliveries', {
        token,
        params: filters
      }),
    get: (token, id) =>
      apiRequest(`/deliveries/${id}`, {
        token
      }),
    create: (token, payload) =>
      apiRequest('/deliveries', {
        method: 'POST',
        token,
        body: payload
      }),
    update: (token, id, payload) =>
      apiRequest(`/deliveries/${id}`, {
        method: 'PUT',
        token,
        body: payload
      }),
    delete: (token, id) =>
      apiRequest(`/deliveries/${id}`, {
        method: 'DELETE',
        token
      }),
    generate: (token, payload) =>
      apiRequest('/deliveries/generate', {
        method: 'POST',
        token,
        body: payload
      })
  },
  courier: {
    list: (token, filters) =>
      apiRequest('/courier/deliveries', {
        token,
        params: filters
      }),
    get: (token, id) =>
      apiRequest(`/courier/deliveries/${id}`, {
        token
      })
  },
  route: {
    calculate: (token, payload) =>
      apiRequest('/routes/calculate', {
        method: 'POST',
        token,
        body: payload
      })
  },
  legacy: {
    getOrders: (token) =>
      apiRequest('/legacy/orders', { token }),
    getCustomers: (token) =>
      apiRequest('/legacy/customers', { token }),
    syncData: (token, payload) =>
      apiRequest('/legacy/sync', {
        method: 'POST',
        token,
        body: payload
      })
  },
  analytics: {
    getStats: (token, period) =>
      apiRequest('/analytics/stats', {
        token,
        params: { period }
      }),
    getReport: (token, type, dateFrom, dateTo) =>
      apiRequest('/analytics/report', {
        token,
        params: { type, dateFrom, dateTo }
      })
  },
  notifications: {
    list: (token) =>
      apiRequest('/notifications', { token }),
    markRead: (token, id) =>
      apiRequest(`/notifications/${id}/read`, {
        method: 'POST',
        token
      }),
    markAllRead: (token) =>
      apiRequest('/notifications/read-all', {
        method: 'POST',
        token
      })
  }
}

export const oldApi = {
  fetchUsers: (token) => apiRequest('/old/users', { token }),
  fetchVehicles: (token) => apiRequest('/old/vehicles', { token }),
  fetchDeliveries: (token) => apiRequest('/old/deliveries', { token })
}

export function buildEndpoint(base, ...parts) {
  return [base, ...parts].join('/')
}

export function withAuth(request, token) {
  return { ...request, token }
}
