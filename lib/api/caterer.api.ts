import { apiRequest } from './config';

// Dish Types
export interface Dish {
  id: string;
  name: string;
  image_url?: string;
  cuisine_type_id: string;
  category_id: string;
  sub_category_id?: string;
  quantity?: string;
  pieces?: number;
  price: number;
  serves_people?: number;
  currency: string;
  is_active: boolean;
  rating?: number;
  caterer_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDishRequest {
  name: string;
  image_url?: string;
  cuisine_type_id: string;
  category_id: string;
  sub_category_id?: string;
  quantity?: string;
  pieces?: number;
  price: number;
  serves_people?: number;
  currency?: string;
  is_active?: boolean;
  free_form?: string;
  freeform_ids?: string[];
}

export interface UpdateDishRequest {
  name?: string;
  image_url?: string;
  cuisine_type_id?: string;
  category_id?: string;
  sub_category_id?: string;
  quantity?: string;
  pieces?: number;
  price?: number;
  serves_people?: number;
  currency?: string;
  is_active?: boolean;
  freeform_ids?: string[];
}

// Package Types
export interface Package {
  id: string;
  name: string;
  people_count: number;
  cover_image_url?: string;
  total_price: number; // Price set by caterer or calculated from dishes
  is_custom_price?: boolean; // True if price was manually set by caterer (won't scale with guest count)
  currency: string;
  rating?: number;
  is_active: boolean;
  is_available: boolean;
  caterer_id: string;
  created_at: string;
  updated_at: string;
  occasions?: Array<{ occassion?: { id: string; name: string }; id?: string; name?: string }>;
}

export interface CategorySelection {
  category_id: string;
  num_dishes_to_select: number | null; // null = select all, number = select exactly that many
}

export interface CreatePackageRequest {
  name: string;
  description?: string;
  minimum_people?: number; // Optional - defaults to caterer's minimum_guests
  cover_image_url?: string;
  total_price?: number; // Optional - if provided, this price is used (regardless of number of people); if not provided, will be calculated from items
  is_custom_price?: boolean; // True if total_price was manually set by caterer (won't scale with guest count)
  currency?: string;
  // rating?: number;
  occassion: string[];
  is_active?: boolean;
  is_available?: boolean;
  customisation_type?: "FIXED" | "CUSTOMISABLE";
  additional_info?: string; // Extra pricing and services information
  package_item_ids?: string[];
  category_selections?: CategorySelection[];
}

export interface UpdatePackageRequest {
  name?: string;
  description?: string;
  minimum_people?: number; // Optional - defaults to caterer's minimum_guests
  cover_image_url?: string;
  total_price?: number; // Optional - if provided, this price is used (regardless of number of people); if not provided, will be recalculated from items
  is_custom_price?: boolean; // True if total_price was manually set by caterer (won't scale with guest count)
  currency?: string;
  rating?: number;
  occassion?: string[];
  is_active?: boolean;
  is_available?: boolean;
  customisation_type?: "FIXED" | "CUSTOMISABLE";
  additional_info?: string; // Extra pricing and services information
  package_item_ids?: string[];
  category_selections?: CategorySelection[];
}

// Dashboard Types
export interface DashboardStats {
  dishes: {
    total: number;
    active: number;
    inactive: number;
  };
  packages: {
    total: number;
    active: number;
    available: number;
    inactive: number;
  };
  packageItems: {
    total: number;
    draft: number;
    linked: number;
  };
  financial: {
    averagePackagePrice: number;
    totalRevenuePotential: number;
    currency: string;
  };
  recent: {
    dishes: Array<{
      id: string;
      name: string;
      image_url: string | null;
      price: number;
      currency: string;
      is_active: boolean;
      created_at: string;
    }>;
    packages: Array<{
      id: string;
      name: string;
      cover_image_url: string | null;
      total_price: number;
      currency: string;
      people_count: number;
      is_available: boolean;
      created_at: string;
    }>;
  };
}

// Caterer API functions
export const catererApi = {
  // Dishes
  getAllDishes: async (filters?: { cuisine_type_id?: string; category_id?: string; group_by_category?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.cuisine_type_id) params.append('cuisine_type_id', filters.cuisine_type_id);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.group_by_category) params.append('group_by_category', 'true');

    const queryString = params.toString();
    const endpoint = `/api/caterer/dishes${queryString ? `?${queryString}` : ''}`;

    return apiRequest<any>(endpoint);
  },

