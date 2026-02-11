import { apiRequest } from './config';

// Types
export interface FilterCaterersParams {
  location?: string;
  guests?: number;
  minGuests?: number;
  maxGuests?: number;
  date?: string;
  minBudget?: number;
  maxBudget?: number;
  menuType?: {
    fixed?: boolean;
    customizable?: boolean;
    liveStations?: boolean;
  };
  search?: string;
  occasionId?: string;
  dietaryNeeds?: string[];
}

export interface Caterer {
  id: string;
  slug?: string;
  name: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  email: string;
  phone: string;
  image_url?: string;
  cuisines: string[];
  location: string;
  minPrice: number;
  maxPrice: number;
  priceRange: string;
  description: string;
  minimum_guests?: number;
  maximum_guests?: number;
  service_area?: string;
  delivery_only: boolean;
  delivery_plus_setup: boolean;
  full_service: boolean;
  gallery_images?: string[];
  packages: Package[];
  packages_count: number;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  minimum_people: number; // Minimum number of people for this package
  people_count?: number; // Legacy field - kept for backward compatibility during migration
  cover_image_url?: string;
  total_price: number; // Price set by caterer or calculated from dishes × minimum_people × quantity
  is_custom_price?: boolean; // True if price was manually set by caterer (won't scale with guest count)
  price_per_person?: number; // Calculated field: total_price / minimum_people (for backward compatibility)
  currency: string;
  rating?: number;
  is_available: boolean;
  customisation_type?: 'FIXED' | 'CUSTOMISABLE' | 'CUSTOMIZABLE';
  created_by?: 'USER' | 'CATERER';
  user_id?: string | null;
  additional_info?: string;
  items: any[];
  category_selections: any[];
  occasions: Array<{
    id: string;
    occasion: {
      id: string;
      name: string;
      image_url?: string | null;
    };
  }>;
  add_ons?: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    is_active: boolean;
  }>;
  caterer?: {
    id: string;
    slug?: string;
    name: string;
    location?: string | null;
  };
}

export interface Dish {
  id: string;
  name: string;
  image_url?: string | null;
  cuisine_type: {
    id: string;
    name: string;
    description?: string | null;
  };
  category: {
    id: string;
    name: string;
    description?: string | null;
  };
  sub_category?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  caterer?: {
    id: string;
    name: string;
    location?: string | null;
  } | null;
  quantity?: string | null;
  pieces: number;
  price: number;
  serves_people?: number | null;
  currency: string;
  is_active: boolean;
  free_forms: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  created_at: string;
  updated_at: string;
}

