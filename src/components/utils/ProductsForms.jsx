import React from 'react';

export function ProductForm({
  form,
  onChange,
  onSubmit,
  onReset,
  error,
  isEditing
}) {
  return (
    <section className="card">
      <div className="section-head">
        <h2>{isEditing ? 'Редактировать товар' : 'Новый товар'}</h2>
        {isEditing && (
          <button className="btn ghost" onClick={onReset}>
            Очистить
          </button>
        )}
      </div>
      {error && <div className="alert danger">{error}</div>}
      <form className="form-grid" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Название</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
            required
          />
        </label>
        <button className="btn primary">{isEditing ? 'Сохранить' : 'Создать'}</button>
      </form>
    </section>
  );
}