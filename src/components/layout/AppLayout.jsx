import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../../state/AuthContext.jsx'

const navItems = [
  { path: '/', label: 'Дашборд', roles: ['admin', 'manager', 'courier'] },
  { path: '/users', label: 'Пользователи', roles: ['admin'] },
  { path: '/vehicles', label: 'Машины', roles: ['admin'] },
  { path: '/products', label: 'Товары', roles: ['admin'] },
  { path: '/deliveries', label: 'Доставки', roles: ['manager'] },
  { path: '/courier/deliveries', label: 'Мои доставки', roles: ['courier'] }
]

const roleLabels = {
  admin: 'Администратор',
  manager: 'Менеджер',
  courier: 'Курьер'
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const allowedItems = useMemo(() => {
    return navItems.filter((item) => item.roles.includes(user?.role))
  }, [user?.role])

  const currentLabel =
    allowedItems.find((item) => item.path === location.pathname)?.label ||
    'Панель управления'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-accent">Courier</span>
          <span>Management</span>
        </div>
        <nav className="sidebar-nav">
          {allowedItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-content">
        <header className="app-header">
          <div>
            <p className="page-subtitle">{roleLabels[user?.role] || ''}</p>
            <h1 className="page-title">{currentLabel}</h1>
          </div>
          <div className="user-box">
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-login">{user?.login}</p>
            </div>
            <button className="btn ghost" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
