export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_BASE_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }
  
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Auto-detect localhost / dev environment
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${protocol}//${host}:8000`;
    }

    // Auto-detect Easypanel production host pattern
    if (host.includes('easypanel.host')) {
      if (host.includes('laundry-frontend')) {
        return `${protocol}//${host.replace('laundry-frontend', 'laundry-backend')}`;
      }
      if (host.includes('-frontend')) {
        return `${protocol}//${host.replace('-frontend', '-backend')}`;
      }
    }
  }

  // Final fallback to explicit prod URL if all else fails
  return 'https://laundry-project-laundry-backend.cocjl5.easypanel.host';
};
