import { formatDate, formatNumber, formatTime } from '../../utils/format.js'

export default function DeliveryDetails({ delivery, onClose }) {
  if (!delivery) return null

  return (
    <div className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="muted">Доставка</p>
          <h2>{delivery.deliveryNumber || `DEL-${delivery.id}`}</h2>
        </div>
        {onClose && (
          <button className="btn ghost" onClick={onClose}>
            Закрыть
          </button>
        )}
      </div>
      <div className="detail-grid">
        <div>
          <p className="muted">Дата</p>
          <p>{formatDate(delivery.deliveryDate)}</p>
        </div>
        <div>
          <p className="muted">Время</p>
          <p>
            {formatTime(delivery.timeStart)} — {formatTime(delivery.timeEnd)}
          </p>
        </div>
        <div>
          <p className="muted">Статус</p>
          <span className={`tag ${delivery.status}`}>{delivery.status}</span>
        </div>
        <div>
          <p className="muted">Вес / объем</p>
          <p>
            {formatNumber(delivery.totalWeight)} кг ·{' '}
            {formatNumber(delivery.totalVolume)} м³
          </p>
        </div>
      </div>

      <section className="detail-section">
        <h3>Маршрут</h3>
        <ol className="point-list">
          {delivery.deliveryPoints.map((point) => (
            <li key={point.id}>
              <div>
                <strong>Точка {point.sequence}</strong>
                <p className="muted">
                  {point.latitude}, {point.longitude}
                </p>
              </div>
              <ul>
                {point.products.map((item) => (
                  <li key={item.id} className="muted">
                    {item.product.name} — {item.quantity} шт.
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
