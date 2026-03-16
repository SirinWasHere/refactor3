import { useState, useCallback, useEffect } from 'react';
import { api } from '../../api/endpoints.js';
import { useAuth } from '../../state/AuthContext.jsx';

export function useProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.products.list(token);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSubmit = useCallback(async (form, editingProduct, resetForm, setFormError) => {
    const payload = {
      ...form,
      weight: Number(form.weight),
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height)
    };

    try {
      if (editingProduct) {
        await api.products.update(token, editingProduct.id, payload);
      } else {
        await api.products.create(token, payload);
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      setFormError(err.message);
    }
  }, [token, loadProducts]);

  const handleDelete = useCallback(async (product) => {
    const confirmed = window.confirm(`Удалить товар ${product.name}?`);
    if (!confirmed) return;
    try {
      await api.products.delete(token, product.id);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }, [token, loadProducts]);

  const handleBulkDelete = useCallback(async (productIds) => {
    const confirmed = window.confirm(`Удалить ${productIds.length} товаров?`);
    if (!confirmed) return;
    try {
      await Promise.all(productIds.map(id => api.products.delete(token, id)));
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }, [token, loadProducts]);

  const exportToCsv = useCallback(() => {
    const header = 'Название,Вес,Длина,Ширина,Высота,Объем';
    const rows = products.map(p =>
      `"${p.name}",${p.weight},${p.length},${p.width},${p.height},${p.volume}`
    );
    const csv = [header, ...rows].join('\n');
    console.log('Export CSV:', csv);
  }, [products]);

  return {
    products,
    loading,
    error,
    loadProducts,
    handleSubmit,
    handleDelete,
    handleBulkDelete,
    exportToCsv,
    setError
  };
}