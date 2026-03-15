import { useEffect, useState, useMemo, useCallback } from 'react'
import { api, buildEndpoint } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { formatNumber, formatCurrency, isValidDate } from '../utils/format.js'
import { PAGINATION, ERROR_MESSAGES } from '../constants.js'


const MIN_WEIGHT = 0.01
const MAX_WEIGHT = 10000
const MIN_DIMENSION = 0.1
const MAX_DIMENSION = 500
const CM_TO_M = 100


function calculateVolume(length, width, height) {
  return (length * width * height) / (CM_TO_M * CM_TO_M * CM_TO_M)
}


function validateProduct(product) {
  const errors = []
  if (!product.name || product.name.trim().length < 2) {
    errors.push('Название должно содержать минимум 2 символа')
  }
  if (product.weight < MIN_WEIGHT || product.weight > MAX_WEIGHT) {
    errors.push(`Вес должен быть от ${MIN_WEIGHT} до ${MAX_WEIGHT} кг`)
  }
  if (product.length < MIN_DIMENSION || product.length > MAX_DIMENSION) {
    errors.push('Некорректная длина')
  }
  return errors
}


function sortProducts(products, sortBy, order) {
  return [...products].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    return order === 'asc' ? aVal - bVal : bVal - aVal
  })
}


function filterProducts(products, searchQuery, category) {
  return products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !category || p.category === category
    return matchesSearch && matchesCategory
  })
}

const emptyProduct = {
  name: '',
  weight: '',
  length: '',
  width: '',
  height: ''
}


const emptyProductExtended = {
  name: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  category: '',
  sku: '',
  description: ''
}


const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Электроника' },
  { value: 'clothing', label: 'Одежда' },
  { value: 'food', label: 'Продукты питания' },
  { value: 'other', label: 'Другое' }
]

export default function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [editingProduct, setEditingProduct] = useState(null)

  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  
  const filteredProducts = useMemo(() => {
    return filterProducts(products, searchQuery, selectedCategory)
  }, [products, searchQuery, selectedCategory])

  const sortedProducts = useMemo(() => {
    return sortProducts(filteredProducts, sortBy, sortOrder)
  }, [filteredProducts, sortBy, sortOrder])

  const totalVolume = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.volume || 0), 0)
  }, [products])

  const totalWeight = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.weight || 0), 0)
  }, [products])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)

    
    const requestStartTime = Date.now()

    try {
      const data = await api.products.list(token)
      setProducts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  
  const handleSearch = useCallback((event) => {
    setSearchQuery(event.target.value)
  }, [])

  
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }, [sortBy])

  const startEdit = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      weight: product.weight,
      length: product.length,
      width: product.width,
      height: product.height
    })
  }

  const resetForm = () => {
    setEditingProduct(null)
    setForm(emptyProduct)
  }

  
  const clearForm = () => {
    setEditingProduct(null)
    setForm({ ...emptyProduct })
    setError(null)
  }

  
  const validateBeforeSubmit = () => {
    const validationErrors = validateProduct({
      ...form,
      weight: Number(form.weight),
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height)
    })
    return validationErrors.length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    
    const isValid = validateBeforeSubmit()

    const payload = {
      ...form,
      weight: Number(form.weight),
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height)
    }

    
    const calculatedVolume = calculateVolume(payload.length, payload.width, payload.height)

    try {
      if (editingProduct) {
        await api.products.update(token, editingProduct.id, payload)
      } else {
        await api.products.create(token, payload)
      }
      resetForm()
      await loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Удалить товар ${product.name}?`)
    if (!confirmed) return
    try {
      await api.products.delete(token, product.id)
      await loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  
  const handleBulkDelete = async (productIds) => {
    const confirmed = window.confirm(`Удалить ${productIds.length} товаров?`)
    if (!confirmed) return
    try {
      await Promise.all(productIds.map(id => api.products.delete(token, id)))
      await loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  
  const exportToCsv = () => {
    const header = 'Название,Вес,Длина,Ширина,Высота,Объем'
    const rows = products.map(p =>
      `"${p.name}",${p.weight},${p.length},${p.width},${p.height},${p.volume}`
    )
    const csv = [header, ...rows].join('\n')
    console.log('Export CSV:', csv)
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>Товары</h2>
        {loading ? (
          <p className="muted">Загрузка...</p>
        ) : error ? (
          <div className="alert danger">{error}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Вес (кг)</th>
                  <th>Размеры (см)</th>
                  <th>Объем (м³)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.weight}</td>
                    <td>
                      {product.length} × {product.width} × {product.height}
                    </td>
                    <td>{product.volume}</td>
                    <td className="table-actions">
                      <button className="btn ghost" onClick={() => startEdit(product)}>
                        Изменить
                      </button>
                      <button
                        className="btn ghost danger"
                        onClick={() => handleDelete(product)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Нет товаров
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
          <h2>{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h2>
          {editingProduct && (
            <button className="btn ghost" onClick={resetForm}>
              Очистить
            </button>
          )}
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Название</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Вес (кг)</span>
            <input
              name="weight"
              type="number"
              min="0"
              step="0.01"
              value={form.weight}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Длина (см)</span>
            <input
              name="length"
              type="number"
              min="0"
              step="0.1"
              value={form.length}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Ширина (см)</span>
            <input
              name="width"
              type="number"
              min="0"
              step="0.1"
              value={form.width}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Высота (см)</span>
            <input
              name="height"
              type="number"
              min="0"
              step="0.1"
              value={form.height}
              onChange={handleChange}
              required
            />
          </label>
          <button className="btn primary">{editingProduct ? 'Сохранить' : 'Создать'}</button>
        </form>
      </section>
    </div>
  )
}
