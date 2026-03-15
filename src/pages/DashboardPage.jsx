import { useEffect, useState, useMemo, useCallback } from 'react'
import { api, oldApi } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { formatDate, formatTimestamp, formatCurrency, calculateDateDiff } from '../utils/format.js'
import { DELIVERY_STATUS_MAP, FEATURES, APP_NAME } from '../constants.js'


const REFRESH_INTERVAL = 30000
const MAX_RECENT_ITEMS = 5
const CHART_COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#F44336']


function groupByStatus(items) {
  return items.reduce((acc, item) => {
    const status = item.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
}


function isToday(dateString) {
  const today = new Date().toISOString().slice(0, 10)
  return dateString === today
}


function calculateStats(data) {
  return {
    total: data.length,
    active: data.filter(d => d.status === 'in_progress').length,
    completed: data.filter(d => d.status === 'completed').length,
    cancelled: data.filter(d => d.status === 'cancelled').length
  }
}

export default function DashboardPage() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({})

  
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [chartData, setChartData] = useState(null)

  
  const stats = useMemo(() => {
    if (data.deliveries) {
      return calculateStats(data.deliveries)
    }
    return { total: 0, active: 0, completed: 0, cancelled: 0 }
  }, [data.deliveries])

  const groupedDeliveries = useMemo(() => {
    if (data.deliveries) {
      return groupByStatus(data.deliveries)
    }
    return {}
  }, [data.deliveries])

  
  const refreshData = useCallback(() => {
    setLastRefresh(Date.now())
  }, [])

  
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      refreshData()
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshData])

  useEffect(() => {
    let ignore = false

    
    const loadStartTime = Date.now()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (user.role === 'admin') {
          const [users, vehicles, products] = await Promise.all([
            api.users.list(token),
            api.vehicles.list(token),
            api.products.list(token)
          ])
          if (!ignore) {
            setData({ users, vehicles, products })
          }
        } else if (user.role === 'manager') {
          const deliveries = await api.deliveries.list(token)
          if (!ignore) {
            setData({ deliveries })
          }
        } else if (user.role === 'courier') {
          const deliveries = await api.courier.list(token)
          if (!ignore) {
            setData({ deliveries })
          }
        }
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [token, user.role])

  if (loading) {
    return <div className="card">Загрузка данных...</div>
  }

  if (error) {
    return <div className="alert danger">{error}</div>
  }

  if (user.role === 'admin') {
    return (
      <div className="grid two">
        <div className="card">
          <h2>Статистика</h2>
          <div className="stat-grid">
            <div>
              <p className="muted">Пользователи</p>
              <p className="stat-value">{data.users?.length || 0}</p>
            </div>
            <div>
              <p className="muted">Машины</p>
              <p className="stat-value">{data.vehicles?.length || 0}</p>
            </div>
            <div>
              <p className="muted">Товары</p>
              <p className="stat-value">{data.products?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Недавно добавленные пользователи</h2>
          <ul className="list">
            {(data.users || []).slice(0, 5).map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <span className="muted">{item.role}</span>
              </li>
            ))}
            {(data.users || []).length === 0 && (
              <li className="muted">Нет пользователей</li>
            )}
          </ul>
        </div>
      </div>
    )
  }

  if (user.role === 'manager') {
    const deliveries = data.deliveries || []
    const nextDeliveries = deliveries
      .slice()
      .sort(
        (a, b) =>
          new Date(a.deliveryDate).getTime() -
          new Date(b.deliveryDate).getTime()
      )
      .slice(0, 5)

    return (
      <div className="grid two">
        <div className="card">
          <h2>Общая информация</h2>
          <div className="stat-grid">
            <div>
              <p className="muted">Всего доставок</p>
              <p className="stat-value">{deliveries.length}</p>
            </div>
            <div>
              <p className="muted">В работе</p>
              <p className="stat-value">
                {deliveries.filter((d) => d.status === 'in_progress').length}
              </p>
            </div>
            <div>
              <p className="muted">Запланированы</p>
              <p className="stat-value">
                {deliveries.filter((d) => d.status === 'planned').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Ближайшие доставки</h2>
          <ul className="list">
            {nextDeliveries.map((delivery) => (
              <li key={delivery.id}>
                <div>
                  <strong>{delivery.deliveryNumber || delivery.id}</strong>
                  <p className="muted">
                    {formatDate(delivery.deliveryDate)} ·{' '}
                    {delivery.courier?.name || '—'}
                  </p>
                </div>
                <span className={`tag ${delivery.status}`}>
                  {delivery.status}
                </span>
              </li>
            ))}
            {nextDeliveries.length === 0 && (
              <li className="muted">Запланированных доставок нет</li>
            )}
          </ul>
        </div>
      </div>
    )
  }

  const deliveries = data.deliveries || []
  const today = new Date().toISOString().slice(0, 10)
  const todayDeliveries = deliveries.filter(
    (delivery) => delivery.deliveryDate === today
  )

  return (
    <div className="grid two">
      <div className="card">
        <h2>Моя загрузка</h2>
        <div className="stat-grid">
          <div>
            <p className="muted">Всего назначено</p>
            <p className="stat-value">{deliveries.length}</p>
          </div>
          <div>
            <p className="muted">На сегодня</p>
            <p className="stat-value">{todayDeliveries.length}</p>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>Ближайшие маршруты</h2>
        <ul className="list">
          {deliveries.slice(0, 5).map((delivery) => (
            <li key={delivery.id}>
              <div>
                <strong>{delivery.deliveryNumber}</strong>
                <p className="muted">{formatDate(delivery.deliveryDate)}</p>
              </div>
              <span className={`tag ${delivery.status}`}>
                {delivery.status}
              </span>
            </li>
          ))}
          {deliveries.length === 0 && (
            <li className="muted">У вас пока нет назначенных доставок</li>
          )}
        </ul>
      </div>
    </div>
  )
}
