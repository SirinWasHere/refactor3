import { useEffect, useMemo } from 'react';
import { useProducts } from '../components/utils/UseProducts.js';
import { useProductForm } from '../components/utils/UseProductForm.js';
import { useProductFilters } from '../components/utils/UseProductFilters.js';
import { ProductTable } from '../components/utils/ProductsTables.jsx';
import { ProductForm } from '../components/utils/ProductsForms.jsx';

export default function ProductsPage() {
  const {
    products,
    loading,
    error,
    handleSubmit: submitProduct,
    handleDelete,
    exportToCsv,
    setError
  } = useProducts();

  const {
    form,
    editingProduct,
    error: formError,
    setError: setFormError,
    handleChange,
    startEdit,
    resetForm,
    validateBeforeSubmit
  } = useProductForm();

  const {
    searchQuery,
    selectedCategory,
    showAdvanced,
    setSelectedCategory,
    setShowAdvanced,
    handleSearch,
    handleSort,
    sortedProducts
  } = useProductFilters(products);

  const totalVolume = useMemo(() => products.reduce((sum, p) => sum + (p.volume || 0), 0), [products]);
  const totalWeight = useMemo(() => products.reduce((sum, p) => sum + (p.weight || 0), 0), [products]);

  useEffect(() => {
    const { loadProducts } = useProducts();
  }, []);

  const onFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateBeforeSubmit()) return;
    await submitProduct(form, editingProduct, resetForm, setFormError);
  };

  if (loading) {
    return (
      <div className="grid two">
        <section className="card">
          <h2>Товары</h2>
          <p className="muted">Загрузка...</p>
        </section>
        <ProductForm
          form={form}
          onChange={handleChange}
          onSubmit={onFormSubmit}
          onReset={resetForm}
          error={formError}
          isEditing={!!editingProduct}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid two">
        <section className="card">
          <h2>Товары</h2>
          <div className="alert danger">{error}</div>
        </section>
        <ProductForm
          form={form}
          onChange={handleChange}
          onSubmit={onFormSubmit}
          onReset={resetForm}
          error={formError}
          isEditing={!!editingProduct}
        />
      </div>
    );
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>Товары</h2>
        <ProductTable
          products={sortedProducts}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </section>
      <ProductForm
        form={form}
        onChange={handleChange}
        onSubmit={onFormSubmit}
        onReset={resetForm}
        error={formError}
        isEditing={!!editingProduct}
      />
    </div>
  );
}