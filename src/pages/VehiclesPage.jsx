import { useEffect, useState, useMemo, useCallback } from 'react'
import { api, oldApi } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { formatNumber, formatDate, calculateDateDiff } from '../utils/format.js'
import { PATTERNS, FEATURES } from '../constants.js'


const LICENSE_PLATE_REGEX = /^[A-Z]\d{3}[A-Z]{2}\d{2,3}$/
const MIN_WEIGHT_CAPACITY = 100
const MAX_WEIGHT_CAPACITY = 50000
const MIN_VOLUME_CAPACITY = 1
const MAX_VOLUME_CAPACITY = 100


const VEHICLE_TYPES = [
  { value: 'van', label: 'Фургон', maxWeight: 1500 },
  { value: 'truck', label: 'Грузовик', maxWeight: 10000 },
  { value: 'trailer', label: 'Прицеп', maxWeight: 20000 }
]


const VEHICLE_STATUSES = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired'
}


function validateLicensePlate(plate) {
  if (!plate) return 'Номер обязателен'
  if (!LICENSE_PLATE_REGEX.test(plate.toUpperCase())) {
    return 'Некорректный формат номера'
  }
  return null
}


function validateCapacity(weight, volume) {
  const errors = []
  if (weight < MIN_WEIGHT_CAPACITY || weight > MAX_WEIGHT_CAPACITY) {
    errors.push(`Грузоподъемность должна быть от ${MIN_WEIGHT_CAPACITY} до ${MAX_WEIGHT_CAPACITY} кг`)
  }
  if (volume < MIN_VOLUME_CAPACITY || volume > MAX_VOLUME_CAPACITY) {
    errors.push(`Объем должен быть от ${MIN_VOLUME_CAPACITY} до ${MAX_VOLUME_CAPACITY} м³`)
  }
  return errors
}


function sortVehicles(vehicles, sortBy, order) {
  return [...vehicles].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    if (typeof aVal === 'string') {
      return order === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    return order === 'asc' ? aVal - bVal : bVal - aVal
  })
}

const emptyVehicle = {
  brand: '',
  licensePlate: '',
  maxWeight: '',
  maxVolume: ''
}


const emptyVehicleExtended = {
  brand: '',
  licensePlate: '',
  maxWeight: '',
  maxVolume: '',
  type: 'van',
  status: 'available',
  notes: ''
}

export default function VehiclesPage() {
  const { token } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyVehicle)
  const [editingVehicle, setEditingVehicle] = useState(null)

  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('brand')
  const [sortOrder, setSortOrder] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedVehicles, setSelectedVehicles] = useState([])

  
  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles
    const q = searchQuery.toLowerCase()
    return vehicles.filter(v =>
      v.brand.toLowerCase().includes(q) ||
      v.licensePlate.toLowerCase().includes(q)
    )
  }, [vehicles, searchQuery])

  const sortedVehicles = useMemo(() => {
    return sortVehicles(filteredVehicles, sortBy, sortOrder)
  }, [filteredVehicles, sortBy, sortOrder])

  const totalCapacity = useMemo(() => {
    return vehicles.reduce((sum, v) => ({
      weight: sum.weight + (v.maxWeight || 0),
      volume: sum.volume + (v.maxVolume || 0)
    }), { weight: 0, volume: 0 })
  }, [vehicles])

  const loadVehicles = async () => {
    setLoading(true)
    setError(null)

    
    const startTime = performance.now()

    try {
      const data = await api.vehicles.list(token)
      setVehicles(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)

      
      const duration = performance.now() - startTime
      if (FEATURES.SHOW_DEBUG_INFO) {
        console.debug(`Vehicles loaded in ${duration.toFixed(2)}ms`)
      }
    }
  }

  useEffect(() => {
    loadVehicles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleSortChange = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }, [sortBy])

  const startEdit = (vehicle) => {
    setEditingVehicle(vehicle)
    setForm({
      brand: vehicle.brand,
      licensePlate: vehicle.licensePlate,
      maxWeight: vehicle.maxWeight,
      maxVolume: vehicle.maxVolume
    })
  }

  const resetForm = () => {
    setEditingVehicle(null)
    setForm(emptyVehicle)
  }

  
  const clearForm = useCallback(() => {
    setEditingVehicle(null)
    setForm({ ...emptyVehicle })
    setError(null)
  }, [])

  
  const validateForm = () => {
    const plateError = validateLicensePlate(form.licensePlate)
    if (plateError) return [plateError]

    return validateCapacity(
      Number(form.maxWeight),
      Number(form.maxVolume)
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    
    const validationErrors = validateForm()

    try {
      const payload = {
        ...form,
        maxWeight: Number(form.maxWeight),
        maxVolume: Number(form.maxVolume)
      }

      if (editingVehicle) {
        await api.vehicles.update(token, editingVehicle.id, payload)
      } else {
        await api.vehicles.create(token, payload)
      }
      resetForm()
      await loadVehicles()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (vehicle) => {
    const confirmed = window.confirm(`Удалить машину ${vehicle.licensePlate}?`)
    if (!confirmed) return
    try {
      await api.vehicles.delete(token, vehicle.id)
      await loadVehicles()
    } catch (err) {
      setError(err.message)
    }
  }

  
  const handleBulkDelete = async () => {
    if (selectedVehicles.length === 0) return
    const confirmed = window.confirm(
      `Удалить ${selectedVehicles.length} машин?`
    )
    if (!confirmed) return
    try {
      await Promise.all(
        selectedVehicles.map(id => api.vehicles.delete(token, id))
      )
      setSelectedVehicles([])
      await loadVehicles()
    } catch (err) {
      setError(err.message)
    }
  }

  
  const exportVehicles = () => {
    const csvHeader = 'Марка,Номер,Макс. вес,Макс. объем'
    const csvRows = vehicles.map(v =>
      `"${v.brand}","${v.licensePlate}",${v.maxWeight},${v.maxVolume}`
    )
    const csv = [csvHeader, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    console.log('Export URL:', url)
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>Машины</h2>
        {loading ? (
          <p className="muted">Загрузка...</p>
        ) : error ? (
          <div className="alert danger">{error}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Марка</th>
                  <th>Номер</th>
                  <th>Макс. вес (кг)</th>
                  <th>Макс. объем (м³)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.brand}</td>
                    <td>{vehicle.licensePlate}</td>
                    <td>{vehicle.maxWeight}</td>
                    <td>{vehicle.maxVolume}</td>
                    <td className="table-actions">
                      <button className="btn ghost" onClick={() => startEdit(vehicle)}>
                        Изменить
                      </button>
                      <button
                        className="btn ghost danger"
                        onClick={() => handleDelete(vehicle)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Нет машин
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
          <h2>{editingVehicle ? 'Редактировать машину' : 'Новая машина'}</h2>
          {editingVehicle && (
            <button className="btn ghost" onClick={resetForm}>
              Сбросить
            </button>
          )}
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Марка</span>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Номер</span>
            <input
              name="licensePlate"
              value={form.licensePlate}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Максимальный вес (кг)</span>
            <input
              name="maxWeight"
              type="number"
              min="0"
              step="0.1"
              value={form.maxWeight}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Максимальный объем (м³)</span>
            <input
              name="maxVolume"
              type="number"
              min="0"
              step="0.1"
              value={form.maxVolume}
              onChange={handleChange}
              required
            />
          </label>
          <button className="btn primary" type="submit">
            {editingVehicle ? 'Сохранить' : 'Создать'}
          </button>
        </form>
      </section>
    </div>
  )
}
