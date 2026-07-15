import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept all fetch requests to automatically add X-Tenant-ID header when impersonating
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const impersonatedId = localStorage.getItem('ll_impersonatedCompanyId');
  if (impersonatedId) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      if (!init.headers.has('X-Tenant-ID')) {
        init.headers.set('X-Tenant-ID', impersonatedId);
      }
    } else if (Array.isArray(init.headers)) {
      if (!init.headers.some(([k]) => k.toLowerCase() === 'x-tenant-id')) {
        init.headers.push(['X-Tenant-ID', impersonatedId]);
      }
    } else {
      const hasHeader = Object.keys(init.headers).some(k => k.toLowerCase() === 'x-tenant-id');
      if (!hasHeader) {
        (init.headers as Record<string, string>)['X-Tenant-ID'] = impersonatedId;
      }
    }
  }
  return originalFetch.call(this, input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
