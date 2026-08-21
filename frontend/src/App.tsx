import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import RegisterTree from './pages/RegisterTree'
import CheckIn from './pages/CheckIn'
import TreeDetail from './pages/TreeDetail'
import AdminSchools from './pages/AdminSchools'
import AdminPlots from './pages/AdminPlots'
import AdminUsers from './pages/AdminUsers'
import AdminNurseries from './pages/AdminNurseries'
import AdminSeedBatches from './pages/AdminSeedBatches'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth()

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (!token) return <Navigate to="/login" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trees/register"
            element={
              <ProtectedRoute>
                <RegisterTree />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trees/check-in"
            element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trees/:id"
            element={
              <ProtectedRoute>
                <TreeDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/schools"
            element={
              <ProtectedRoute>
                <AdminSchools />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/plots"
            element={
              <ProtectedRoute>
                <AdminPlots />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

        </Route>
        <Route
            path="/admin/nurseries"
             element={
              <ProtectedRoute>
                <AdminNurseries />
              </ProtectedRoute>
              }
          />
       <Route
           path="/admin/seed-batches"
            element={
              <ProtectedRoute>
                <AdminSeedBatches />
              </ProtectedRoute>
              }
          />
        </Routes>
      </AuthProvider>
    )
  }