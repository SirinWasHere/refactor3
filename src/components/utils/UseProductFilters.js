import { useState, useMemo, useCallback } from 'react'
import { filterProducts, sortProducts } from './ProductHelper.js'

export function useProductFilters(products) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }, [sortBy])

  const filteredProducts = useMemo(() => {
    return filterProducts(products, searchQuery, selectedCategory)
  }, [products, searchQuery, selectedCategory])

  const sortedProducts = useMemo(() => {
    return sortProducts(filteredProducts, sortBy, sortOrder)
  }, [filteredProducts, sortBy, sortOrder])

  return {
    searchQuery,
    sortBy,
    sortOrder,
    selectedCategory,
    showAdvanced,
    setSelectedCategory,
    setShowAdvanced,
    handleSearch,
    handleSort,
    filteredProducts,
    sortedProducts
  }
}