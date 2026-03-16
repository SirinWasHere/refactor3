import React from 'react';

export function ProductTable({ products, onEdit, onDelete }) {
  if (products.length === 0) {
    return (
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
            <tr>
              <td colSpan={5} className="muted">Нет товаров</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
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
              <td>{product.length} × {product.width} × {product.height}</td>
              <td>{product.volume}</td>
              <td className="table-actions">
                <button className="btn ghost" onClick={() => onEdit(product)}>
                  Изменить
                </button>
                <button
                  className="btn ghost danger"
                  onClick={() => onDelete(product)}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}