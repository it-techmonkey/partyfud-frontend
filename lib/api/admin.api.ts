import { apiRequest } from './config';

// Admin API functions
export const adminApi = {
  // Placeholder for admin-specific endpoints
  // Will be expanded as needed
  getAdminRoutes: async () => {
    return apiRequest('/api/admin');
  },

  /**
   * Get dashboard statistics including orders, GMV trends, and cuisine data
   */
  getDashboardStats: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        totalOrders: number;
        platformRevenue: number;
        activeCaterers: number;
        avgOrderValue: number;
        pendingCaterers: number;
        approvedCaterers: number;
        rejectedCaterers: number;
        blockedCaterers: number;
        ordersAndGMV: Array<{
          month: string;
          year: number;
          orders: number;
          gmv: number;
          estimate: number;
        }>;
        ordersByCuisine: Array<{
          cuisine: string;
          orders: number;
          percentage: string;
          color: string;
        }>;
        avgRating: number;
        cancellationRate: number;
        refundRate: number;
      };
    }>('/api/admin/dashboard/stats');
  },

  /**
   * Get all caterer info with optional status filter
   * @param status - Optional status filter: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'
   */
  getCatererInfo: async (status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
    const queryParam = status ? `?status=${status}` : '';
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        business_name: string;
        business_type: string;
        business_description: string | null;
        service_area: string | null;
        minimum_guests: number | null;
        maximum_guests: number | null;
        region: string | null;
        cuisines: string[];
        delivery_only: boolean;
        delivery_plus_setup: boolean;
        full_service: boolean;
        staff: number | null;
        servers: number | null;
        food_license: string | null;
        Registration: string | null;
        caterer_id: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
        created_at: string;
        updated_at: string;
        caterer: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          company_name: string | null;
          image_url: string | null;
          profile_completed: boolean;
          verified: boolean;
          created_at: string;
        };
      }>;
      count: number;
    }>(`/api/admin/catererinfo${queryParam}`);
  },

  /**
   * Get caterer info by ID
   * @param id - Caterer info ID
   */
  getCatererInfoById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        business_name: string;
        business_type: string;
        business_description: string | null;
        service_area: string | null;
        minimum_guests: number | null;
        maximum_guests: number | null;
        region: string | null;
        cuisines: string[];
        delivery_only: boolean;
        delivery_plus_setup: boolean;
        full_service: boolean;
        staff: number | null;
        servers: number | null;
        food_license: string | null;
        Registration: string | null;
        caterer_id: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
        created_at: string;
        updated_at: string;
        caterer: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          company_name: string | null;
          image_url: string | null;
          profile_completed: boolean;
          verified: boolean;
          created_at: string;
        };
      };
    }>(`/api/admin/catererinfo/${id}`);
  },

  /**
   * Update caterer info status
   * @param id - Caterer info ID
   * @param status - New status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'
   */
  updateCatererInfoStatus: async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/admin/catererinfo/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Get caterer financials
   * @param catererId - Caterer info ID (query parameter)
   * @returns Financial data including revenue, fees, and order statistics
   */
  getCatererFinancials: async (catererId: string) => {
    if (!catererId) {
      console.error('[API] getCatererFinancials: No catererId provided');
      return {
        error: "Caterer ID is required",
      };
    }
    
    const endpoint = `/api/admin/catererinfo/financials?catererId=${encodeURIComponent(catererId)}`;
    
    console.log('[API] ==========================================');
    console.log('[API] getCatererFinancials called');
    console.log('[API] Endpoint:', endpoint);
    console.log('[API] CatererId:', catererId);
    
    try {
      const response = await apiRequest<{
        success: boolean;
        data: {
          totalRevenue: number;
          commissionRate: number;
          platformFee: number;
          netPayout: number;
          completedOrdersCount: number;
          cancelledOrdersCount: number;
          pendingOrdersCount: number;
        };
      }>(endpoint);
      
      console.log('[API] apiRequest response:', JSON.stringify(response, null, 2));
      console.log('[API] response.error:', response.error);
      console.log('[API] response.data:', response.data);
      console.log('[API] response.data type:', typeof response.data);
      
      // apiRequest returns { data: {...}, status: ... } or { error: "...", status: ... }
      // Backend returns { success: true, data: {...} }
      // So response.data = { success: true, data: {...} }
      
      if (response.error) {
        console.error('[API] Error in response:', response.error);
        return { error: response.error };
      }
      
      if (!response.data) {
        console.error('[API] No data in response');
        return { error: 'No data received from server' };
      }
      
      // Extract the actual financial data from the nested structure
      if (response.data.success && response.data.data) {
        console.log('[API] ✅ Found data in response.data.success.data:', response.data.data);
        return { data: response.data.data };
      }
      
      // Fallback: if data is directly in response.data (shouldn't happen but handle it)
      if (typeof response.data === 'object' && 'totalRevenue' in response.data) {
        console.log('[API] ✅ Found data directly in response.data:', response.data);
        return { data: response.data as any };
      }
      
      // If we get here, something is wrong with the response structure
      console.error('[API] ❌ Unexpected response structure:', JSON.stringify(response, null, 2));
      console.error('[API] response.data keys:', response.data ? Object.keys(response.data) : 'N/A');
      return { error: 'Unexpected response format from server' };
    } catch (error: any) {
      console.error(`[API] Exception in getCatererFinancials:`, error);
      console.error(`[API] Error stack:`, error.stack);
      return {
        error: error.message || 'Failed to fetch financials',
      };
    } finally {
      console.log('[API] ==========================================');
    }
  },

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  // Cuisine Types
  getCuisineTypes: async () => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }>('/api/admin/metadata/cuisine-types');
  },

  createCuisineType: async (data: { name: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>('/api/admin/metadata/cuisine-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCuisineType: async (id: string, data: { name?: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/admin/metadata/cuisine-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCuisineType: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/metadata/cuisine-types/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  getCategories: async () => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
        subCategories: Array<{
          id: string;
          name: string;
          description: string | null;
          category_id: string;
        }>;
      }>;
    }>('/api/admin/metadata/categories');
  },

  createCategory: async (data: { name: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>('/api/admin/metadata/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: string, data: { name?: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/admin/metadata/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/metadata/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Sub Categories
  getSubCategories: async (categoryId?: string) => {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        category_id: string;
        created_at: string;
        updated_at: string;
        category: {
          id: string;
          name: string;
        };
      }>;
    }>(`/api/admin/metadata/subcategories${query}`);
  },

  createSubCategory: async (data: { name: string; description?: string; category_id: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        category_id: string;
        created_at: string;
        updated_at: string;
      };
    }>('/api/admin/metadata/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSubCategory: async (id: string, data: { name?: string; description?: string; category_id?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        category_id: string;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/admin/metadata/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSubCategory: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/metadata/subcategories/${id}`, {
      method: 'DELETE',
    });
  },

  // Certifications
  getCertifications: async () => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }>('/api/admin/metadata/certifications');
  },

  createCertification: async (data: { name: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>('/api/admin/metadata/certifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCertification: async (id: string, data: { name?: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/admin/metadata/certifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCertification: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/metadata/certifications/${id}`, {
      method: 'DELETE',
    });
  },

  // Occasions
  getOccasions: async () => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        image_url: string | null;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }>('/api/admin/metadata/occasions');
  },

  createOccasion: async (data: { name: string; description?: string; image_url?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        image_url: string | null;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>('/api/admin/metadata/occasions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateOccasion: async (id: string, data: { name?: string; description?: string; image_url?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        image_url: string | null;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/admin/metadata/occasions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteOccasion: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/metadata/occasions/${id}`, {
      method: 'DELETE',
    });
  },

  // Free Forms
  getFreeForms: async () => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }>('/api/admin/metadata/freeforms');
  },

  createFreeForm: async (data: { name: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>('/api/admin/metadata/freeforms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateFreeForm: async (id: string, data: { name?: string; description?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/admin/metadata/freeforms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteFreeForm: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/metadata/freeforms/${id}`, {
      method: 'DELETE',
    });
  },
  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  getAllOrders: async (params?: { status?: string; startDate?: string; endDate?: string; search?: string; catererId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.catererId) queryParams.append('catererId', params.catererId);

    const queryString = queryParams.toString();
    const url = `/api/admin/orders${queryString ? `?${queryString}` : ''}`;

    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        user_id: string;
        total_price: number;
        currency: string;
        status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
        created_at: string;
        updated_at: string;
        user: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
        };
        items: Array<{
          id: string;
          package: {
            name: string;
            caterer: {
              company_name: string | null;
              first_name: string;
              last_name: string;
            };
          };
        }>;
      }>;
    }>(url);
  },

  getOrderById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        user_id: string;
        total_price: number;
        currency: string;
        status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
        created_at: string;
        updated_at: string;
        user: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          company_name: string | null;
        };
        items: Array<{
          id: string;
          package: {
            name: string;
            caterer: {
              company_name: string | null;
              first_name: string;
              last_name: string;
              catererinfo: {
                business_name: string | null;
              } | null;
            };
          };
          add_ons: Array<{
            id: string;
            quantity: number;
            price_at_time: number;
            add_on: {
              name: string;
            };
          }>;
          price_at_time: number;
          quantity: number;
          guests: number | null;
          date: string | null;
          location: string | null;
        }>;
      };
    }>(`/api/admin/orders/${id}`);
  },
};

