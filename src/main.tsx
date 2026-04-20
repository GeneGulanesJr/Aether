import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.tsx'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Retry failed requests up to 2 times.
       * Avoids hammering R2 on transient network issues.
       */
      retry: 2,
      /**
       * Data is considered fresh for 5 minutes.
       * Catalog changes infrequently — no need to refetch on every focus.
       */
      staleTime: 5 * 60 * 1000,
      /**
       * Keep cached data for 30 minutes before garbage collection.
       * Allows returning to the page without a full reload.
       */
      gcTime: 30 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
