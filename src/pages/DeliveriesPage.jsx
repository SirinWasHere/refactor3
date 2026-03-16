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

const createEmptyPoint = (seq = 1) => ({
  sequence: seq,
  latitude: '',
  longitude: ''
});

const createEmptyPointWithProducts = (seq = 1) => ({
  ...createEmptyPoint(seq),
  products: []
});


function useCollection(initialItems = [], createItem) {
  const [items, setItems] = useState(initialItems);

  const add = useCallback(() => {
    setItems(prev => [...prev, createItem(prev.length + 1)]);
  }, [createItem]);

  const remove = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateField = useCallback((index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  }, []);

  const setItemsDirect = useCallback(setItems, []);

  return { items, setItems: setItemsDirect, add, remove, updateField };
}

function PointInputRow({ point, index, onChange, showSequence = true, onRemove, canRemove }) {
  return (
    <div className="route-point-row">
      {showSequence && <span className="point-number">{index + 1}</span>}
      {showSequence && (
        <input
          type="number"
          min="1"
          value={point.sequence}
          onChange={(e) => onChange(index, 'sequence', e.target.value)}
          style={{ width: '60px' }}
        />
      )}
      <input
        type="number"
        step="0.0001"
        placeholder="Широта"
        value={point.latitude}
        onChange={(e) => onChange(index, 'latitude', e.target.value)}
        required
      />
      <input
        type="number"
        step="0.0001"
        placeholder="Долгота"
        value={point.longitude}
        onChange={(e) => onChange(index, 'longitude', e.target.value)}
        required
      />
      {canRemove && (
        <button type="button" className="btn ghost danger" onClick={() => onRemove(index)}>
          ×
        </button>
      )}
    </div>
  );
}

