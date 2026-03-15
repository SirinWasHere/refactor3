import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import VehiclesPage from './pages/VehiclesPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import DeliveriesPage from './pages/DeliveriesPage.jsx'
import CourierDeliveriesPage from './pages/CourierDeliveriesPage.jsx'
import AppLayout from './components/layout/AppLayout.jsx'

function ProtectedLayout() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <AppLayout />
}

function RoleGuard({ roles, children }) {
  const { user } = useAuth()

  if (!roles || roles.includes(user?.role)) {
    return children
  }

  return <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="/users"
          element={
            <RoleGuard roles={['admin']}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/vehicles"
          element={
            <RoleGuard roles={['admin']}>
              <VehiclesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/products"
          element={
            <RoleGuard roles={['admin']}>
              <ProductsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/deliveries"
          element={
            <RoleGuard roles={['manager']}>
              <DeliveriesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/courier/deliveries"
          element={
            <RoleGuard roles={['courier']}>
              <CourierDeliveriesPage />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
