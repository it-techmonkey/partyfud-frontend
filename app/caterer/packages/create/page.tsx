'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast, useToast } from '@/components/ui/Toast';
import { catererApi, CreatePackageRequest, Dish } from '@/lib/api/caterer.api';
import { userApi } from '@/lib/api/user.api';

// Component for dish card with image
interface DishCardProps {
  dish: Dish;
  isSelected: boolean;
  onToggle: () => void;
}

const DishCard: React.FC<DishCardProps> = ({ dish, isSelected, onToggle }) => {
  return (
    <label
      className={`block bg-white rounded-lg shadow overflow-hidden transition-all cursor-pointer ${isSelected
        ? 'ring-2 ring-[#268700] ring-offset-2'
        : 'hover:shadow-md'
        }`}
    >
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 text-[#268700] border-gray-300 rounded focus:ring-[#268700] flex-shrink-0 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{dish.name}</h3>
            <p className="text-sm text-gray-700">
              {dish.price ? `${dish.currency || 'AED'} ${Number(dish.price).toLocaleString()}` : 'Price not set'}
            </p>
          </div>
        </div>
        {isSelected && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="inline-flex items-center px-2.5 py-1 bg-[#e8f5e0] text-[#1a5a00] rounded-full text-xs font-semibold">
              ✓ Selected
            </span>
          </div>
        )}
      </div>
    </label>
  );
};