export interface Occasion {
  id: string;
  name: string;
  image_url?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// User API functions
export const userApi = {
  /**
   * Filter and fetch all caterers
   * POST /api/user/caterers
   */
  filterCaterers: async (filters: FilterCaterersParams) => {
    const response = await apiRequest<{ success: boolean; data: Caterer[]; count: number }>(
      '/api/user/caterers',
      {
        method: 'POST',
        body: JSON.stringify(filters),
      }
    );
    return response;
  },

  /**
   * Get caterer by slug (or ID for backward compatibility)
   * GET /api/user/caterers/:slugOrId
   */
  getCatererById: async (slugOrId: string) => {
    const response = await apiRequest<{ success: boolean; data: Caterer }>(
      `/api/user/caterers/${slugOrId}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get packages by caterer slug or ID
   * GET /api/user/packages?caterer_id=xxx
   */
  getPackagesByCatererId: async (slugOrId?: string) => {
    const url = slugOrId
      ? `/api/user/packages?caterer_id=${slugOrId}`
      : '/api/user/packages';
    const response = await apiRequest<{ success: boolean; data: Package[]; count: number }>(
      url,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get package by ID
   * GET /api/user/packages/:packageId
   */
  getPackageById: async (packageId: string) => {
    const response = await apiRequest<{ success: boolean; data: Package }>(
      `/api/user/packages/${packageId}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all packages with filters
   * GET /api/user/packages/all?location=xxx&min_price=xxx&max_price=xxx&...
   */
  getAllPackages: async (filters?: {
    caterer_id?: string;
    location?: string;
    region?: string;
    min_guests?: number;
    max_guests?: number;
    min_price?: number;
    max_price?: number;
    occasion_id?: string;
    occasion_name?: string;
    cuisine_type_id?: string;
    category_id?: string;
    package_type?: string;
    search?: string;
    menu_type?: 'fixed' | 'customizable';
    sort_by?: 'price_asc' | 'price_desc' | 'rating_desc' | 'created_desc';
    created_by?: 'USER' | 'CATERER';
    dish_id?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest<{ success: boolean; data: Package[]; count: number; filters?: any }>(
      `/api/user/packages/all${query}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all dishes with filters
   * GET /api/user/dishes?caterer_id=xxx&cuisine_type_id=xxx&category_id=xxx&...
   */
  getAllDishes: async (filters?: {
    caterer_id?: string;
    cuisine_type_id?: string;
    category_id?: string;
    sub_category_id?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    is_active?: boolean;
    group_by_category?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest<{ success: boolean; data: Dish[] | { categories: Array<{ category: any; dishes: Dish[] }> }; count: number }>(
      `/api/user/dishes${query}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get dish by ID
   * GET /api/user/dishes/:id
   */
  getDishById: async (dishId: string) => {
    const response = await apiRequest<{ success: boolean; data: Dish }>(
      `/api/user/dishes/${dishId}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all cuisine types
   * GET /api/user/metadata/cuisine-types
   */
  getCuisineTypes: async () => {
    const response = await apiRequest<{ success: boolean; data: Array<{ id: string; name: string; description?: string | null }> }>(
      '/api/user/metadata/cuisine-types',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all occasions
   * GET /api/user/occasions
   */
  getOccasions: async () => {
    const response = await apiRequest<{ success: boolean; data: Array<{ id: string; name: string; image_url?: string | null; description?: string | null; created_at: string; updated_at: string }>; count: number }>(
      '/api/user/occasions',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all package types (Menu Types)
   * GET /api/user/metadata/package-types
   */
  getPackageTypes: async () => {
    const response = await apiRequest<{ success: boolean; data: Array<{ id: string; name: string; description?: string }> }>(
      '/api/user/metadata/package-types',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all dietary needs
   * GET /api/user/metadata/dietary-needs
   */
  getDietaryNeeds: async () => {
    const response = await apiRequest<{ success: boolean; data: Array<{ id: string; name: string }> }>(
      '/api/user/metadata/dietary-needs',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get all cart items
   * GET /api/user/cart/items
   */
  getCartItems: async () => {
    const response = await apiRequest<{ success: boolean; data: any[]; count: number }>(
      '/api/user/cart/items',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Create a cart item
   * POST /api/user/cart/items
   */
  createCartItem: async (data: {
    package_id: string;
    location?: string;
    guests?: number;
    date?: string;
    event_time?: string;
    event_type?: string;
    area?: string;
    price_at_time?: number;
    add_ons?: Array<{
      add_on_id: string;
      quantity?: number;
    }>;
  }) => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      '/api/user/cart/items',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Update a cart item
   * PUT /api/user/cart/items/:cartItemId
   */
  updateCartItem: async (cartItemId: string, data: {
    location?: string;
    guests?: number;
    date?: string;
    price_at_time?: number;
  }) => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/api/user/cart/items/${cartItemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Delete a cart item
   * DELETE /api/user/cart/items/:cartItemId
   */
  deleteCartItem: async (cartItemId: string) => {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/api/user/cart/items/${cartItemId}`,
      {
        method: 'DELETE',
      }
    );
    return response;
  },

  /**
   * Get all orders
   * GET /api/user/orders
   */
  getOrders: async () => {
    const response = await apiRequest<{ success: boolean; data: any[]; count: number }>(
      '/api/user/orders',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get order by ID
   * GET /api/user/orders/:orderId
   */
  getOrderById: async (orderId: string) => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/api/user/orders/${orderId}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Create an order
   * POST /api/user/orders
   */
  createOrder: async (data: {
    cart_item_ids?: string[];
    items?: Array<{
      package_id: string;
      location?: string;
      guests?: number;
      date?: string;
      price_at_time: number;
    }>;
  }) => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      '/api/user/orders',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Update an order
   * PUT /api/user/orders/:orderId
   */
  updateOrder: async (orderId: string, data: {
    status?: string;
    total_price?: number;
  }) => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/api/user/orders/${orderId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Delete an order
   * DELETE /api/user/orders/:orderId
   */
  deleteOrder: async (orderId: string) => {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/api/user/orders/${orderId}`,
      {
        method: 'DELETE',
      }
    );
    return response;
  },

  /**
   * Get all dishes by caterer ID
   * GET /api/user/caterers/:catererId/dishes
   */
  getDishesByCatererId: async (catererId: string) => {
    const response = await apiRequest<{ success: boolean; data: Dish[]; count: number }>(
      `/api/user/caterers/${catererId}/dishes`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Create a proposal
   * POST /api/user/proposals
   */
  createProposal: async (data: {
    caterer_id: string;
    event_type?: string;
    location?: string;
    dietary_preferences?: string[];
    budget_per_person?: number | string;
    event_date?: string;
    vision?: string;
    guest_count: number;
  }) => {
    const response = await apiRequest<{ success: boolean; data: any; message: string }>(
      '/api/user/proposals',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Get all proposals
   * GET /api/user/proposals
   */
  getProposals: async () => {
    const response = await apiRequest<{ success: boolean; data: any[]; count: number }>(
      '/api/user/proposals',
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Get proposal by ID
   * GET /api/user/proposals/:proposalId
   */
  getProposalById: async (proposalId: string) => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/api/user/proposals/${proposalId}`,
      {
        method: 'GET',
      }
    );
    return response;
  },

  /**
   * Create a custom package
   * POST /api/user/packages
   */
  createCustomPackage: async (data: {
    name?: string;
    dish_ids: string[];
    people_count: number;
    quantities?: { [dish_id: string]: number };
  }) => {
    const response = await apiRequest<{ success: boolean; data: Package }>(
      '/api/user/packages',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Get packages created by the authenticated user
   * GET /api/user/packages/my-packages
   */
  getMyPackages: async (filters?: {
    search?: string;
    min_price?: number;
    max_price?: number;
    min_guests?: number;
    max_guests?: number;
    sort_by?: 'price_asc' | 'price_desc' | 'rating_desc' | 'created_desc';
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest<{ success: boolean; data: Package[]; count: number }>(
      `/api/user/packages/my-packages${query}`,
      {
        method: 'GET',
      }
    );
    return response;
  },
};

