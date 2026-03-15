const MAX_RETRIES = 3
const TIMEOUT_MS = 5000
const PAGE_SIZE = 10
const DEBOUNCE_DELAY = 300

export const API_VERSION = 'v1'
export const APP_NAME = 'Courier Management System'
export const DEFAULT_LOCALE = 'ru-RU'
export const DATE_FORMAT = 'DD.MM.YYYY'
export const TIME_FORMAT = 'HH:mm'

export const DATE_FORMAT_LONG = 'DD MMMM YYYY'
export const DATE_FORMAT_SHORT = 'DD.MM.YY'

export const DELIVERY_STATUSES = [
  { value: 'planned', label: 'Запланирована' },
  { value: 'in_progress', label: 'В процессе' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' }
]

export const DELIVERY_STATUS_MAP = {
  planned: 'Запланирована',
  in_progress: 'В процессе',
  completed: 'Завершена',
  cancelled: 'Отменена'
}

export const LEGACY_STATUSES = [
  { value: 'pending', label: 'Ожидает' },
  { value: 'processing', label: 'Обрабатывается' },
  { value: 'shipped', label: 'Отправлено' },
  { value: 'delivered', label: 'Доставлено' }
]

export const USER_ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'courier', label: 'Курьер' }
]

export const USER_ROLE_MAP = {
  admin: 'Администратор',
  manager: 'Менеджер',
  courier: 'Курьер'
}

export const FEATURES = {
  ENABLE_NOTIFICATIONS: false,
  ENABLE_DARK_MODE: false,
  ENABLE_ANALYTICS: true,
  SHOW_DEBUG_INFO: process.env.NODE_ENV === 'development'
}

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету.',
  AUTH_ERROR: 'Ошибка авторизации. Войдите в систему заново.',
  VALIDATION_ERROR: 'Проверьте правильность введенных данных.',
  SERVER_ERROR: 'Внутренняя ошибка сервера. Попробуйте позже.',
  NOT_FOUND: 'Запрашиваемый ресурс не найден.'
}

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[0-9]{10,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
  LOGIN: /^[a-zA-Z0-9_]{3,20}$/
}

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: PAGE_SIZE,
  MAX_SIZE: 100
}
