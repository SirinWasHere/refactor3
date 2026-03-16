import { useState } from 'react'
import { emptyProduct } from '../../constants'
import { validateProduct } from './ProductHelper.js'

function mapProductToForm(product) {
  return {
    name: product.name,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height
  }
}

export function useProductForm(initialProduct = null) {
  const [form, setForm] = useState(initialProduct ? mapProductToForm(initialProduct) : emptyProduct)
  const [editingProduct, setEditingProduct] = useState(initialProduct)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const startEdit = (product) => {
    setEditingProduct(product)
    setForm(mapProductToForm(product))
  }

  const resetForm = () => {
    setEditingProduct(null)
    setForm(emptyProduct)
    setError(null)
  }

  const validateBeforeSubmit = () => {
    const payload = {
      ...form,
      weight: Number(form.weight),
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height)
    }
    const errors = validateProduct(payload)
    if (errors.length > 0) {
      setError(errors.join('. '))
      return false
    }
    return true
  }

  return {
    form,
    editingProduct,
    error,
    setError,
    handleChange,
    startEdit,
    resetForm,
    validateBeforeSubmit
  }
}