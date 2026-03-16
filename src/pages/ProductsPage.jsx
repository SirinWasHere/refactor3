import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/endpoints.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useProductForm } from '../components/utils/UseProductForm.js'
import { useProductFilters } from '../components/utils/UseProductFilters.js'
import { PRODUCT_CATEGORIES } from '../constants'

export default function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    form,
    editingProduct,
    error: formError,
    setError: setFormError,
    handleChange,
    startEdit,
    resetForm,
    validateBeforeSubmit
  } = useProductForm()

  const {
    searchQuery,
    selectedCategory,
    showAdvanced,
    setSelectedCategory,
    setShowAdvanced,
    handleSearch,
    handleSort,
    sortedProducts
  } = useProductFilters(products)

  const totalVolume = useMemo(() => products.reduce((sum, p) => sum + (p.volume || 0), 0), [products])
  const totalWeight = useMemo(() => products.reduce((sum, p) => sum + (p.weight || 0), 0), [products])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
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
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateBeforeSubmit()) return

    const payload = {
      ...form,
      weight: Number(form.weight),
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height)
    }

    try {
      if (editingProduct) {
        await api.products.update(token, editingProduct.id, payload)
      } else {
        await api.products.create(token, payload)
      }
      resetForm()
      await loadProducts()
    } catch (err) {
      setFormError(err.message)
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
                {sortedProducts.map((product) => (
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
        {formError && <div className="alert danger">{formError}</div>}
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