// Component for dish image with fallback in modal
const DishImageInModal: React.FC<{ imageUrl: string | null | undefined; dishName: string }> = ({ imageUrl, dishName }) => {
  const [imageError, setImageError] = React.useState(false);
  const [fallbackError, setFallbackError] = React.useState(false);

  const fallbackImage = '/logo2.svg';

  return (
    <div className="w-full h-32 bg-gray-200 flex items-center justify-center overflow-hidden rounded mb-2 relative flex-shrink-0">
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={dishName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : !fallbackError ? (
        <img
          src={fallbackImage}
          alt={dishName}
          className="w-full h-full object-cover"
          onError={() => setFallbackError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
          <svg
            className="w-10 h-10 text-gray-400 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-gray-500 font-medium text-center px-2 line-clamp-2">{dishName}</p>
        </div>
      )}
    </div>
  );
};

// Add-on interface
interface AddOn {
  id: string;
  package_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Draft add-on (before package is created)
interface DraftAddOn {
  tempId: string; // Temporary ID for draft add-ons
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_active: boolean;
}

// Add-ons Section Component
const AddOnsSection: React.FC<{
  packageId: string | null;
  draftAddOns?: DraftAddOn[];
  onDraftAddOnsChange?: (addOns: DraftAddOn[]) => void;
}> = ({ packageId, draftAddOns = [], onDraftAddOnsChange }) => {
  const [savedAddOns, setSavedAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'AED',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load add-ons when packageId is available
  useEffect(() => {
    if (packageId) {
      loadAddOns();
    }
  }, [packageId]);

  // Listen for add-ons created event (from package creation)
  useEffect(() => {
    const handleAddOnsCreated = () => {
      if (packageId) {
        loadAddOns();
      }
    };
    window.addEventListener('addons-created', handleAddOnsCreated);
    return () => window.removeEventListener('addons-created', handleAddOnsCreated);
  }, [packageId]);

  const loadAddOns = async () => {
    if (!packageId) return;
    try {
      setLoading(true);
      const response = await catererApi.getAddOns(packageId);
      if (response.data) {
        const data = response.data as any;
        setSavedAddOns(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      }
    } catch (error: any) {
      console.error('Error loading add-ons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent bubbling to parent form
    }
    setErrors({});
    if (!formData.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      setErrors({ price: 'Valid price is required' });
      return;
    }

    // If package exists, save to API
    if (packageId) {
      let response;
      if (editingId) {
        // Price is already in numeric format from form, send as-is (backend will round to integer)
        response = await catererApi.updateAddOn(editingId, {
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price), // Send numeric, backend rounds to integer
          currency: formData.currency,
          is_active: formData.is_active,
        });
      } else {
        // Price is already in numeric format from form, send as-is (backend will round to integer)
        response = await catererApi.createAddOn(packageId, {
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price), // Send numeric, backend rounds to integer
          currency: formData.currency,
          is_active: formData.is_active,
        });
      }
      
      if (response.error) {
        setErrors({ general: response.error });
        return;
      }
      
      setFormData({ name: '', description: '', price: '', currency: 'AED', is_active: true });
      setShowAddForm(false);
      setEditingId(null);
      loadAddOns();
    } else {
      // Draft mode: store in local state
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue < 0) {
        setErrors({ price: 'Valid price is required' });
        return;
      }

      // Store price as integer
      const newAddOn: DraftAddOn = {
        tempId: editingTempId || `temp-${Date.now()}-${Math.random()}`,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        price: Math.round(priceValue), // Round to integer
        currency: formData.currency,
        is_active: formData.is_active,
      };

      if (editingTempId) {
        // Update existing draft
        const updated = draftAddOns.map(a => a.tempId === editingTempId ? newAddOn : a);
        if (onDraftAddOnsChange) {
          onDraftAddOnsChange(updated);
        }
      } else {
        // Add new draft
        if (onDraftAddOnsChange) {
          onDraftAddOnsChange([...draftAddOns, newAddOn]);
        } else {
          setErrors({ general: 'Failed to save add-on. Please try again.' });
          return;
        }
      }

      setFormData({ name: '', description: '', price: '', currency: 'AED', is_active: true });
      setShowAddForm(false);
      setEditingTempId(null);
      setErrors({});
    }
  };

  const handleEdit = (addOn: AddOn | DraftAddOn) => {
    setFormData({
      name: addOn.name,
      description: addOn.description || '',
      price: addOn.price.toString(),
      currency: addOn.currency,
      is_active: addOn.is_active,
    });
    if ('id' in addOn && addOn.id) {
      setEditingId(addOn.id);
      setEditingTempId(null);
    } else if ('tempId' in addOn) {
      setEditingTempId(addOn.tempId);
      setEditingId(null);
    }
    setShowAddForm(true);
  };

  const handleDelete = async (idOrTempId: string) => {
    if (!window.confirm('Are you sure you want to delete this add-on?')) return;
    
    if (packageId && idOrTempId.startsWith('temp-') === false) {
      // Delete from API
      const response = await catererApi.deleteAddOn(idOrTempId);
      if (response.error) {
        setErrors({ general: response.error });
        return;
      }
      loadAddOns();
    } else {
      // Delete from draft
      const updated = draftAddOns.filter(a => a.tempId !== idOrTempId);
      if (onDraftAddOnsChange) {
        onDraftAddOnsChange(updated);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', price: '', currency: 'AED', is_active: true });
    setShowAddForm(false);
    setEditingId(null);
    setEditingTempId(null);
    setErrors({});
  };

  // Combine draft and saved add-ons for display
  // When packageId exists, use savedAddOns (has 'id')
  // When packageId doesn't exist, map draftAddOns to include 'id' (from tempId) for consistency
  const allAddOns: Array<AddOn | (DraftAddOn & { id: string; package_id: string })> = packageId 
    ? savedAddOns 
    : draftAddOns.map(d => ({ ...d, id: d.tempId, package_id: '' }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Add-ons</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create optional add-ons that users can select when ordering this package
          </p>
        </div>
        {!showAddForm && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowAddForm(true)}
          >
            + Add Add-on
          </Button>
        )}
      </div>

      {errors.general && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Add-on Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Extra Dessert"
              error={errors.name}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <img src="/dirham.svg" alt="AED" className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  className="pl-12"
                  error={errors.price}
                  required
                />
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this add-on..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent resize-none"
            />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#268700] border-gray-300 rounded focus:ring-[#268700]"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e as any);
              }}
            >
              {editingId || editingTempId ? 'Update' : 'Create'} Add-on
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add-ons List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#268700]"></div>
        </div>
      ) : allAddOns.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No add-ons yet. Click "Add Add-on" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allAddOns.map((addOn) => {
            // All items in allAddOns have 'id' (either from savedAddOns or mapped from draftAddOns)
            // When packageId doesn't exist, mapped items have both id and tempId
            // When packageId exists, items only have id
            const idOrTempId = (addOn as any).id || (addOn as any).tempId || '';
            return (
              <div
                key={idOrTempId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{addOn.name}</h3>
                    {!addOn.is_active && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                        Inactive
                      </span>
                    )}
                    {!packageId && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Draft
                      </span>
                    )}
                  </div>
                  {addOn.description && (
                    <p className="text-sm text-gray-600 mb-2">{addOn.description}</p>
                  )}
                  <p className="text-sm font-medium text-gray-900">
                    {addOn.currency} {Number(addOn.price).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEdit(addOn)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(idOrTempId)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function CreatePackagePage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [createdPackageId, setCreatedPackageId] = useState<string | null>(null);
  const [draftAddOns, setDraftAddOns] = useState<DraftAddOn[]>([]);
  const [formData, setFormData] = useState<CreatePackageRequest>({
    name: '',
    description: '',
    minimum_people: undefined, // Will be set from caterer's minimum_guests
    cover_image_url: '',
    currency: 'AED',
    // rating: undefined,
    occassion: [] as string[],
    is_active: true,
    is_available: true,
    customisation_type: 'FIXED', // Keep default, but UI won't show selection
    package_item_ids: [],
    category_selections: [],
    total_price: undefined, // Optional - if provided, used as custom price; if not, calculated from items
    is_custom_price: false, // Track if price was manually set
  });
  // Track if user has entered a custom price (separate from formData to handle clearing)
  const [hasCustomPrice, setHasCustomPrice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occasions, setOccasions] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [dishesByCategory, setDishesByCategory] = useState<Array<{
    category: { id: string; name: string; description?: string | null };
    dishes: Array<Dish>;
  }>>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minimumGuests, setMinimumGuests] = useState<number | null>(null);
  const DEFAULT_COVER = "/cover.png";
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(DEFAULT_COVER);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoadingMetadata(true);
    setErrors({});
    try {
      // Fetch caterer info to get minimum_guests
      try {
        const catererInfoResponse = await catererApi.getCatererInfo();
        if (catererInfoResponse.data) {
          const info = (catererInfoResponse.data as any).data || catererInfoResponse.data;
          if (info.minimum_guests) {
            setMinimumGuests(info.minimum_guests);
            // Pre-fill form with caterer's minimum_guests
            setFormData(prev => ({ ...prev, minimum_people: info.minimum_guests }));
          }
        }
      } catch (error: any) {
        console.error('Error fetching caterer info:', error);
        setErrors({ general: 'Failed to load caterer information. Please refresh the page.' });
      }

      // Fetch occasions
      try {
        const occasionsResponse = await userApi.getOccasions();
        if (occasionsResponse.data?.data) {
          setOccasions(occasionsResponse.data.data.map((occ: any) => ({
            id: occ.id,
            name: occ.name,
          })));
        }
      } catch (error: any) {
        console.error('Error fetching occasions:', error);
        setErrors(prev => ({ ...prev, general: 'Failed to load occasions. Please refresh the page.' }));
      }

      // Fetch categories
      try {
        const categoriesResponse = await catererApi.getCategories();
        if (categoriesResponse.data) {
          const categoriesData = categoriesResponse.data as any;
          if (categoriesData.data && Array.isArray(categoriesData.data)) {
            setCategories(categoriesData.data);
          } else if (Array.isArray(categoriesData)) {
            setCategories(categoriesData);
          }
        }
      } catch (error: any) {
        console.error('Error fetching categories:', error);
        setErrors(prev => ({ ...prev, general: 'Failed to load categories. Please refresh the page.' }));
      }

      // Fetch dishes grouped by category
      await fetchDishes();
    } catch (error: any) {
      console.error('Error fetching metadata:', error);
      setErrors(prev => ({ ...prev, general: prev.general || 'Failed to load data. Please refresh the page.' }));
    } finally {
      setLoadingMetadata(false);
    }
  };

  const fetchDishes = async () => {
    try {
      const response = await catererApi.getAllDishes({ group_by_category: true });
      if (response.data) {
        const data = response.data as any;
        const responseData = data.data || data;

        if (responseData.categories && Array.isArray(responseData.categories)) {
          setDishesByCategory(responseData.categories);
        } else {
          const dishesList = Array.isArray(data) ? data : (data.data || []);
          setDishesByCategory([{
            category: { id: 'all', name: 'All Dishes', description: null },
            dishes: Array.isArray(dishesList) ? dishesList : []
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
      setDishesByCategory([]);
    }
  };

  // Helper function to get all dishes from all categories
  const getAllDishes = () => {
    return dishesByCategory.flatMap(category =>
      Array.isArray(category.dishes) ? category.dishes : []
    );
  };

  // Filter dishes based on search query
  const getFilteredDishesByCategory = () => {
    let filteredCategories = dishesByCategory;

    // Apply search filter if query exists
    if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
      filteredCategories = dishesByCategory
      .map(categoryGroup => ({
        ...categoryGroup,
        dishes: categoryGroup.dishes.filter(dish =>
          dish.name.toLowerCase().includes(query)
        )
        }));
    }

    // Always filter out categories with 0 dishes
    return filteredCategories.filter(categoryGroup => categoryGroup.dishes.length > 0);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDishToggle = (dishId: string) => {
    // For now, we'll use dish IDs directly in package_item_ids
    // The backend will need to handle creating package items from dish IDs
    // or we can create package items on the fly
    const currentIds = formData.package_item_ids || [];
    if (currentIds.includes(dishId)) {
      setFormData({
        ...formData,
        package_item_ids: currentIds.filter(id => id !== dishId),
      });
    } else {
      setFormData({
        ...formData,
        package_item_ids: [...currentIds, dishId],
      });
    }
  };


  // Calculate package price from selected dishes
  const calculatePackagePrice = (): number => {
    // If custom price is set, use it
    if (hasCustomPrice && formData.total_price !== undefined && formData.total_price !== null) {
      return formData.total_price;
    }

    const minPeople = formData.minimum_people || minimumGuests;
    if (!formData.package_item_ids || formData.package_item_ids.length === 0 || !minPeople || minPeople <= 0) {
      return 0;
    }

    const allDishes = getAllDishes();
    const selectedDishes = allDishes.filter(dish => formData.package_item_ids?.includes(dish.id));
    
    let totalPrice = 0;
    selectedDishes.forEach((dish) => {
      // Calculate price using serves_people if available
      const price = typeof dish.price === 'number' ? Math.round(dish.price) : Math.round(Number(dish.price) || 0);
      const servesPeople = dish.serves_people ?? null;
      // Use the new calculation function that considers serves_people
      const { calculateDishPriceForGuests } = require('@/lib/utils/priceCalculation');
      const dishPriceForGuests = calculateDishPriceForGuests(price, servesPeople, minPeople || 1);
      totalPrice += dishPriceForGuests;
    });

    return totalPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Package name is required' });
      return;
    }
    const minPeople = formData.minimum_people || minimumGuests;
    if (!minPeople || minPeople <= 0) {
      setErrors({ minimum_people: 'Minimum people must be greater than 0' });
      return;
    }
    // Validation based on package type
    if (formData.customisation_type === 'FIXED') {
      if (!formData.package_item_ids || formData.package_item_ids.length === 0) {
        setErrors({ package_item_ids: 'At least one dish must be selected for fixed packages' });
        return;
      }
    } else if (formData.customisation_type === 'CUSTOMISABLE') {
      // For CUSTOMISABLE packages, if no dishes are selected, all dishes will be made available
      // Users can then select any number of dishes from the complete menu
      // Only validate category selections if dishes are actually selected
      if (formData.package_item_ids && formData.package_item_ids.length > 0) {
        // Validate that each category with selected dishes has a selection limit set
        // Skip validation for 'uncategorized' category (dishes without categories)
        const categoriesWithDishes = new Set<string>();
        dishesByCategory.forEach(cg => {
          // Skip uncategorized dishes - they don't need category selection limits
          if (cg.category.id === 'uncategorized') {
            return;
          }
          const selectedInCategory = (formData.package_item_ids || []).filter(id => 
            cg.dishes.some(d => d.id === id)
          );
          if (selectedInCategory.length > 0) {
            categoriesWithDishes.add(cg.category.id);
          }
        });
        
        const categoriesWithLimits = new Set(
          (formData.category_selections || []).map(s => s.category_id)
        );
        
        const missingLimits = Array.from(categoriesWithDishes).filter(
          catId => !categoriesWithLimits.has(catId)
        );
        
        if (missingLimits.length > 0) {
          setErrors({ category_selections: 'Please set selection limits for all categories with selected dishes' });
          return;
        }
      }

      // Validate category_selections: filter out invalid category IDs
      if (formData.category_selections && formData.category_selections.length > 0) {
        const validCategoryIds = new Set(categories.map(cat => cat.id));
        const invalidSelections = formData.category_selections.filter(
          selection => !validCategoryIds.has(selection.category_id)
        );
        
        if (invalidSelections.length > 0) {
          // Filter out invalid category selections
          const validSelections = formData.category_selections.filter(
            selection => validCategoryIds.has(selection.category_id)
          );
          setFormData(prev => ({ ...prev, category_selections: validSelections }));
          setErrors({ category_selections: `Removed ${invalidSelections.length} invalid categor${invalidSelections.length === 1 ? 'y' : 'ies'}. Please reselect categories.` });
          return;
        }
      }
    }

    setIsSubmitting(true);

    // For CUSTOMISABLE packages with no dishes selected, automatically include all dishes
    let packageItemIds = formData.package_item_ids || [];
    if (formData.customisation_type === 'CUSTOMISABLE' && packageItemIds.length === 0) {
      // Get all dish IDs from all categories
      const allDishes = getAllDishes();
      packageItemIds = allDishes.map(dish => dish.id);
    }

    // Clean up formData before submission
    const cleanedFormData = { 
      ...formData,
      package_item_ids: packageItemIds,
    };
    
    // Filter out invalid category selections
    if (cleanedFormData.category_selections && cleanedFormData.category_selections.length > 0) {
      const validCategoryIds = new Set(categories.map(cat => cat.id));
      cleanedFormData.category_selections = cleanedFormData.category_selections.filter(
        selection => selection.category_id && 
                     selection.category_id !== 'uncategorized' && 
                     validCategoryIds.has(selection.category_id)
      );
    }

    const response = await (catererApi as any).createPackage(cleanedFormData, selectedImage || undefined);

    if (response.error) {
      setErrors({ general: response.error });
      setIsSubmitting(false);
      return;
    }

    // Get the created package ID
    const createdPkg = (response.data as any)?.data || response.data;
    if (createdPkg?.id) {
      setCreatedPackageId(createdPkg.id);
      
      // Create all draft add-ons
      if (draftAddOns.length > 0) {
        const errors: string[] = [];
        for (const draftAddOn of draftAddOns) {
          // Price is already stored as integer in draft
          const response = await catererApi.createAddOn(createdPkg.id, {
            name: draftAddOn.name,
            description: draftAddOn.description,
            price: draftAddOn.price, // Already an integer
            currency: draftAddOn.currency,
            is_active: draftAddOn.is_active,
          });
          
          if (response.error) {
            errors.push(`${draftAddOn.name}: ${response.error}`);
          }
        }
        
        // Clear draft add-ons after they're saved (even if some failed)
        setDraftAddOns([]);
        
        if (errors.length > 0) {
          console.error('Some add-ons failed to create:', errors);
          // Reload add-ons to show successfully created ones
          setTimeout(() => {
            const addOnsSection = document.getElementById('add-ons-section');
            if (addOnsSection) {
              // Trigger a reload by dispatching a custom event or using a ref
              window.dispatchEvent(new Event('addons-created'));
            }
          }, 500);
        }
      }
      
      // Show success message
      if (draftAddOns.length > 0) {
        showToast('success', `Package created successfully! ${draftAddOns.length} add-on(s) have been added.`);
      } else {
        showToast('success', 'Package created successfully! You can add add-ons below.');
      }
      
      // Scroll to add-ons section
      setTimeout(() => {
        const addOnsSection = document.getElementById('add-ons-section');
        if (addOnsSection) {
          addOnsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      router.push('/caterer/packages');
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-4 text-sm text-gray-600">
          <span>Packages</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Create Menu</span>
        </div>

        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Menu</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* General Information Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">General Information</h2>

            {errors.general && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
                {errors.general}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Package Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter package name"
                    error={errors.name}
                  />
                  <Input
                    label="Minimum People"
                    type="number"
                    min="1"
                    value={formData.minimum_people !== undefined && formData.minimum_people !== null ? formData.minimum_people.toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      if (value === '') {
                        // Allow clearing - will use default when submitting
                        setFormData({ ...formData, minimum_people: undefined });
                      } else {
                        const numValue = parseInt(value, 10);
                        if (!isNaN(numValue)) {
                          setFormData({ ...formData, minimum_people: numValue });
                        }
                      }
                    }}
                    placeholder={minimumGuests ? `${minimumGuests} (default from profile)` : 'Enter minimum number of people'}
                    error={errors.minimum_people}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter package description"
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent resize-none ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                  )}
                </div>
                <div>
                  {/* Occasions - Multiple Selection with Checkboxes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occasions <span className="text-gray-500 text-xs">(Select all that apply)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {occasions.length === 0 ? (
                        <p className="col-span-2 text-sm text-gray-500">Loading occasions...</p>
                      ) : (
                        occasions.map((occasion) => (
                          <label
                            key={occasion.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition"
                          >
                            <input
                              type="checkbox"
                              checked={Array.isArray(formData.occassion) && formData.occassion.includes(occasion.id)}
                              onChange={(e) => {
                                const currentOccasions = Array.isArray(formData.occassion) ? formData.occassion : [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, occassion: [...currentOccasions, occasion.id] });
                                } else {
                                  setFormData({ ...formData, occassion: currentOccasions.filter(id => id !== occasion.id) });
                                }
                              }}
                              className="w-4 h-4 text-[#268700] border-gray-300 rounded focus:ring-[#268700]"
                            />
                            <span className="text-sm text-gray-700">{occasion.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {errors.occassion && (
                      <p className="mt-1 text-sm text-red-600">{errors.occassion}</p>
                    )}
                  </div>


                  {/* <Input
                    label="Rating (Optional)"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0.0 - 5.0"
                  /> */}
                </div>
                <div>
                  {/* <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL (Optional)
                  </label>
                  <Input
                    type="url"
                    value={formData.cover_image_url || ''}
                    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  /> */}
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>

                <div className="relative">
                  <img
                    src={imagePreview || DEFAULT_COVER}
                    alt="Cover Preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-300"
                  />

                  {/* Remove only if user uploaded */}
                  {selectedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(DEFAULT_COVER);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Upload Button */}
                <label className="mt-3 flex items-center justify-center w-full px-3 py-2 bg-[#268700] text-white rounded-lg cursor-pointer hover:bg-[#1f6b00] transition-colors text-sm">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Change Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>

          {/* Package Type Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Package Type</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose how users will interact with this package
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition ${
                formData.customisation_type === 'FIXED'
                  ? 'border-[#268700] bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="package_type"
                  value="FIXED"
                  checked={formData.customisation_type === 'FIXED'}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      customisation_type: 'FIXED',
                      category_selections: [], // Clear category selections for FIXED
                    });
                  }}
                  className="mt-1 w-4 h-4 text-[#268700] border-gray-300 focus:ring-[#268700]"
                />
                <div className="flex-1">
                  <span className="text-base font-semibold text-gray-900 block">Fixed Package</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Select specific dishes. Users cannot customize - they get exactly what you choose.
                  </p>
                </div>
              </label>
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition ${
                formData.customisation_type === 'CUSTOMISABLE'
                  ? 'border-[#268700] bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="package_type"
                  value="CUSTOMISABLE"
                  checked={formData.customisation_type === 'CUSTOMISABLE'}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      customisation_type: 'CUSTOMISABLE',
                      package_item_ids: [], // Clear dish selections for CUSTOMISABLE
                    });
                  }}
                  className="mt-1 w-4 h-4 text-[#268700] border-gray-300 focus:ring-[#268700]"
                />
                <div className="flex-1">
                  <span className="text-base font-semibold text-gray-900 block">Customizable Package</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Set categories with selection limits. Users choose dishes within your constraints.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Package Items Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-gray-900">
                {formData.customisation_type === 'FIXED' ? 'Package Items' : 'Category Selections'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {formData.customisation_type === 'FIXED'
                  ? 'Select specific dishes to include in this package'
                  : 'Select categories and set how many dishes users can choose from each'}
              </p>
            </div>

            {/* Search Box */}
            <div className="mb-5">
              <Input
                label="Search Dishes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for dishes by name..."
                className="w-full"
              />
            </div>

            {/* Error Messages */}
            {errors.package_item_ids && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.package_item_ids}</p>
              </div>
            )}
            {errors.category_selections && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.category_selections}</p>
              </div>
            )}

            {/* FIXED Package: Selected Dishes Summary */}
            {formData.customisation_type === 'FIXED' && formData.package_item_ids && formData.package_item_ids.length > 0 && (
              <div className="mb-4 p-3 bg-[#e8f5e0] rounded-lg border border-[#268700]/20">
                <p className="text-sm font-semibold text-[#1a5a00] mb-2">
                  {formData.package_item_ids.length} dish(es) selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {getAllDishes()
                    .filter(dish => formData.package_item_ids?.includes(dish.id))
                    .map((dish) => (
                      <span
                        key={dish.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white text-[#1a5a00] rounded-full text-sm border border-[#268700]/30"
                      >
                        {dish.name}
                        <button
                          type="button"
                          onClick={() => handleDishToggle(dish.id)}
                          className="text-[#268700] hover:text-[#1a5a00] font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* CUSTOMISABLE Package: Summary */}
            {formData.customisation_type === 'CUSTOMISABLE' && formData.package_item_ids && formData.package_item_ids.length > 0 && (
              <div className="mb-4 p-3 bg-[#e8f5e0] rounded-lg border border-[#268700]/20">
                <p className="text-sm font-semibold text-[#1a5a00] mb-2">
                  {formData.package_item_ids.length} dish{formData.package_item_ids.length === 1 ? '' : 'es'} selected across {formData.category_selections?.length || 0} categor{formData.category_selections?.length === 1 ? 'y' : 'ies'}
                </p>
                {formData.category_selections && formData.category_selections.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.category_selections.map((selection, idx) => {
                      const category = categories.find(c => c.id === selection.category_id);
                      const categoryDishIds = dishesByCategory.find(cg => cg.category.id === selection.category_id)?.dishes.map(d => d.id) || [];
                      const selectedInCategory = (formData.package_item_ids || []).filter(id => categoryDishIds.includes(id));
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-white text-[#1a5a00] rounded-full text-sm border border-[#268700]/30"
                        >
                          {category?.name || 'Unknown'}: {selectedInCategory.length} available, select {selection.num_dishes_to_select === null ? 'all' : selection.num_dishes_to_select}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FIXED Package: Dishes List - Grouped by Category */}
            {formData.customisation_type === 'FIXED' && (
              <>
                {loadingMetadata ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#268700]"></div>
                  </div>
                ) : getAllDishes().length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No dishes available. Please add dishes to your menu first.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {getFilteredDishesByCategory().map((categoryGroup) => (
                      <div key={categoryGroup.category.id} className="space-y-4">
                        {/* Category Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {categoryGroup.category.name}
                            </h3>
                            <span className="text-sm text-gray-500">
                              ({categoryGroup.dishes.length} {categoryGroup.dishes.length === 1 ? 'dish' : 'dishes'})
                            </span>
                            {categoryGroup.category.description && (
                              <span className="text-sm text-gray-400 italic">
                                - {categoryGroup.category.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dishes Grid for this Category */}
                        {categoryGroup.dishes.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                            <p className="text-sm text-gray-400">No dishes in this category</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryGroup.dishes.map((dish) => (
                              <DishCard
                                key={dish.id}
                                dish={dish}
                                isSelected={formData.package_item_ids?.includes(dish.id) || false}
                                onToggle={() => handleDishToggle(dish.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {getFilteredDishesByCategory().length === 0 && searchQuery.trim() && (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">No dishes found matching "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* CUSTOMISABLE Package: Dishes List - Grouped by Category with Selection Limits */}
            {formData.customisation_type === 'CUSTOMISABLE' && (
              <>
                {loadingMetadata ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#268700]"></div>
                  </div>
                ) : getAllDishes().length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No dishes available. Please add dishes to your menu first.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {getFilteredDishesByCategory().map((categoryGroup) => {
                      // Get selected dishes for this category
                      const categoryDishIds = categoryGroup.dishes.map(d => d.id);
                      const selectedDishesInCategory = (formData.package_item_ids || []).filter(id => categoryDishIds.includes(id));
                      const existingSelection = formData.category_selections?.find(s => s.category_id === categoryGroup.category.id);
                      
                      return (
                        <div key={categoryGroup.category.id} className="space-y-4 p-4 border-2 border-gray-200 rounded-lg">
                          {/* Category Header with Selection Limit */}
                          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {categoryGroup.category.name}
                              </h3>
                              <span className="text-sm text-gray-500">
                                ({categoryGroup.dishes.length} {categoryGroup.dishes.length === 1 ? 'dish' : 'dishes'})
                              </span>
                              {categoryGroup.category.description && (
                                <span className="text-sm text-gray-400 italic">
                                  - {categoryGroup.category.description}
                                </span>
                              )}
                            </div>
                            
                            {/* Selection Limit Dropdown */}
                            {selectedDishesInCategory.length > 0 && (
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 whitespace-nowrap">Users must select:</label>
                                <select
                                  value={existingSelection?.num_dishes_to_select === null ? 'all' : existingSelection?.num_dishes_to_select?.toString() || 'all'}
                                  onChange={(e) => {
                                    const value = e.target.value === 'all' ? null : parseInt(e.target.value, 10);
                                    const currentSelections = formData.category_selections || [];
                                    const existingIdx = currentSelections.findIndex(s => s.category_id === categoryGroup.category.id);
                                    
                                    let updated;
                                    if (existingIdx >= 0) {
                                      updated = [...currentSelections];
                                      updated[existingIdx] = { category_id: categoryGroup.category.id, num_dishes_to_select: value };
                                    } else {
                                      updated = [...currentSelections, { category_id: categoryGroup.category.id, num_dishes_to_select: value }];
                                    }
                                    
                                    setFormData({ ...formData, category_selections: updated });
                                  }}
                                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] bg-white text-gray-900 min-w-[120px]"
                                >
                                  <option value="all">All selected</option>
                                  {Array.from({ length: Math.min(selectedDishesInCategory.length, 10) }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num.toString()}>
                                      {num} {num === 1 ? 'dish' : 'dishes'}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-xs text-gray-500">
                                  (from {selectedDishesInCategory.length} available)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Dishes Grid for this Category */}
                          {categoryGroup.dishes.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                              <p className="text-sm text-gray-400">No dishes in this category</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryGroup.dishes.map((dish) => (
                                <DishCard
                                  key={dish.id}
                                  dish={dish}
                                  isSelected={formData.package_item_ids?.includes(dish.id) || false}
                                  onToggle={() => {
                                    const currentIds = formData.package_item_ids || [];
                                    const isCurrentlySelected = currentIds.includes(dish.id);
                                    const newIds = isCurrentlySelected
                                      ? currentIds.filter(id => id !== dish.id)
                                      : [...currentIds, dish.id];
                                    
                                    // Update category selections based on selected dishes
                                    const categoryDishIds = categoryGroup.dishes.map(d => d.id);
                                    const selectedInCategory = newIds.filter(id => categoryDishIds.includes(id));
                                    const currentSelections = formData.category_selections || [];
                                    const hasCategorySelection = currentSelections.some(s => s.category_id === categoryGroup.category.id);
                                    
                                    let updatedSelections = [...currentSelections];
                                    
                                    if (selectedInCategory.length > 0 && !hasCategorySelection) {
                                      // First dish in category selected, add category selection
                                      updatedSelections.push({ category_id: categoryGroup.category.id, num_dishes_to_select: null });
                                    } else if (selectedInCategory.length === 0 && hasCategorySelection) {
                                      // All dishes removed from category, remove category selection
                                      updatedSelections = updatedSelections.filter(s => s.category_id !== categoryGroup.category.id);
                                    }
                                    
                                    setFormData({
                                      ...formData,
                                      package_item_ids: newIds,
                                      category_selections: updatedSelections
                                    });
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          
                          {/* Info message when dishes are selected */}
                          {selectedDishesInCategory.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-700">
                                {selectedDishesInCategory.length} dish{selectedDishesInCategory.length === 1 ? '' : 'es'} selected. 
                                Users will be able to choose {existingSelection?.num_dishes_to_select === null 
                                  ? 'all of them' 
                                  : `${existingSelection?.num_dishes_to_select} dish${existingSelection?.num_dishes_to_select === 1 ? '' : 'es'}`} from this category.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {getFilteredDishesByCategory().length === 0 && searchQuery.trim() && (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">No dishes found matching "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Add-ons Section - Only for FIXED packages */}
          {formData.customisation_type === 'FIXED' && (
            <div id="add-ons-section">
              <AddOnsSection
                packageId={createdPackageId}
                draftAddOns={draftAddOns}
                onDraftAddOnsChange={setDraftAddOns}
              />
            </div>
          )}

          {/* Price Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">Pricing & Status</h2>
            <div className="grid grid-cols-1 gap-6">
              {/* Custom Price Toggle */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pricing Mode
                    </label>
                    <p className="text-xs text-gray-500">
                      {hasCustomPrice 
                        ? 'Set a fixed price that applies regardless of guest count'
                        : 'Price will be automatically calculated from selected dishes'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCustomPrice}
                      onChange={(e) => {
                        const isEnabled = e.target.checked;
                        if (!isEnabled) {
                          // Clear custom price when toggle is off
                          setHasCustomPrice(false);
                          setFormData(prev => ({ ...prev, total_price: undefined, is_custom_price: false }));
                        } else {
                          // Enable custom price mode
                          setHasCustomPrice(true);
                          // If there's already a price set, keep it; otherwise initialize with calculated price
                          if (formData.total_price !== undefined && formData.total_price !== null) {
                            setFormData(prev => ({ ...prev, is_custom_price: true }));
                          } else {
                            // Calculate price from current form state
                            const minPeople = formData.minimum_people || minimumGuests;
                            let calculatedPrice = 0;
                            if (formData.package_item_ids && formData.package_item_ids.length > 0 && minPeople && minPeople > 0) {
                              const allDishes = getAllDishes();
                              const selectedDishes = allDishes.filter(dish => formData.package_item_ids?.includes(dish.id));
                              selectedDishes.forEach((dish) => {
                                const price = typeof dish.price === 'number' ? Math.round(dish.price) : Math.round(Number(dish.price) || 0);
                                calculatedPrice += price * minPeople;
                              });
                            }
                            setFormData(prev => ({ 
                              ...prev, 
                              total_price: calculatedPrice > 0 ? calculatedPrice : undefined, 
                              is_custom_price: true 
                            }));
                          }
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#268700]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#268700]"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {hasCustomPrice ? 'Custom Price' : 'Auto Calculate'}
                    </span>
                  </label>
                </div>

                {/* Custom Price Input - Only shown when toggle is ON */}
                {hasCustomPrice && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <img src="/dirham.svg" alt="AED" className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.total_price !== undefined && formData.total_price !== null ? formData.total_price.toString() : ''}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          if (value === '') {
                            setFormData({ ...formData, total_price: undefined, is_custom_price: true });
                          } else {
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue) && numValue >= 0) {
                              setFormData({ ...formData, total_price: numValue, is_custom_price: true });
                            }
                          }
                        }}
                        placeholder="Enter custom price"
                        className="pl-12"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      This price will be used as a fixed price regardless of the number of guests.
                    </p>
                  </div>
                )}
              </div>

              {/* Calculated Price Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {hasCustomPrice 
                    ? 'Package Price (Custom)' 
                    : 'Starting Price (Calculated)'}
                </label>
                <div className="relative">
                  <img src="/dirham.svg" alt="AED" className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <div className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    <span className="text-sm text-gray-500">Starting </span>
                    <span className="text-lg font-semibold">
                      AED {calculatePackagePrice().toLocaleString()}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {hasCustomPrice
                        ? 'Using custom price set by caterer (fixed price regardless of guest count)'
                        : `Price is automatically calculated from selected dishes × ${formData.minimum_people || minimumGuests || 'minimum'} people × quantity`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  value={formData.additional_info || ''}
                  onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                  placeholder="For example: Crockery not included or per person crockery 20 AED, cleaning services extra charge of 10 AED per person etc"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter extra pricing and services information for this package
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border-t border-gray-100">
            <div>
              <span className="text-sm text-gray-600">Starting Price: </span>
              <span className="text-2xl font-bold text-gray-900 ml-2">
                AED {calculatePackagePrice().toFixed(2)}
              </span>
              {hasCustomPrice ? (
                <p className="text-xs text-gray-500 mt-1">
                  Using custom price (fixed price regardless of guest count)
                </p>
              ) : formData.package_item_ids && formData.package_item_ids.length > 0 && (formData.minimum_people || minimumGuests) && (formData.minimum_people || minimumGuests || 0) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Price will be calculated from selected items for {formData.minimum_people || minimumGuests} people
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              {createdPackageId ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => router.push('/caterer/packages')}
                >
                  Done
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Create Package
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
      
      {/* Toast */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={hideToast} />
      )}
    </div>
  );
}

