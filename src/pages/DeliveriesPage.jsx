import { useEffect, useMemo, useState, useCallback } from 'react'
import { api, oldApi, buildEndpoint } from '../api/endpoints.js'
import { DELIVERY_STATUSES, DELIVERY_STATUS_MAP, LEGACY_STATUSES, ERROR_MESSAGES } from '../constants.js'
import DeliveryDetails from '../components/deliveries/DeliveryDetails.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { formatDate, formatTimestamp, formatTime, calculateDateDiff, isValidDate } from '../utils/format.js'


const MAX_POINTS_PER_DELIVERY = 20
const MAX_PRODUCTS_PER_POINT = 50
const MIN_DELIVERY_WINDOW_HOURS = 2
const DEFAULT_TIME_WINDOW = { start: '09:00', end: '18:00' }
const MOSCOW_COORDS = { lat: 55.7558, lon: 37.6173 }


function validateCoordinates(lat, lon) {
  if (lat < -90 || lat > 90) return 'Широта должна быть от -90 до 90'
  if (lon < -180 || lon > 180) return 'Долгота должна быть от -180 до 180'
  return null
}

function validateTimeWindow(start, end) {
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  if (endMinutes - startMinutes < MIN_DELIVERY_WINDOW_HOURS * 60) {
    return `Минимальное окно доставки - ${MIN_DELIVERY_WINDOW_HOURS} часа`
  }
  return null
}


function createDeliveryPoint(seq = 1) {
  return {
    sequence: seq,
    latitude: MOSCOW_COORDS.lat,
    longitude: MOSCOW_COORDS.lon,
    products: []
  }
}


function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}


function optimizeRoute(points) {
  if (points.length <= 2) return points
  const result = [points[0]]
  const remaining = points.slice(1)
  while (remaining.length > 0) {
    const last = result[result.length - 1]
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(
        last.latitude, last.longitude,
        remaining[i].latitude, remaining[i].longitude
      )
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIdx = i
      }
    }
    result.push(remaining.splice(nearestIdx, 1)[0])
  }
  return result
}

const createPoint = (index = 1) => ({
  sequence: index,
  latitude: '',
  longitude: '',
  products: [{ productId: '', quantity: 1 }]
})

const initialForm = {
  courierId: '',
  vehicleId: '',
  deliveryDate: '',
  timeStart: '09:00',
  timeEnd: '18:00',
  points: [createPoint(1)]
}


const initialFormExtended = {
  courierId: '',
  vehicleId: '',
  deliveryDate: '',
  timeStart: '09:00',
  timeEnd: '18:00',
  priority: 'normal',
  notes: '',
  points: [createPoint(1)]
}

// Хелперы для массовой генерации
const createGenerationPoint = (seq = 1) => ({
  sequence: seq,
  latitude: '',
  longitude: ''
})

const createGenerationDelivery = () => ({
  route: [createGenerationPoint(1)],
  products: [{ productId: '', quantity: 1 }]
})

const createGenerationDate = () => ({
  date: '',
  deliveries: [createGenerationDelivery()]
})

// Хелперы для расчета маршрута
const createRoutePoint = () => ({
  latitude: '',
  longitude: ''
})