function PointProducts({ products, pointIndex, onUpdateProduct, onAddProduct, onRemoveProduct }) {
  return (
    <div className="products-block">
      <div className="section-head">
        <p>Товары</p>
        <button className="btn ghost" type="button" onClick={onAddProduct}>
          Добавить товар
        </button>
      </div>
      {products.map((product, productIndex) => (
        <div key={productIndex} className="product-row">
          <select
            value={product.productId}
            onChange={(e) => onUpdateProduct(pointIndex, productIndex, 'productId', e.target.value)}
          >
            <option value="">Выберите товар</option>
            {productsOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={product.quantity}
            onChange={(e) => onUpdateProduct(pointIndex, productIndex, 'quantity', e.target.value)}
          />
          <button
            type="button"
            className="btn ghost danger"
            onClick={() => onRemoveProduct(pointIndex, productIndex)}
          >
            ×
          </button>
        </div>
      ))}
      {products.length === 0 && <p className="muted">Добавьте товары для этой точки</p>}
    </div>
  );
}

function DeliveryRoutePoints({ points, onPointsChange }) {
  const { items, updateField, add, remove } = useCollection(points, createEmptyPoint);

  useEffect(() => {
    onPointsChange(items);
  }, [items, onPointsChange]);

  return (
    <div className="products-block">
      <div className="section-head">
        <p>Точки маршрута</p>
        <button className="btn ghost" type="button" onClick={add}>
          Добавить точку
        </button>
      </div>
      {items.map((point, idx) => (
        <PointInputRow
          key={idx}
          point={point}
          index={idx}
          onChange={updateField}
          onRemove={remove}
          canRemove={items.length > 1}
        />
      ))}
    </div>
  );
}


const createGenerationDelivery = () => ({
  route: [createEmptyPoint(1)],
  products: []
});

const createGenerationDate = () => ({
  date: '',
  deliveries: [createGenerationDelivery()]
})


export default function DeliveriesPage() {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [couriers, setCouriers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [refsError, setRefsError] = useState(null);

  const [filters, setFilters] = useState({ date: '', courier_id: '', status: '' });
  const [filterForm, setFilterForm] = useState(filters);

  const [formBase, setFormBase] = useState({
    courierId: '',
    vehicleId: '',
    deliveryDate: '',
    timeStart: '09:00',
    timeEnd: '18:00'
  });
  const {
    items: points,
    setItems: setPoints,
    add: addPoint,
    remove: removePoint,
    updateField: updatePointField
  } = useCollection([createEmptyPointWithProducts(1)], createEmptyPointWithProducts);

  const [editingDelivery, setEditingDelivery] = useState(null);
  const [formError, setFormError] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const [generationDates, setGenerationDates] = useState([createGenerationDate()]);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const {
    items: routePoints,
    add: addRoutePoint,
    remove: removeRoutePoint,
    updateField: updateRoutePointField
  } = useCollection([createEmptyPoint(1), createEmptyPoint(2)], createEmptyPoint);
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

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
  };
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
  };

  useEffect(() => {
    loadReferences();
  }, [token]);

  useEffect(() => {
    loadDeliveries();
  }, [filters, token]);

  // --- Обработчики основной формы ---
  const updateFormField = (e) => {
    const { name, value } = e.target;
    setFormBase(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePointProduct = (pointIndex, productIndex, field, value) => {
    setPoints(prev => {
      const newPoints = [...prev];
      const products = [...newPoints[pointIndex].products];
      products[productIndex] = { ...products[productIndex], [field]: value };
      newPoints[pointIndex] = { ...newPoints[pointIndex], products };
      return newPoints;
    });
  };

  const handleAddProductToPoint = (pointIndex) => {
    setPoints(prev => {
      const newPoints = [...prev];
      newPoints[pointIndex] = {
        ...newPoints[pointIndex],
        products: [...newPoints[pointIndex].products, { productId: '', quantity: 1 }]
      };
      return newPoints;
    });
  };

  const handleRemoveProductFromPoint = (pointIndex, productIndex) => {
    setPoints(prev => {
      const newPoints = [...prev];
      newPoints[pointIndex] = {
        ...newPoints[pointIndex],
        products: newPoints[pointIndex].products.filter((_, idx) => idx !== productIndex)
      };
      return newPoints;
    });
  };

  const resetForm = () => {
    setFormBase({ courierId: '', vehicleId: '', deliveryDate: '', timeStart: '09:00', timeEnd: '18:00' });
    setPoints([createEmptyPointWithProducts(1)]);
    setEditingDelivery(null);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = {
        courierId: Number(formBase.courierId),
        vehicleId: Number(formBase.vehicleId),
        deliveryDate: formBase.deliveryDate,
        timeStart: formBase.timeStart,
        timeEnd: formBase.timeEnd,
        points: points.map((point, idx) => ({
          sequence: Number(point.sequence || idx + 1),
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          products: point.products
            .filter(p => p.productId)
            .map(p => ({ productId: Number(p.productId), quantity: Number(p.quantity) }))
        }))
      };
      if (editingDelivery) {
        await api.deliveries.update(token, editingDelivery.id, payload);
      } else {
        await api.deliveries.create(token, payload);
      }
      resetForm();
      await loadDeliveries();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleEditDelivery = (delivery) => {
    if (!delivery.canEdit) return;
    setEditingDelivery(delivery);
    setFormBase({
      courierId: delivery.courier?.id || '',
      vehicleId: delivery.vehicle?.id || '',
      deliveryDate: delivery.deliveryDate,
      timeStart: delivery.timeStart,
      timeEnd: delivery.timeEnd
    });
    setPoints(
      delivery.deliveryPoints.map(point => ({
        sequence: point.sequence,
        latitude: point.latitude,
        longitude: point.longitude,
        products: point.products.map(p => ({
          productId: p.product.id,
          quantity: p.quantity
        }))
      }))
    );
  };

  const handleDeleteDelivery = async (delivery) => { /* ... */ };

  // --- Фильтры (без изменений) ---
  const applyFilters = (e) => { e.preventDefault(); setFilters(filterForm); };
  const clearFilters = () => { setFilterForm({ date: '', courier_id: '', status: '' }); setFilters({ date: '', courier_id: '', status: '' }); };

  // --- Обработчики массовой генерации (адаптированы для работы с компонентами) ---
  const addGenerationDate = () => setGenerationDates(prev => [...prev, createGenerationDate()]);
  const removeGenerationDate = (idx) => setGenerationDates(prev => prev.filter((_, i) => i !== idx));
  const updateGenerationDateField = (idx, value) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      newDates[idx] = { ...newDates[idx], date: value };
      return newDates;
    });
  };
  const addDeliveryToDate = (dateIdx) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      newDates[dateIdx].deliveries.push(createGenerationDelivery());
      return newDates;
    });
  };
  const removeDeliveryFromDate = (dateIdx, deliveryIdx) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      newDates[dateIdx].deliveries = newDates[dateIdx].deliveries.filter((_, i) => i !== deliveryIdx);
      return newDates;
    });
  };
  const updateDeliveryRoute = (dateIdx, deliveryIdx, newRoute) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      newDates[dateIdx].deliveries[deliveryIdx].route = newRoute;
      return newDates;
    });
  };
  const addProductToDelivery = (dateIdx, deliveryIdx) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      newDates[dateIdx].deliveries[deliveryIdx].products.push({ productId: '', quantity: 1 });
      return newDates;
    });
  };
  const removeProductFromDelivery = (dateIdx, deliveryIdx, productIdx) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      newDates[dateIdx].deliveries[deliveryIdx].products = newDates[dateIdx].deliveries[deliveryIdx].products.filter((_, i) => i !== productIdx);
      return newDates;
    });
  };
  const updateDeliveryProductField = (dateIdx, deliveryIdx, productIdx, field, value) => {
    setGenerationDates(prev => {
      const newDates = [...prev];
      const products = [...newDates[dateIdx].deliveries[deliveryIdx].products];
      products[productIdx] = { ...products[productIdx], [field]: value };
      newDates[dateIdx].deliveries[deliveryIdx].products = products;
      return newDates;
    });
  };

  const handleGenerateDeliveries = async (e) => {
    e.preventDefault();
    setGenerationError(null);
    try {
      const deliveryData = {};
      for (const dateEntry of generationDates) {
        if (!dateEntry.date) continue;
        deliveryData[dateEntry.date] = dateEntry.deliveries.map(delivery => ({
          route: delivery.route.map(point => ({
            sequence: Number(point.sequence),
            latitude: Number(point.latitude),
            longitude: Number(point.longitude)
          })),
          products: delivery.products
            .filter(p => p.productId)
            .map(p => ({ productId: Number(p.productId), quantity: Number(p.quantity) }))
        }));
      }
      const response = await api.deliveries.generate(token, { deliveryData });
      setGenerationResult(response);
      await loadDeliveries();
    } catch (err) {
      setGenerationError(err.message);
    }
  };

  // --- Обработчики калькулятора маршрута ---
  const handleCalculateRoute = async (e) => {
    e.preventDefault();
    setRouteError(null);
    setRouteResult(null);
    try {
      const pointsPayload = routePoints.map(p => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }));
      setCalculatingRoute(true);
      const response = await api.route.calculate(token, { points: pointsPayload });
      setRouteResult(response);
    } catch (err) {
      setRouteError(err.message);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const filteredDeliveries = useMemo(() => deliveries, [deliveries]);

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
            {points.map((point, index) => (
              <div key={index} className="point-card">
                <div className="point-card-head">
                  <strong>Точка {index + 1}</strong>
                  {points.length > 1 && (
                    <button type="button" className="btn ghost danger" onClick={() => removePoint(index)}>
                      Удалить
                    </button>
                  )}
                </div>
                <div className="point-grid">
                  <PointInputRow
                    point={point}
                    index={index}
                    onChange={updatePointField}
                    showSequence={true}
                    canRemove={false}
                  />
                </div>
                <PointProducts
                  products={point.products}
                  pointIndex={index}
                  onUpdateProduct={handleUpdatePointProduct}
                  onAddProduct={() => handleAddProductToPoint(index)}
                  onRemoveProduct={handleRemoveProductFromPoint}
                />
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
          Создайте несколько доставок на разные даты. Сервис автоматически распределит курьеров и машины.
        </p>
        {generationError && <div className="alert danger">{generationError}</div>}
        <form className="form-grid" onSubmit={handleGenerateDeliveries}>
          {generationDates.map((dateEntry, dateIdx) => (
            <div key={dateIdx} className="point-card">
              <div className="point-card-head">
                <strong>Дата {dateIdx + 1}</strong>
                {generationDates.length > 1 && (
                  <button type="button" className="btn ghost danger" onClick={() => removeGenerationDate(dateIdx)}>
                    Удалить дату
                  </button>
                )}
              </div>
              <label className="form-field">
                <span>Дата доставки</span>
                <input
                  type="date"
                  value={dateEntry.date}
                  onChange={(e) => updateGenerationDateField(dateIdx, e.target.value)}
                  required
                />
              </label>

              <div className="products-block">
                <div className="section-head">
                  <p>Доставки на эту дату</p>
                  <button className="btn ghost" type="button" onClick={() => addDeliveryToDate(dateIdx)}>
                    Добавить доставку
                  </button>
                </div>

                {dateEntry.deliveries.map((delivery, deliveryIdx) => (
                  <div key={deliveryIdx} className="nested-card">
                    <div className="point-card-head">
                      <strong>Доставка {deliveryIdx + 1}</strong>
                      {dateEntry.deliveries.length > 1 && (
                        <button
                          type="button"
                          className="btn ghost danger"
                          onClick={() => removeDeliveryFromDate(dateIdx, deliveryIdx)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>

                    <DeliveryRoutePoints
                      points={delivery.route}
                      onPointsChange={(newRoute) => updateDeliveryRoute(dateIdx, deliveryIdx, newRoute)}
                    />

                    <div className="products-block">
                      <div className="section-head">
                        <p>Товары</p>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => addProductToDelivery(dateIdx, deliveryIdx)}
                        >
                          Добавить товар
                        </button>
                      </div>
                      {delivery.products.map((product, productIdx) => (
                        <div key={productIdx} className="product-row">
                          <select
                            value={product.productId}
                            onChange={(e) =>
                              updateDeliveryProductField(dateIdx, deliveryIdx, productIdx, 'productId', e.target.value)
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
                            onChange={(e) =>
                              updateDeliveryProductField(dateIdx, deliveryIdx, productIdx, 'quantity', e.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="btn ghost danger"
                            onClick={() => removeProductFromDelivery(dateIdx, deliveryIdx, productIdx)}
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
          <button className="btn primary">Запустить генерацию</button>
        </form>
        {generationResult && (
          <div className="alert success">Создано доставок: {generationResult.totalGenerated}</div>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Расчет маршрута</h2>
          <button className="btn ghost" type="button" onClick={addRoutePoint}>
            Добавить точку
          </button>
        </div>
        <p className="muted">Быстрая проверка расстояния и времени прохождения маршрута. Минимум 2 точки.</p>
        {routeError && <div className="alert danger">{routeError}</div>}
        <form className="form-grid" onSubmit={handleCalculateRoute}>
          <div className="points-section">
            {routePoints.map((point, index) => (
              <PointInputRow
                key={index}
                point={point}
                index={index}
                onChange={updateRoutePointField}
                onRemove={removeRoutePoint}
                canRemove={routePoints.length > 2}
              />
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
                  {routeResult.suggestedTime.start} — {routeResult.suggestedTime.end}
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
  );
}