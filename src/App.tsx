import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useRol } from './hooks/useRol'
import { useRealtime } from './hooks/useRealtime'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
import { Leads } from './pages/Leads'
import { Trabajos } from './pages/Trabajos'
import { TrabajoDetalle } from './pages/TrabajoDetalle'
import { Catalogo } from './pages/Catalogo'
import { Contenido } from './pages/Contenido'
import { Config } from './pages/Config'
import { Skeleton, SkeletonKPIs } from './components/ui/Estados'

// Dashboard y Pauta son las únicas que cargan Recharts (~400 kB). Se traen
// aparte para que la captura diaria no pague por las gráficas.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Ads = lazy(() => import('./pages/Ads').then((m) => ({ default: m.Ads })))

function Arrancando() {
  return (
    <div className="min-h-dvh bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="mt-8 h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

/** Config es solo de admin. La ruta lo refleja; RLS lo hace valer. */
function SoloAdmin({ children }: { children: React.ReactNode }) {
  const { esAdmin } = useRol()
  return esAdmin ? <>{children}</> : <Navigate to="/" replace />
}

export function App() {
  const { session, perfil, cargando } = useAuth()

  // Realtime solo con sesión: sin JWT el canal no pasa RLS.
  useRealtime(Boolean(session))

  if (cargando) return <Arrancando />
  if (!session) return <Login />

  // Hay sesión pero el perfil todavía no llega (o el trigger no corrió).
  if (!perfil) return <Arrancando />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Suspense fallback={<SkeletonKPIs n={6} />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="leads" element={<Leads />} />
        <Route path="trabajos" element={<Trabajos />} />
        <Route path="trabajos/:id" element={<TrabajoDetalle />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="contenido" element={<Contenido />} />
        <Route
          path="ads"
          element={
            <Suspense fallback={<SkeletonKPIs n={4} />}>
              <Ads />
            </Suspense>
          }
        />
        <Route
          path="config"
          element={
            <SoloAdmin>
              <Config />
            </SoloAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
