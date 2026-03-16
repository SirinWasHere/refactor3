const MAX_RETRIES = 3
const TIMEOUT_MS = 5000
const PAGE_SIZE = 10
const DEBOUNCE_DELAY = 300

export const AUTO_REFRESH_INTERVAL = 60000
export const MAX_DELIVERIES_DISPLAY = 50
export const NOTIFICATION_SOUND = '/sounds/notification.mp3'

export const REFRESH_INTERVAL = 30000
export const MAX_RECENT_ITEMS = 5
export const CHART_COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#F44336']

export const MAX_POINTS_PER_DELIVERY = 20
export const MAX_PRODUCTS_PER_POINT = 50
export const MIN_DELIVERY_WINDOW_HOURS = 2
export const DEFAULT_TIME_WINDOW = { start: '09:00', end: '18:00' }
export const MOSCOW_COORDS = { lat: 55.7558, lon: 37.6173 }
export const EARTH_RADIUS = 6371

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_DURATION = 300000
export const MIN_PASSWORD_LENGTH = 6
export const MIN_LOGIN_LENGTH = 3

export const MIN_LENGTH = 2
export const MIN_WEIGHT = 0.01
export const MAX_WEIGHT = 10000
export const MIN_DIMENSION = 0.1
export const MAX_DIMENSION = 500
export const CM_TO_M = 100


export const USERS_PER_PAGE = 10
export const MAX_USERS_DISPLAY = 100
export const CACHE_DURATION = 60000

export const LICENSE_PLATE_REGEX = /^[A-Z]\d{3}[A-Z]{2}\d{2,3}$/
export const MIN_WEIGHT_CAPACITY = 100
export const MAX_WEIGHT_CAPACITY = 50000
export const MIN_VOLUME_CAPACITY = 1
export const MAX_VOLUME_CAPACITY = 100


export const VEHICLE_TYPES = [
  { value: 'van', label: 'Фургон', maxWeight: 1500 },
  { value: 'truck', label: 'Грузовик', maxWeight: 10000 },
  { value: 'trailer', label: 'Прицеп', maxWeight: 20000 }
]


export const VEHICLE_STATUSES = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired'
}

export const USER_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  SYSTEM: 'system'
}

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
