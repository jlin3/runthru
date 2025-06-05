// Environment configuration for API endpoints
export const config = {
  // In development, use relative URLs (proxied by Vite)
  // In production on Vercel, use the hosted backend URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  
  // WebSocket URL for real-time features  
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || (
    import.meta.env.VITE_API_BASE_URL 
      ? import.meta.env.VITE_API_BASE_URL.replace('http', 'ws') 
      : ''
  ),
  
  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

// Helper function to construct API URLs
export function getApiUrl(endpoint: string): string {
  // Remove leading slash from endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (config.API_BASE_URL) {
    return `${config.API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // Fallback to relative URL for development
  return `/${cleanEndpoint}`;
}

// Helper function to construct WebSocket URLs  
export function getWsUrl(endpoint: string = ''): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (config.WS_BASE_URL) {
    return cleanEndpoint ? `${config.WS_BASE_URL}/${cleanEndpoint}` : config.WS_BASE_URL;
  }
  
  // Fallback for development
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  return cleanEndpoint ? `${wsUrl}/${cleanEndpoint}` : `${wsUrl}/ws`;
} 