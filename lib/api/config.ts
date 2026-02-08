// API Configuration
// Default to localhost:3000 for local development
// To use a different backend, set NEXT_PUBLIC_API_BASE_URL in .env.local
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number; // HTTP status code
}

// Helper function to get auth token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// Helper function to set auth token
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

// Helper function to remove auth token
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// Base fetch function with error handling
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();

  // Don't set Content-Type for FormData - browser will set it automatically with boundary
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Log warning if no token is found for protected endpoints
    if (endpoint.includes('/user/') || endpoint.includes('/caterer/') || endpoint.includes('/admin/')) {
      console.warn(`⚠️ [API] No auth token found for protected endpoint: ${endpoint}`);
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`[API Request] Making request to: ${fullUrl}`);
  console.log(`[API Request] Method: ${options.method || 'GET'}`);
  console.log(`[API Request] Headers:`, headers);
  console.log(`[API Request] Has token: ${!!token}`);
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    console.log(`[API Request] Response status: ${response.status} ${response.statusText}`);
    console.log(`[API Request] Response URL: ${response.url}`);

    clearTimeout(timeoutId);

    let data;
    const text = await response.text();
    
    console.log(`[API Request] Response text length:`, text.length);
    console.log(`[API Request] Response text (first 500 chars):`, text.substring(0, 500));

    try {
      if (text) {
        data = JSON.parse(text);
        console.log(`[API Request] Parsed JSON data:`, JSON.stringify(data, null, 2));
      } else {
        data = {}; // Handle empty response
        console.log(`[API Request] Empty response, using empty object`);
      }
    } catch (jsonError) {
      console.error(`[API Request] JSON parse error:`, jsonError);
      // If response is not JSON, allow data to be undefined or handle as needed
      // We already have the text content
      return {
        error: text || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      };
    }

    if (!response.ok) {
      // Handle different error response formats
      let errorMessage = 'An error occurred';

      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data?.message) {
        errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (data?.error) {
        // Handle nested error object
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.error?.message) {
          errorMessage = typeof data.error.message === 'string' ? data.error.message : JSON.stringify(data.error.message);
        } else {
          errorMessage = JSON.stringify(data.error);
        }
      } else if (data?.errors) {
        // Handle validation errors array
        if (Array.isArray(data.errors)) {
          errorMessage = data.errors.map((e: any) =>
            typeof e === 'string' ? e : e.message || JSON.stringify(e)
          ).join(', ');
        } else {
          errorMessage = JSON.stringify(data.errors);
        }
      }

      return {
        error: errorMessage,
        status: response.status, // Include HTTP status code
      };
    }

    const result = {
      data,
      status: response.status, // Include status code for success responses too
    };
    
    console.log(`[API Request] Returning result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error(`[API Request] ==========================================`);
    console.error(`[API Request] ERROR occurred for: ${fullUrl}`);
    console.error(`[API Request] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[API Request] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[API Request] Error name:`, error instanceof Error ? error.name : 'N/A');
    console.error(`[API Request] Error stack:`, error instanceof Error ? error.stack : 'N/A');
    console.error(`[API Request] ==========================================`);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout. Please check your connection and try again.',
        };
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          error: `Network error: Cannot connect to ${API_BASE_URL}. Please check if the backend server is running.`,
        };
      }
      return {
        error: error.message || 'Network error occurred',
      };
    }

    return {
      error: 'Network error occurred',
    };
  }
}

