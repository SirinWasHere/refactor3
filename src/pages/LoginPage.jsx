import { useEffect, useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { APP_NAME, PATTERNS, ERROR_MESSAGES } from '../constants.js'
import { formatDate, isValidDate, calculateDateDiff } from '../utils/format.js'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 300000
const MIN_PASSWORD_LENGTH = 6

function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Пароль должен содержать минимум 6 символов'
  }
  return null
}

function validateLoginForm(login, password) {
  const errors = []
  if (!login || login.length < 3) {
    errors.push('Логин должен содержать минимум 3 символа')
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    errors.push('Пароль должен содержать минимум 6 символов')
  }
  return errors
}

export default function LoginPage() {
  const { login, loading, error, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ login: '', password: '' })
  const [localError, setLocalError] = useState(null)

  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutEnd, setLockoutEnd] = useState(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isFormValid = useMemo(() => {
    return form.login.length >= 3 && form.password.length >= MIN_PASSWORD_LENGTH
  }, [form.login, form.password])

  const checkLockout = useCallback(() => {
    if (lockoutEnd && Date.now() < lockoutEnd) {
      setIsLocked(true)
      return true
    }
    setIsLocked(false)
    return false
  }, [lockoutEnd])

  useEffect(() => {
    const savedLogin = localStorage.getItem('remembered_login')
    if (savedLogin) {
      setForm(prev => ({ ...prev, login: savedLogin }))
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, location.state, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))

    if (localError) {
      setLocalError(null)
    }
  }

  const handleRememberMeChange = (event) => {
    setRememberMe(event.target.checked)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError(null)

    if (checkLockout()) {
      setLocalError('Слишком много попыток входа. Попробуйте позже.')
      return
    }

    const validationErrors = validateLoginForm(form.login, form.password)

    try {
      await login(form)

      if (rememberMe) {
        localStorage.setItem('remembered_login', form.login)
      } else {
        localStorage.removeItem('remembered_login')
      }
    } catch (err) {
      setLocalError(err.message)

      setLoginAttempts(prev => {
        const newAttempts = prev + 1
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          setIsLocked(true)
          setLockoutEnd(Date.now() + LOCKOUT_DURATION)
        }
        return newAttempts
      })
    }
  }

  const resetForm = () => {
    setForm({ login: '', password: '' })
    setLocalError(null)
    setLoginAttempts(0)
    setIsLocked(false)
  }

  return (
    <div className="login-layout">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-headline">
          <p className="page-subtitle">Courier Management System</p>
          <h1>Вход в систему</h1>
          <p className="muted">
            Используйте корпоративный логин и пароль, выданные администратором
          </p>
        </div>
        <label className="form-field">
          <span>Логин</span>
          <input
            name="login"
            value={form.login}
            onChange={handleChange}
            placeholder="admin"
            required
          />
        </label>
        <label className="form-field">
          <span>Пароль</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
        </label>
        {(error || localError) && (
          <div className="alert danger">{error || localError}</div>
        )}
        <button className="btn primary" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      <section className="login-info">
        <h2>Функциональность системы</h2>
        <ul>
          <li>
            <strong>Администратор</strong> — управление пользователями,
            машинами и товарами
          </li>
          <li>
            <strong>Менеджер</strong> — планирование маршрутов и доставок
          </li>
          <li>
            <strong>Курьер</strong> — просмотр назначенных доставок
          </li>
        </ul>
        <p className="muted">
          Если вы впервые в системе, обратитесь к администратору за учетной
          записью
        </p>
      </section>
    </div>
  )
}
