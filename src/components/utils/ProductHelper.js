import { MIN_WEIGHT, MAX_WEIGHT, MIN_DIMENSION, MAX_DIMENSION, CM_TO_M } from '../../constants'

export function calculateVolume(length, width, height) {
  return (length * width * height) / (CM_TO_M * CM_TO_M * CM_TO_M)
}

export function validateProduct(product) {
  const errors = []
  if (!product.name || product.name.trim().length < 2) {
    errors.push('Название должно содержать минимум 2 символа')
  }
  if (product.weight < MIN_WEIGHT || product.weight > MAX_WEIGHT) {
    errors.push(`Вес должен быть от ${MIN_WEIGHT} до ${MAX_WEIGHT} кг`)
  }
  if (product.length < MIN_DIMENSION || product.length > MAX_DIMENSION) {
    errors.push(`Длина должна быть от ${MIN_DIMENSION} до ${MAX_DIMENSION} см`)
  }
  return errors
}

export function sortProducts(products, sortBy, order) {
  return [...products].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    if (typeof aVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return order === 'asc' ? aVal - bVal : bVal - aVal
  })
}

export function filterProducts(products, searchQuery, category) {
  return products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !category || p.category === category
    return matchesSearch && matchesCategory
  })
}