  getDishById: async (id: string) => {
    return apiRequest<Dish>(`/api/caterer/dishes/${id}`);
  },

  createDish: async (data: CreateDishRequest, imageFile?: File) => {
    const formData = new FormData();

    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Add other fields
    formData.append('name', data.name);
    formData.append('cuisine_type_id', data.cuisine_type_id);
    formData.append('category_id', data.category_id);
    if (data.sub_category_id) {
      formData.append('sub_category_id', data.sub_category_id);
    }
    if (data.quantity) {
      formData.append('quantity', data.quantity);
    }
    if (data.pieces) {
      formData.append('pieces', data.pieces.toString());
    }
    formData.append('price', data.price.toString());
    if (data.serves_people !== undefined && data.serves_people !== null) {
      formData.append('serves_people', data.serves_people.toString());
    }
    if (data.currency) {
      formData.append('currency', data.currency);
    }
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active.toString());
    }
    if (data.image_url) {
      formData.append('image_url', data.image_url);
    }
    // Add freeform_ids as array (append each one with the same key)
    if (data.freeform_ids && data.freeform_ids.length > 0) {
      data.freeform_ids.forEach((id) => {
        formData.append('freeform_ids', id);
      });
    }

    return apiRequest<Dish>('/api/caterer/dishes', {
      method: 'POST',
      body: formData,
    });
  },

  updateDish: async (id: string, data: UpdateDishRequest, imageFile?: File) => {
    if (imageFile) {
      // Use FormData for file upload
      const formData = new FormData();

      // Add all dish data fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'freeform_ids') {
          // For serves_people, only send if it has a valid value (not empty string)
          if (key === 'serves_people') {
            if (value !== '' && value !== null) {
              formData.append(key, value.toString());
            }
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add freeform_ids as array
      if (data.freeform_ids && data.freeform_ids.length > 0) {
        data.freeform_ids.forEach((id) => {
          formData.append('freeform_ids', id);
        });
      }

      // Add image file
      formData.append('image', imageFile);

      // Don't set Content-Type - browser will set it with boundary for FormData
      return apiRequest<Dish>(`/api/caterer/dishes/${id}`, {
        method: 'PUT',
        body: formData,
        headers: {}, // Override default Content-Type header for FormData
      });
    } else {
      // Regular JSON request without image - filter out undefined and null serves_people
      const cleanedData = { ...data };
      if (cleanedData.serves_people === null || cleanedData.serves_people === undefined) {
        cleanedData.serves_people = undefined;
      }
      return apiRequest<Dish>(`/api/caterer/dishes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(cleanedData),
      });
    }
  },

  deleteDish: async (id: string) => {
    return apiRequest(`/api/caterer/dishes/${id}`, {
      method: 'DELETE',
    });
  },

  // Packages
  getAllPackages: async () => {
    return apiRequest<Package[]>('/api/caterer/packages');
  },

  getPackageById: async (id: string) => {
    return apiRequest<Package>(`/api/caterer/packages/${id}`);
  },

  createPackage: async (data: CreatePackageRequest, imageFile?: File) => {
    const formData = new FormData();

    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Add other fields
    formData.append('name', data.name);
    if (data.minimum_people !== undefined) {
      formData.append('minimum_people', data.minimum_people.toString());
    }
    // total_price is optional - if provided, this price is used; if not provided, will be calculated from items
    if (data.total_price !== undefined && data.total_price !== null) {
      formData.append('total_price', data.total_price.toString());
      formData.append('is_custom_price', 'true'); // Mark as custom price
    } else {
      formData.append('is_custom_price', 'false'); // Not a custom price, calculate from items
    }
    if (data.currency) {
      formData.append('currency', data.currency);
    }
    if (data.occassion !== undefined) {
      formData.append('occassion', JSON.stringify(data.occassion));
    }
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active.toString());
    }
    if (data.is_available !== undefined) {
      formData.append('is_available', data.is_available.toString());
    }
    if (data.cover_image_url) {
      formData.append('cover_image_url', data.cover_image_url);
    }
    // Add package_item_ids as comma-separated string or array
    if (data.package_item_ids && data.package_item_ids.length > 0) {
      formData.append('package_item_ids', data.package_item_ids.join(','));
    }
    // Add customisation_type
    if (data.customisation_type) {
      formData.append('customisation_type', data.customisation_type);
    }
    // Add category_selections as JSON string
    if (data.category_selections && data.category_selections.length > 0) {
      formData.append('category_selections', JSON.stringify(data.category_selections));
    }
    // Add additional_info
    if (data.additional_info) {
      formData.append('additional_info', data.additional_info);
    }

    return apiRequest<Package>('/api/caterer/packages', {
      method: 'POST',
      body: formData,
    });
  },

  updatePackage: async (id: string, data: UpdatePackageRequest, imageFile?: File) => {
    const formData = new FormData();

    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Add other fields only if they are defined
    if (data.name !== undefined) {
      formData.append('name', data.name);
    }
    if (data.description !== undefined) {
      formData.append('description', data.description);
    }
    if (data.minimum_people !== undefined) {
      formData.append('minimum_people', data.minimum_people.toString());
    }
    // Handle total_price and is_custom_price
    if (data.is_custom_price !== undefined) {
      formData.append('is_custom_price', data.is_custom_price.toString());
      if (data.is_custom_price && data.total_price !== undefined && data.total_price !== null) {
        formData.append('total_price', data.total_price.toString());
      }
    } else if (data.total_price !== undefined && data.total_price !== null) {
      // Legacy: if total_price is provided but is_custom_price is not, assume it's custom
      formData.append('total_price', data.total_price.toString());
      formData.append('is_custom_price', 'true');
    }
    if (data.currency !== undefined) {
      formData.append('currency', data.currency);
    }
    if (data.occassion !== undefined) {
      formData.append('occassion', JSON.stringify(data.occassion));
    }
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active.toString());
    }
    if (data.is_available !== undefined) {
      formData.append('is_available', data.is_available.toString());
    }
    if (data.cover_image_url !== undefined) {
      formData.append('cover_image_url', data.cover_image_url);
    }
    // Always send package_item_ids (empty array for CUSTOMISABLE packages means all dishes available)
    if (data.package_item_ids !== undefined) {
      formData.append('package_item_ids', data.package_item_ids.length > 0 
        ? data.package_item_ids.join(',') 
        : '');
    }
    if (data.customisation_type !== undefined) {
      formData.append('customisation_type', data.customisation_type);
    }
    if (data.category_selections && data.category_selections.length > 0) {
      formData.append('category_selections', JSON.stringify(data.category_selections));
    }
    // Add additional_info
    if (data.additional_info !== undefined) {
      formData.append('additional_info', data.additional_info);
    }

    return apiRequest<Package>(`/api/caterer/packages/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  deletePackage: async (id: string) => {
    return apiRequest<void>(`/api/caterer/packages/${id}`, {
      method: 'DELETE',
    });
  },

  // Metadata
  getCuisineTypes: async () => {
    return apiRequest<Array<{ id: string; name: string; description?: string }>>('/api/caterer/metadata/cuisine-types');
  },

  getCategories: async () => {
    return apiRequest<Array<{ id: string; name: string; description?: string }>>('/api/caterer/metadata/categories');
  },

  getSubCategories: async (categoryId?: string) => {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return apiRequest<Array<{ id: string; name: string; description?: string; category_id: string }>>(`/api/caterer/metadata/subcategories${query}`);
  },

  getFreeForms: async () => {
    return apiRequest<Array<{ id: string; name: string; description?: string }>>('/api/caterer/metadata/freeforms');
  },

  getPackageTypes: async () => {
    return apiRequest<Array<{ id: string; name: string; description?: string; image_url?: string }>>('/api/caterer/metadata/package-types');
  },

  // Package Items
  getAllPackageItems: async (packageId?: string, draft?: boolean) => {
    const params = new URLSearchParams();
    if (packageId) {
      params.append('package_id', packageId);
    }
    if (draft) {
      params.append('draft', 'true');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any>(`/api/caterer/packages/items${query}`);
  },

  createPackageItem: async (data: {
    dish_id: string;
    people_count: number;
    quantity?: string;
    price_at_time?: number;
    is_optional?: boolean;
    is_addon?: boolean;
    package_id?: string;
  }) => {
    return apiRequest<{ id: string; dish_id: string; package_id?: string; people_count: number; quantity: string; price_at_time?: number; is_optional: boolean; is_addon: boolean; dish: Dish }>('/api/caterer/packages/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Dashboard
  getDashboardStats: async () => {
    return apiRequest<DashboardStats>('/api/caterer/dashboard');
  },

  // Proposals
  getProposals: async () => {
    return apiRequest<Array<{
      id: string;
      user_id: string;
      caterer_id: string;
      status: string;
      event_type?: string;
      location?: string;
      dietary_preferences: string[];
      budget_per_person?: number;
      event_date?: string;
      vision?: string;
      guest_count: number;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      created_at: string;
      updated_at: string;
    }>>('/api/caterer/proposals');
  },

  getProposalById: async (proposalId: string) => {
    return apiRequest<{
      id: string;
      user_id: string;
      caterer_id: string;
      status: string;
      event_type?: string;
      location?: string;
      dietary_preferences: string[];
      budget_per_person?: number;
      event_date?: string;
      vision?: string;
      guest_count: number;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/proposals/${proposalId}`);
  },

  updateProposalStatus: async (proposalId: string, status: string) => {
    return apiRequest<{
      id: string;
      user_id: string;
      caterer_id: string;
      status: string;
      event_type?: string;
      location?: string;
      dietary_preferences: string[];
      budget_per_person?: number;
      event_date?: string;
      vision?: string;
      guest_count: number;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/proposals/${proposalId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Orders
  getOrders: async () => {
    return apiRequest<Array<{
      id: string;
      user_id: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      total_price: number;
      currency: string;
      status: string;
      items: Array<{
        id: string;
        package: {
          id: string;
          name: string;
          people_count: number;
          total_price: number;
          currency: string;
          cover_image_url?: string | null;
          package_type: {
            id: string;
            name: string;
          };
          caterer: {
            id: string;
            business_name: string | null;
          };
        };
        package_type: {
          id: string;
          name: string;
        };
        location: string | null;
        guests: number | null;
        date: string | null;
        price_at_time: number;
        created_at: string;
      }>;
      created_at: string;
      updated_at: string;
    }>>('/api/caterer/orders');
  },

  getOrderById: async (orderId: string) => {
    return apiRequest<{
      id: string;
      user_id: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      total_price: number;
      currency: string;
      status: string;
      items: Array<{
        id: string;
        package: {
          id: string;
          name: string;
          people_count: number;
          total_price: number;
          currency: string;
          cover_image_url?: string | null;
          package_type: {
            id: string;
            name: string;
          };
          caterer: {
            id: string;
            business_name: string | null;
          };
        };
        package_type: {
          id: string;
          name: string;
        };
        location: string | null;
        guests: number | null;
        date: string | null;
        price_at_time: number;
        created_at: string;
      }>;
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/orders/${orderId}`);
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    return apiRequest<{
      id: string;
      user_id: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
      };
      total_price: number;
      currency: string;
      status: string;
      items: Array<{
        id: string;
        package: {
          id: string;
          name: string;
          people_count: number;
          total_price: number;
          currency: string;
          cover_image_url?: string | null;
          package_type: {
            id: string;
            name: string;
          };
          caterer: {
            id: string;
            business_name: string | null;
          };
        };
        package_type: {
          id: string;
          name: string;
        };
        location: string | null;
        guests: number | null;
        date: string | null;
        price_at_time: number;
        created_at: string;
      }>;
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Get caterer info for the authenticated caterer
  getCatererInfo: async () => {
    return apiRequest<{
      id: string;
      business_name: string;
      business_type: string;
      business_description: string | null;
      service_area: string | null;
      minimum_guests: number | null;
      maximum_guests: number | null;
      preparation_time: number | null;
      region: string | null;
      delivery_only: boolean;
      delivery_plus_setup: boolean;
      full_service: boolean;
      staff: number | null;
      servers: number | null;
      food_license: string | null;
      Registration: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/info`);
  },

  // Add-ons
  getAddOns: async (packageId: string) => {
    return apiRequest<Array<{
      id: string;
      package_id: string;
      name: string;
      description?: string;
      price: number;
      currency: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>>(`/api/caterer/packages/${packageId}/add-ons`);
  },

  createAddOn: async (packageId: string, data: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    is_active?: boolean;
  }) => {
    return apiRequest<{
      id: string;
      package_id: string;
      name: string;
      description?: string;
      price: number;
      currency: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/packages/${packageId}/add-ons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  updateAddOn: async (addOnId: string, data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    is_active?: boolean;
  }) => {
    return apiRequest<{
      id: string;
      package_id: string;
      name: string;
      description?: string;
      price: number;
      currency: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(`/api/caterer/add-ons/${addOnId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  deleteAddOn: async (addOnId: string) => {
    return apiRequest<void>(`/api/caterer/add-ons/${addOnId}`, {
      method: 'DELETE',
    });
  },
};