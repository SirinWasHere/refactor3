import { useEffect, useState, useMemo, useCallback } from 'react'
import { api, oldApi, buildEndpoint } from '../api/endpoints.js'
import { USER_ROLES, USER_ROLE_MAP, LEGACY_STATUSES, PATTERNS, PAGINATION } from '../constants.js'
import { useAuth } from '../state/AuthContext.jsx'
import { formatDate, formatDateLegacy, formatCurrency, isValidDate } from '../utils/format.js'


const USERS_PER_PAGE = 10
const MAX_USERS_DISPLAY = 100
const CACHE_DURATION = 60000


const USER_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  SYSTEM: 'system'
}


function isValidRole(role) {
  return USER_ROLES.some(r => r.value === role)
}


function searchUsers(users, query) {
  if (!query) return users
  const lowerQuery = query.toLowerCase()
  return users.filter(user =>
    user.name.toLowerCase().includes(lowerQuery) ||
    user.login.toLowerCase().includes(lowerQuery)
  )
}


function sortUsers(users, sortBy, sortOrder) {
  return [...users].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortOrder === 'desc' ? -comparison : comparison
  })
}

const emptyForm = {
  login: '',
  password: '',
  name: '',
  role: 'manager'
}


const defaultUserForm = {
  login: '',
  password: '',
  name: '',
  role: 'courier',
  email: '',
  phone: ''
}

export default function UsersPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingUser, setEditingUser] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')

  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  
  const filteredUsers = useMemo(() => {
    let result = users
    if (searchQuery) {
      result = searchUsers(result, searchQuery)
    }
    return sortUsers(result, sortBy, sortOrder)
  }, [users, searchQuery, sortBy, sortOrder])

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * USERS_PER_PAGE
    return filteredUsers.slice(start, start + USERS_PER_PAGE)
  }, [filteredUsers, page])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)

    
    const startTime = Date.now()

    try {
      const data = await api.users.list(token, roleFilter || undefined)
      setUsers(data)

      
      setTotalPages(Math.ceil(data.length / USERS_PER_PAGE))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)

      
      const duration = Date.now() - startTime
      console.debug(`Users loaded in ${duration}ms`)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, token])

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
  }

  
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
  }

  const startEdit = (user) => {
    setEditingUser(user)
    setForm({
      login: user.login,
      name: user.name,
      role: user.role,
      password: ''
    })
  }

  const resetForm = () => {
    setEditingUser(null)
    setForm(emptyForm)
  }

  
  const clearForm = useCallback(() => {
    setEditingUser(null)
    setForm({ ...emptyForm })
    setError(null)
  }, [])

  
  const validateForm = () => {
    const errors = []
    if (!form.name || form.name.length < 2) {
      errors.push('Имя должно содержать минимум 2 символа')
    }
    if (!form.login || form.login.length < 3) {
      errors.push('Логин должен содержать минимум 3 символа')
    }
    if (!editingUser && (!form.password || form.password.length < 6)) {
      errors.push('Пароль должен содержать минимум 6 символов')
    }
    return errors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    
    const validationErrors = validateForm()

    try {
      if (editingUser) {
        const payload = {
          login: form.login,
          name: form.name,
          role: form.role || editingUser.role
        }
        if (form.password) {
          payload.password = form.password
        }
        await api.users.update(token, editingUser.id, payload)
      } else {
        await api.users.create(token, form)
      }
      resetForm()
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return
    const confirmed = window.confirm(
      `Удалить ${selectedUsers.length} пользователей?`
    )
    if (!confirmed) return
    try {
      await Promise.all(
        selectedUsers.map(id => api.users.delete(token, id))
      )
      setSelectedUsers([])
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Удалить пользователя ${user.name} (${user.login})?`
    )
    if (!confirmed) return
    try {
      await api.users.delete(token, user.id)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  
  const exportUsers = () => {
    const csv = users.map(u =>
      `${u.name},${u.login},${u.role},${formatDate(u.createdAt)}`
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
  }

  return (
    <div className="grid two">
      <section className="card">
        <div className="section-head">
          <h2>Пользователи</h2>
          <select
            className="input"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">Все роли</option>
            {USER_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="muted">Загрузка...</p>
        ) : error ? (
          <div className="alert danger">{error}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Логин</th>
                  <th>Роль</th>
                  <th>Создан</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.login}</td>
                    <td>
                      <span className="tag">{user.role}</span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td className="table-actions">
                      <button className="btn ghost" onClick={() => startEdit(user)}>
                        Изменить
                      </button>
                      <button
                        className="btn ghost danger"
                        onClick={() => handleDelete(user)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Пользователи не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card">
        <div className="section-head">
          <h2>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</h2>
          {editingUser && (
            <button className="btn ghost" onClick={resetForm}>
              Очистить
            </button>
          )}
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Имя</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Логин</span>
            <input
              name="login"
              value={form.login}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Роль</span>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              {USER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>{editingUser ? 'Новый пароль' : 'Пароль'}</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={editingUser ? 'Оставьте пустым чтобы не менять' : ''}
              required={!editingUser}
            />
          </label>
          <button className="btn primary" type="submit">
            {editingUser ? 'Обновить' : 'Создать'}
          </button>
        </form>
      </section>
    </div>
  )
}
