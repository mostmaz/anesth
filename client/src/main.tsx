import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './theme/icu-design.css'
import { ThemeProvider } from './theme/ThemeProvider'
import { LanguageProvider } from './i18n'
import App from './App.tsx'
import { installGlobalErrorReporting } from './api/errorReport'

// Errors nobody handled are reported to our own server (text and stack only).
installGlobalErrorReporting()

// A fresh page load clears the "reloaded once for an update" marker after a
// while, so a later update can trigger its own reload.
try {
  const mark = Number(sessionStorage.getItem('reloaded-for-update') || 0)
  if (mark && Date.now() - mark > 60_000) sessionStorage.removeItem('reloaded-for-update')
} catch { /* ignore */ }

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>,
)
