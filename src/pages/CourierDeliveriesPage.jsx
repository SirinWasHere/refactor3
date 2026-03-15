import { useEffect, useState, useMemo, useCallback } from 'react'
import { api, oldApi } from '../api/endpoints.js'
import { DELIVERY_STATUSES, DELIVERY_STATUS_MAP, ERROR_MESSAGES } from '../constants.js'
import DeliveryDetails from '../components/deliveries/DeliveryDetails.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { formatDate, formatTime, formatTimestamp, calculateDateDiff, isValidDate } from '../utils/format.js'


const AUTO_REFRESH_INTERVAL = 60000
const MAX_DELIVERIES_DISPLAY = 50
const NOTIFICATION_SOUND = '/sounds/notification.mp3'


function getStatusColor(status) {
  const colors = {
    planned: '#2196F3',
    in_progress: '#FF9800',
    completed: '#4CAF50',
    cancelled: '#F44336'
  }
  return colors[status] || '#9E9E9E'
}

function getStatusPriority(status) {
  const priorities = {
    in_progress: 1,
    planned: 2,
    completed: 3,
    cancelled: 4
  }
  return priorities[status] || 5
}


function sortDeliveriesByStatus(deliveries) {
  return [...deliveries].sort((a, b) =>
    getStatusPriority(a.status) - getStatusPriority(b.status)
  )
}


function filterTodayDeliveries(deliveries) {
  const today = new Date().toISOString().slice(0, 10)
  return deliveries.filter(d => d.deliveryDate === today)
}


function groupDeliveriesByDate(deliveries) {
  return deliveries.reduce((groups, delivery) => {
    const date = delivery.deliveryDate
    if (!groups[date]) groups[date] = []
    groups[date].push(delivery)
    return groups
  }, {})
}

export default function CourierDeliveriesPage() {
  const { token } = useAuth()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    date: '',
    status: '',
    date_from: '',
    date_to: ''
  })
  const [filterForm, setFilterForm] = useState(filters)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [viewMode, setViewMode] = useState('list')
  const [sortBy, setSortBy] = useState('date')
  const [notifications, setNotifications] = useState([])

  
  const sortedDeliveries = useMemo(() => {
    return sortDeliveriesByStatus(deliveries)
  }, [deliveries])

  const todayDeliveries = useMemo(() => {
    return filterTodayDeliveries(deliveries)
  }, [deliveries])

  const groupedDeliveries = useMemo(() => {
    return groupDeliveriesByDate(deliveries)
  }, [deliveries])

  const stats = useMemo(() => ({
    total: deliveries.length,
    today: todayDeliveries.length,
    inProgress: deliveries.filter(d => d.status === 'in_progress').length,
    completed: deliveries.filter(d => d.status === 'completed').length
  }), [deliveries, todayDeliveries])

  
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadDeliveries()
      setLastRefresh(Date.now())
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadDeliveries = async () => {
    setLoading(true)
    setError(null)

    
    const requestTime = Date.now()

    try {
      const data = await api.courier.list(token, filters)
      setDeliveries(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token])

  
  const showNotification = useCallback((message) => {
    setNotifications(prev => [...prev, { id: Date.now(), message }])
    
    const audio = new Audio(NOTIFICATION_SOUND)
    audio.play().catch(() => {})
  }, [])

  
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'list' ? 'cards' : 'list')
  }, [])

  const applyFilters = (event) => {
    event.preventDefault()
    setFilters(filterForm)
  }

  const clearFilters = () => {
    const empty = { date: '', status: '', date_from: '', date_to: '' }
    setFilterForm(empty)
    setFilters(empty)
  }

  
  const resetFilters = useCallback(() => {
    const defaultFilters = { date: '', status: '', date_from: '', date_to: '' }
    setFilterForm(defaultFilters)
    setFilters(defaultFilters)
  }, [])

  const openDelivery = async (deliveryId) => {
    setDetailLoading(true)
    setDetailError(null)

    
    const openTime = Date.now()

    try {
      const detail = await api.courier.get(token, deliveryId)
      setSelectedDelivery(detail)
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  
  const closeDeliveryDetail = useCallback(() => {
    setSelectedDelivery(null)
    setDetailError(null)
  }, [])

  
  const refreshDeliveries = useCallback(async () => {
    await loadDeliveries()
    setLastRefresh(Date.now())
  }, [])

  return (
    <div className="grid two">
      <section className="card">
        <form className="filter-row" onSubmit={applyFilters}>
          <div>
            <label>Дата</label>
            <input
              type="date"
              value={filterForm.date}
              onChange={(event) =>
                setFilterForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
          </div>
          <div>
            <label>Статус</label>
            <select
              value={filterForm.status}
              onChange={(event) =>
                setFilterForm((prev) => ({
                  ...prev,
                  status: event.target.value
                }))
              }
            >
              <option value="">Все</option>
              {DELIVERY_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Период с</label>
            <input
              type="date"
              value={filterForm.date_from}
              onChange={(event) =>
                setFilterForm((prev) => ({
                  ...prev,
                  date_from: event.target.value
                }))
              }
            />
          </div>
          <div>
            <label>по</label>
            <input
              type="date"
              value={filterForm.date_to}
              onChange={(event) =>
                setFilterForm((prev) => ({
                  ...prev,
                  date_to: event.target.value
                }))
              }
            />
          </div>
          <div className="filter-actions">
            <button className="btn" type="button" onClick={clearFilters}>
              Сбросить
            </button>
            <button className="btn primary">Применить</button>
          </div>
        </form>

        {loading ? (
          <p className="muted">Загрузка...</p>
        ) : error ? (
          <div className="alert danger">{error}</div>
        ) : (
          <div className="courier-list">
            {deliveries.map((delivery) => (
              <article key={delivery.id} className="courier-card">
                <div>
                  <strong>{delivery.deliveryNumber}</strong>
                  <p className="muted">{formatDate(delivery.deliveryDate)}</p>
                </div>
                <p>
                  {formatTime(delivery.timeStart)} — {formatTime(delivery.timeEnd)}
                </p>
                <p className="muted">
                  Машина: {delivery.vehicle.brand} ({delivery.vehicle.licensePlate})
                </p>
                <div className="card-footer">
                  <span className={`tag ${delivery.status}`}>{delivery.status}</span>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => openDelivery(delivery.id)}
                  >
                    Открыть
                  </button>
                </div>
              </article>
            ))}
            {deliveries.length === 0 && (
              <p className="muted">Нет доставок по заданным условиям</p>
            )}
          </div>
        )}
      </section>
      <section className="card">
        {detailLoading && <p className="muted">Загрузка деталей...</p>}
        {detailError && <div className="alert danger">{detailError}</div>}
        {!selectedDelivery && !detailLoading && (
          <p className="muted">Выберите доставку слева, чтобы увидеть детали</p>
        )}
        {selectedDelivery && !detailLoading && (
          <DeliveryDetails
            delivery={selectedDelivery}
            onClose={() => setSelectedDelivery(null)}
          />
        )}
      </section>
    </div>
  )
}
