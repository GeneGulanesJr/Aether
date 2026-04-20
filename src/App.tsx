import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BuilderPage } from './pages/BuilderPage'

export function App() {
  return (
    <AppShell>
      <ErrorBoundary>
        <BuilderPage />
      </ErrorBoundary>
    </AppShell>
  )
}