export default function DeliveriesPage() {
  const { token } = useAuth()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [couriers, setCouriers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [products, setProducts] = useState([])
  const [refsError, setRefsError] = useState(null)

  const [filters, setFilters] = useState({
    date: '',
    courier_id: '',
    status: ''
  })
  const [filterForm, setFilterForm] = useState(filters)

  const [form, setForm] = useState(initialForm)
  const [editingDelivery, setEditingDelivery] = useState(null)
  const [formError, setFormError] = useState(null)

  const [selectedDelivery, setSelectedDelivery] = useState(null)

  // Массовая генерация - структурированные данные
  const [generationDates, setGenerationDates] = useState([createGenerationDate()])
  const [generationResult, setGenerationResult] = useState(null)
  const [generationError, setGenerationError] = useState(null)

  // Расчет маршрута - структурированные данные
  const [routePoints, setRoutePoints] = useState([createRoutePoint(), createRoutePoint()])
  const [routeResult, setRouteResult] = useState(null)
  const [routeError, setRouteError] = useState(null)
  const [calculatingRoute, setCalculatingRoute] = useState(false)

  const loadReferences = async () => {
    const errors = []
    const [courierRes, vehicleRes, productRes] = await Promise.allSettled([
      api.users.list(token, 'courier'),
      api.vehicles.list(token),
      api.products.list(token)
    ])

    if (courierRes.status === 'fulfilled') {
      setCouriers(courierRes.value)
    } else {
      setCouriers([])
      errors.push(
        'Не удалось загрузить список курьеров (нужны права администратора)'
      )
    }

    if (vehicleRes.status === 'fulfilled') {
      setVehicles(vehicleRes.value)
    } else {
      errors.push(vehicleRes.reason.message)
    }

    if (productRes.status === 'fulfilled') {
      setProducts(productRes.value)
    } else {
      errors.push(productRes.reason.message)
    }

    setRefsError(errors.length ? errors.join('. ') : null)
  }

  const loadDeliveries = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.deliveries.list(token, filters)
      setDeliveries(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    loadDeliveries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token])

  const updateFormField = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const updatePointField = (index, field, value) => {
    setForm((prev) => {
      const points = [...prev.points]
      points[index] = { ...points[index], [field]: value }
      return { ...prev, points }
    })
  }

  const updatePointProduct = (pointIndex, productIndex, field, value) => {
    setForm((prev) => {
      const points = [...prev.points]
      const productsInPoint = [...points[pointIndex].products]
      productsInPoint[productIndex] = {
        ...productsInPoint[productIndex],
        [field]: value
      }
      points[pointIndex] = { ...points[pointIndex], products: productsInPoint }
      return { ...prev, points }
    })
  }

  const addPoint = () => {
    setForm((prev) => ({
      ...prev,
      points: [...prev.points, createPoint(prev.points.length + 1)]
    }))
  }

  const removePoint = (index) => {
    setForm((prev) => {
      if (prev.points.length === 1) return prev
      const points = prev.points.filter((_, idx) => idx !== index)
      return { ...prev, points }
    })
  }

  const addProductToPoint = (index) => {
    setForm((prev) => {
      const points = [...prev.points]
      points[index] = {
        ...points[index],
        products: [...points[index].products, { productId: '', quantity: 1 }]
      }
      return { ...prev, points }
    })
  }

  const removeProductFromPoint = (pointIndex, productIndex) => {
    setForm((prev) => {
      const points = [...prev.points]
      const productsInPoint = points[pointIndex].products.filter(
        (_, idx) => idx !== productIndex
      )
      points[pointIndex] = { ...points[pointIndex], products: productsInPoint }
      return { ...prev, points }
    })
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingDelivery(null)
    setFormError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    try {
      const payload = {
        courierId: Number(form.courierId),
        vehicleId: Number(form.vehicleId),
        deliveryDate: form.deliveryDate,
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
        points: form.points.map((point, idx) => ({
          sequence: Number(point.sequence || idx + 1),
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          products: point.products
            .filter((product) => product.productId)
            .map((product) => ({
              productId: Number(product.productId),
              quantity: Number(product.quantity)
            }))
        }))
      }

      if (editingDelivery) {
        await api.deliveries.update(token, editingDelivery.id, payload)
      } else {
        await api.deliveries.create(token, payload)
      }
      resetForm()
      await loadDeliveries()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteDelivery = async (delivery) => {
    const confirmed = window.confirm(
      `Удалить доставку ${delivery.deliveryNumber}?`
    )
    if (!confirmed) return
    try {
      await api.deliveries.delete(token, delivery.id)
      await loadDeliveries()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditDelivery = (delivery) => {
    if (!delivery.canEdit) return
    setEditingDelivery(delivery)
    setForm({
      courierId: delivery.courier?.id || '',
      vehicleId: delivery.vehicle?.id || '',
      deliveryDate: delivery.deliveryDate,
      timeStart: delivery.timeStart,
      timeEnd: delivery.timeEnd,
      points: delivery.deliveryPoints.map((point) => ({
        sequence: point.sequence,
        latitude: point.latitude,
        longitude: point.longitude,
        products: point.products.map((product) => ({
          productId: product.product.id,
          quantity: product.quantity
        }))
      }))
    })
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setFilters(filterForm)
  }

  const clearFilters = () => {
    setFilterForm({ date: '', courier_id: '', status: '' })
    setFilters({ date: '', courier_id: '', status: '' })
  }

  // === Функции для массовой генерации ===
  const addGenerationDate = () => {
    setGenerationDates((prev) => [...prev, createGenerationDate()])
  }

  const removeGenerationDate = (dateIndex) => {
    setGenerationDates((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, idx) => idx !== dateIndex)
    })
  }

  const updateGenerationDateField = (dateIndex, value) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      dates[dateIndex] = { ...dates[dateIndex], date: value }
      return dates
    })
  }

  const addDeliveryToDate = (dateIndex) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      dates[dateIndex] = {
        ...dates[dateIndex],
        deliveries: [...dates[dateIndex].deliveries, createGenerationDelivery()]
      }
      return dates
    })
  }

  const removeDeliveryFromDate = (dateIndex, deliveryIndex) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      if (dates[dateIndex].deliveries.length === 1) return prev
      dates[dateIndex] = {
        ...dates[dateIndex],
        deliveries: dates[dateIndex].deliveries.filter((_, idx) => idx !== deliveryIndex)
      }
      return dates
    })
  }

  const addRoutePointToDelivery = (dateIndex, deliveryIndex) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      const delivery = dates[dateIndex].deliveries[deliveryIndex]
      dates[dateIndex].deliveries[deliveryIndex] = {
        ...delivery,
        route: [...delivery.route, createGenerationPoint(delivery.route.length + 1)]
      }
      return dates
    })
  }

  const removeRoutePointFromDelivery = (dateIndex, deliveryIndex, pointIndex) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      const delivery = dates[dateIndex].deliveries[deliveryIndex]
      if (delivery.route.length === 1) return prev
      dates[dateIndex].deliveries[deliveryIndex] = {
        ...delivery,
        route: delivery.route.filter((_, idx) => idx !== pointIndex)
      }
      return dates
    })
  }

  const updateRoutePointField = (dateIndex, deliveryIndex, pointIndex, field, value) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      const route = [...dates[dateIndex].deliveries[deliveryIndex].route]
      route[pointIndex] = { ...route[pointIndex], [field]: value }
      dates[dateIndex].deliveries[deliveryIndex] = {
        ...dates[dateIndex].deliveries[deliveryIndex],
        route
      }
      return dates
    })
  }

  const addProductToDelivery = (dateIndex, deliveryIndex) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      const delivery = dates[dateIndex].deliveries[deliveryIndex]
      dates[dateIndex].deliveries[deliveryIndex] = {
        ...delivery,
        products: [...delivery.products, { productId: '', quantity: 1 }]
      }
      return dates
    })
  }

  const removeProductFromDelivery = (dateIndex, deliveryIndex, productIndex) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      const delivery = dates[dateIndex].deliveries[deliveryIndex]
      dates[dateIndex].deliveries[deliveryIndex] = {
        ...delivery,
        products: delivery.products.filter((_, idx) => idx !== productIndex)
      }
      return dates
    })
  }

  const updateDeliveryProductField = (dateIndex, deliveryIndex, productIndex, field, value) => {
    setGenerationDates((prev) => {
      const dates = [...prev]
      const products = [...dates[dateIndex].deliveries[deliveryIndex].products]
      products[productIndex] = { ...products[productIndex], [field]: value }
      dates[dateIndex].deliveries[deliveryIndex] = {
        ...dates[dateIndex].deliveries[deliveryIndex],
        products
      }
      return dates
    })
  }

  const handleGenerateDeliveries = async (event) => {
    event.preventDefault()
    setGenerationError(null)
    try {
      // Конвертируем структурированные данные в формат API
      const deliveryData = {}
      for (const dateEntry of generationDates) {
        if (!dateEntry.date) continue
        deliveryData[dateEntry.date] = dateEntry.deliveries.map((delivery) => ({
          route: delivery.route.map((point) => ({
            sequence: Number(point.sequence),
            latitude: Number(point.latitude),
            longitude: Number(point.longitude)
          })),
          products: delivery.products
            .filter((p) => p.productId)
            .map((p) => ({
              productId: Number(p.productId),
              quantity: Number(p.quantity)
            }))
        }))
      }
      const response = await api.deliveries.generate(token, { deliveryData })
      setGenerationResult(response)
      await loadDeliveries()
    } catch (err) {
      setGenerationError(err.message)
    }
  }

  // === Функции для расчета маршрута ===
  const addCalcRoutePoint = () => {
    setRoutePoints((prev) => [...prev, createRoutePoint()])
  }

  const removeCalcRoutePoint = (index) => {
    setRoutePoints((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const updateCalcRoutePointField = (index, field, value) => {
    setRoutePoints((prev) => {
      const points = [...prev]
      points[index] = { ...points[index], [field]: value }
      return points
    })
  }

  const handleCalculateRoute = async (event) => {
    event.preventDefault()
    setRouteError(null)
    setRouteResult(null)
    try {
      const points = routePoints.map((p) => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude)
      }))
      setCalculatingRoute(true)
      const response = await api.route.calculate(token, { points })
      setRouteResult(response)
    } catch (err) {
      setRouteError(err.message)
    } finally {
      setCalculatingRoute(false)
    }
  }

  const filteredDeliveries = useMemo(() => deliveries, [deliveries])

  return (
    <div className="deliveries-grid">
      <section className="card">
        <form className="filter-row" onSubmit={applyFilters}>
          <div>
            <label>Дата</label>
            <input
              type="date"
              value={filterForm.date}
              onChange={(event) =>
                setFilterForm((prev) => ({
                  ...prev,
                  date: event.target.value
                }))
              }
            />
          </div>
          <div>
            <label>Курьер</label>
            <select
              value={filterForm.courier_id}
              onChange={(event) =>
                setFilterForm((prev) => ({
                  ...prev,
                  courier_id: event.target.value
                }))
              }
            >
              <option value="">Все</option>
              {couriers.map((courier) => (
                <option key={courier.id} value={courier.id}>
                  {courier.name}
                </option>
              ))}
            </select>
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
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Дата</th>
                  <th>Курьер</th>
                  <th>Статус</th>
                  <th>Машина</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{delivery.deliveryNumber}</td>
                    <td>{formatDate(delivery.deliveryDate)}</td>
                    <td>{delivery.courier?.name || '—'}</td>
                    <td>
                      <span className={`tag ${delivery.status}`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td>{delivery.vehicle?.licensePlate || '—'}</td>
                    <td className="table-actions">
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setSelectedDelivery(delivery)}
                      >
                        Подробнее
                      </button>
                      {delivery.canEdit && (
                        <>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => handleEditDelivery(delivery)}
                          >
                            Редактировать
                          </button>
                          <button
                            className="btn ghost danger"
                            type="button"
                            onClick={() => handleDeleteDelivery(delivery)}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredDeliveries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Доставки не найдены
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
          <h2>{editingDelivery ? 'Редактировать доставку' : 'Новая доставка'}</h2>
          {editingDelivery && (
            <button className="btn ghost" type="button" onClick={resetForm}>
              Отменить редактирование
            </button>
          )}
        </div>
        {formError && <div className="alert danger">{formError}</div>}
        {refsError && <div className="alert danger">{refsError}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Курьер</span>
            {couriers.length > 0 ? (
              <select
                name="courierId"
                value={form.courierId}
                onChange={updateFormField}
                required
              >
                <option value="" disabled>
                  Выберите курьера
                </option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                name="courierId"
                value={form.courierId}
                onChange={updateFormField}
                placeholder="Введите ID курьера"
                required
              />
            )}
          </label>
          <label className="form-field">
            <span>Машина</span>
            <select
              name="vehicleId"
              value={form.vehicleId}
              onChange={updateFormField}
              required
            >
              <option value="" disabled>
                Выберите машину
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} ({vehicle.licensePlate})
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Дата</span>
            <input
              type="date"
              name="deliveryDate"
              value={form.deliveryDate}
              onChange={updateFormField}
              required
            />
          </label>
          <label className="form-field">
            <span>Время начала</span>
            <input
              type="time"
              name="timeStart"
              value={form.timeStart}
              onChange={updateFormField}
              required
            />
          </label>
          <label className="form-field">
            <span>Время окончания</span>
            <input
              type="time"
              name="timeEnd"
              value={form.timeEnd}
              onChange={updateFormField}
              required
            />
          </label>

          <div className="points-section">
            <div className="section-head">
              <h3>Точки маршрута</h3>
              <button className="btn ghost" type="button" onClick={addPoint}>
                Добавить точку
              </button>
            </div>
            {form.points.map((point, index) => (
              <div key={index} className="point-card">
                <div className="point-card-head">
                  <strong>Точка {index + 1}</strong>
                  {form.points.length > 1 && (
                    <button
                      type="button"
                      className="btn ghost danger"
                      onClick={() => removePoint(index)}
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <div className="point-grid">
                  <label className="form-field">
                    <span>Порядок</span>
                    <input
                      type="number"
                      min="1"
                      value={point.sequence}
                      onChange={(event) =>
                        updatePointField(index, 'sequence', event.target.value)
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Широта</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={point.latitude}
                      onChange={(event) =>
                        updatePointField(index, 'latitude', event.target.value)
                      }
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Долгота</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={point.longitude}
                      onChange={(event) =>
                        updatePointField(index, 'longitude', event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
                <div className="products-block">
                  <div className="section-head">
                    <p>Товары</p>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => addProductToPoint(index)}
                    >
                      Добавить товар
                    </button>
                  </div>
                  {point.products.map((product, productIndex) => (
                    <div key={productIndex} className="product-row">
                      <select
                        value={product.productId}
                        onChange={(event) =>
                          updatePointProduct(
                            index,
                            productIndex,
                            'productId',
                            event.target.value
                          )
                        }
                      >
                        <option value="">Выберите товар</option>
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(event) =>
                          updatePointProduct(
                            index,
                            productIndex,
                            'quantity',
                            event.target.value
                          )
                        }
                      />
                      <button
                        type="button"
                        className="btn ghost danger"
                        onClick={() =>
                          removeProductFromPoint(index, productIndex)
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {point.products.length === 0 && (
                    <p className="muted">Добавьте товары для этой точки</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="btn primary" type="submit">
            {editingDelivery ? 'Сохранить изменения' : 'Создать доставку'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Массовая генерация</h2>
          <button className="btn ghost" type="button" onClick={addGenerationDate}>
            Добавить дату
          </button>
        </div>
        <p className="muted">
          Создайте несколько доставок на разные даты. Сервис автоматически
          распределит курьеров и машины.
        </p>
        {generationError && <div className="alert danger">{generationError}</div>}
        <form className="form-grid" onSubmit={handleGenerateDeliveries}>
          <div className="points-section">
            {generationDates.map((dateEntry, dateIndex) => (
              <div key={dateIndex} className="point-card">
                <div className="point-card-head">
                  <strong>Дата {dateIndex + 1}</strong>
                  {generationDates.length > 1 && (
                    <button
                      type="button"
                      className="btn ghost danger"
                      onClick={() => removeGenerationDate(dateIndex)}
                    >
                      Удалить дату
                    </button>
                  )}
                </div>
                <label className="form-field">
                  <span>Дата доставки</span>
                  <input
                    type="date"
                    value={dateEntry.date}
                    onChange={(e) => updateGenerationDateField(dateIndex, e.target.value)}
                    required
                  />
                </label>

                <div className="products-block">
                  <div className="section-head">
                    <p>Доставки на эту дату</p>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => addDeliveryToDate(dateIndex)}
                    >
                      Добавить доставку
                    </button>
                  </div>

                  {dateEntry.deliveries.map((delivery, deliveryIndex) => (
                    <div key={deliveryIndex} className="nested-card">
                      <div className="point-card-head">
                        <strong>Доставка {deliveryIndex + 1}</strong>
                        {dateEntry.deliveries.length > 1 && (
                          <button
                            type="button"
                            className="btn ghost danger"
                            onClick={() => removeDeliveryFromDate(dateIndex, deliveryIndex)}
                          >
                            Удалить
                          </button>
                        )}
                      </div>

                      <div className="products-block">
                        <div className="section-head">
                          <p>Точки маршрута</p>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => addRoutePointToDelivery(dateIndex, deliveryIndex)}
                          >
                            Добавить точку
                          </button>
                        </div>
                        {delivery.route.map((point, pointIndex) => (
                          <div key={pointIndex} className="product-row">
                            <input
                              type="number"
                              min="1"
                              placeholder="№"
                              value={point.sequence}
                              onChange={(e) =>
                                updateRoutePointField(dateIndex, deliveryIndex, pointIndex, 'sequence', e.target.value)
                              }
                              style={{ width: '60px' }}
                            />
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="Широта"
                              value={point.latitude}
                              onChange={(e) =>
                                updateRoutePointField(dateIndex, deliveryIndex, pointIndex, 'latitude', e.target.value)
                              }
                              required
                            />
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="Долгота"
                              value={point.longitude}
                              onChange={(e) =>
                                updateRoutePointField(dateIndex, deliveryIndex, pointIndex, 'longitude', e.target.value)
                              }
                              required
                            />
                            {delivery.route.length > 1 && (
                              <button
                                type="button"
                                className="btn ghost danger"
                                onClick={() => removeRoutePointFromDelivery(dateIndex, deliveryIndex, pointIndex)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="products-block">
                        <div className="section-head">
                          <p>Товары</p>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => addProductToDelivery(dateIndex, deliveryIndex)}
                          >
                            Добавить товар
                          </button>
                        </div>
                        {delivery.products.map((product, productIndex) => (
                          <div key={productIndex} className="product-row">
                            <select
                              value={product.productId}
                              onChange={(e) =>
                                updateDeliveryProductField(dateIndex, deliveryIndex, productIndex, 'productId', e.target.value)
                              }
                            >
                              <option value="">Выберите товар</option>
                              {products.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              placeholder="Кол-во"
                              value={product.quantity}
                              onChange={(e) =>
                                updateDeliveryProductField(dateIndex, deliveryIndex, productIndex, 'quantity', e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="btn ghost danger"
                              onClick={() => removeProductFromDelivery(dateIndex, deliveryIndex, productIndex)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {delivery.products.length === 0 && (
                          <p className="muted">Добавьте товары для этой доставки</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn primary">Запустить генерацию</button>
        </form>
        {generationResult && (
          <div className="alert success">
            Создано доставок: {generationResult.totalGenerated}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Расчет маршрута</h2>
          <button className="btn ghost" type="button" onClick={addCalcRoutePoint}>
            Добавить точку
          </button>
        </div>
        <p className="muted">
          Быстрая проверка расстояния и времени прохождения маршрута.
          Минимум 2 точки.
        </p>
        {routeError && <div className="alert danger">{routeError}</div>}
        <form className="form-grid" onSubmit={handleCalculateRoute}>
          <div className="points-section">
            {routePoints.map((point, index) => (
              <div key={index} className="route-point-row">
                <span className="point-number">{index + 1}</span>
                <label className="form-field">
                  <span>Широта</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="55.7558"
                    value={point.latitude}
                    onChange={(e) => updateCalcRoutePointField(index, 'latitude', e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Долгота</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="37.6173"
                    value={point.longitude}
                    onChange={(e) => updateCalcRoutePointField(index, 'longitude', e.target.value)}
                    required
                  />
                </label>
                {routePoints.length > 2 && (
                  <button
                    type="button"
                    className="btn ghost danger"
                    onClick={() => removeCalcRoutePoint(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="btn primary" disabled={calculatingRoute}>
            {calculatingRoute ? 'Расчет...' : 'Рассчитать'}
          </button>
        </form>
        {routeResult && (
          <div className="list">
            <div>
              <strong>Расстояние</strong>
              <p className="muted">{routeResult.distanceKm} км</p>
            </div>
            <div>
              <strong>Время в пути</strong>
              <p className="muted">{routeResult.durationMinutes} мин</p>
            </div>
            {routeResult.suggestedTime && (
              <div>
                <strong>Рекомендация</strong>
                <p className="muted">
                  {routeResult.suggestedTime.start} —{' '}
                  {routeResult.suggestedTime.end}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {selectedDelivery && (
        <div className="card">
          <DeliveryDetails
            delivery={selectedDelivery}
            onClose={() => setSelectedDelivery(null)}
          />
        </div>
      )}
    </div>
  )
}
