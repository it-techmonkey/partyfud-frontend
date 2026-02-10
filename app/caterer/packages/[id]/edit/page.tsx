'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { catererApi, UpdatePackageRequest, Package, Dish } from '@/lib/api/caterer.api';
import { userApi } from '@/lib/api/user.api';

// ============================================================================
// TYPES
// ============================================================================

interface CategoryGroup {
  category: { id: string; name: string; description?: string | null };
  dishes: Dish[];
}

interface CategorySelection {
  category_id: string;
  num_dishes_to_select: number | null;
}

interface FormData {
  name: string;
  description: string;
  minimum_people: number | undefined;
  cover_image_url: string;
  currency: string;
  occassion: string[];
  is_active: boolean;
  is_available: boolean;
  customisation_type: 'FIXED' | 'CUSTOMISABLE';
  additional_info: string;
  package_item_ids: string[];
  category_selections: CategorySelection[];
  total_price: number | undefined;
  is_custom_price: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// COMPONENTS
// ============================================================================

// Add-ons Section Component
const AddOnsSection: React.FC<{
  packageId: string;
}> = ({ packageId }) => {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'AED',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAddOns();
  }, [packageId]);

  const loadAddOns = async () => {
    try {
      setLoading(true);
      const response = await catererApi.getAddOns(packageId);
      if (response.data) {
        const data = response.data as any;
        setAddOns(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      }
    } catch (error: any) {
      console.error('Error loading add-ons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
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
  };

  const handleEdit = (addOn: AddOn) => {
    setFormData({
      name: addOn.name,
      description: addOn.description || '',
      price: addOn.price.toString(),
      currency: addOn.currency,
      is_active: addOn.is_active,
    });
    setEditingId(addOn.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this add-on?')) return;
    const response = await catererApi.deleteAddOn(id);
    if (response.error) {
      setErrors({ general: response.error });
      return;
    }
    loadAddOns();
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', price: '', currency: 'AED', is_active: true });
    setShowAddForm(false);
    setEditingId(null);
    setErrors({});
  };

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
                handleSubmit(e);
              }}
            >
              {editingId ? 'Update' : 'Create'} Add-on
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
      ) : addOns.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No add-ons yet. Click "Add Add-on" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addOns.map((addOn) => (
            <div
              key={addOn.id}
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
                  onClick={() => handleDelete(addOn.id)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DishCard: React.FC<{
  dish: Dish;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ dish, isSelected, onToggle }) => (
  <label
    className={`block bg-white rounded-lg shadow overflow-hidden transition-all cursor-pointer ${
      isSelected ? 'ring-2 ring-[#268700] ring-offset-2' : 'hover:shadow-md'
    }`}
  >
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

const LoadingSpinner: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#268700]"></div>
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
    {message}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditPackagePage() {
  const router = useRouter();
  const params = useParams();
  const packageId = params.id as string;

  // ============================================================================
  // STATE
  // ============================================================================

  const [originalPackage, setOriginalPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    minimum_people: undefined,
    cover_image_url: '',
    currency: 'AED',
    occassion: [],
    is_active: true,
    is_available: true,
    customisation_type: 'FIXED',
    additional_info: '',
    package_item_ids: [],
    category_selections: [],
    total_price: undefined,
    is_custom_price: false,
  });

  const [hasCustomPrice, setHasCustomPrice] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  const [occasions, setOccasions] = useState<Array<{ id: string; name: string }>>([]);
  const [dishesByCategory, setDishesByCategory] = useState<CategoryGroup[]>([]);
  const [minimumGuests, setMinimumGuests] = useState<number | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>('/cover.png');

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const allDishes = useMemo(() => {
    return dishesByCategory.flatMap((cg) => cg.dishes || []);
  }, [dishesByCategory]);

  const selectedDishes = useMemo(() => {
    return allDishes.filter((dish) => formData.package_item_ids.includes(dish.id));
  }, [allDishes, formData.package_item_ids]);

  const calculatedPrice = useMemo(() => {
    if (hasCustomPrice && formData.total_price !== undefined) {
      return formData.total_price;
    }

    const minPeople = formData.minimum_people || minimumGuests || 1;
    if (selectedDishes.length === 0 || minPeople <= 0) {
      return 0;
    }

    return selectedDishes.reduce((total, dish) => {
      const price = typeof dish.price === 'number' ? Math.round(dish.price) : Math.round(Number(dish.price) || 0);
      const servesPeople = dish.serves_people ?? null;
      // Use the new calculation function that considers serves_people
      const { calculateDishPriceForGuests } = require('@/lib/utils/priceCalculation');
      const dishPriceForGuests = calculateDishPriceForGuests(price, servesPeople, minPeople);
      return total + dishPriceForGuests;
    }, 0);
  }, [hasCustomPrice, formData.total_price, formData.minimum_people, minimumGuests, selectedDishes]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchPackage = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await catererApi.getPackageById(packageId);
      const pkg = (response.data as any)?.data || response.data;

      if (!pkg?.id) {
        setErrors({ general: 'Failed to load package data.' });
        return;
      }

      setOriginalPackage(pkg);

      // Extract occasion IDs
      const occasionIds = (pkg.occasions || [])
        .map((occ: any) => occ.occassion?.id || occ.id)
        .filter(Boolean);

      // Extract dish IDs from package items
      const packageItems = pkg.items || pkg.package_items || [];
      const dishIds = packageItems
        .map((item: any) => item.dish?.id || item.dish_id)
        .filter(Boolean);

      // Set form data
      const isCustom = pkg.is_custom_price || false;
      setHasCustomPrice(isCustom);

      setFormData({
        name: pkg.name || '',
        description: pkg.description || '',
        minimum_people: pkg.minimum_people || pkg.people_count || undefined,
        cover_image_url: pkg.cover_image_url || '',
        currency: pkg.currency || 'AED',
        occassion: occasionIds,
        is_active: pkg.is_active ?? true,
        is_available: pkg.is_available ?? true,
        customisation_type: pkg.customisation_type || 'FIXED',
        additional_info: pkg.additional_info || '',
        package_item_ids: dishIds,
        category_selections: pkg.category_selections || [],
        total_price: pkg.total_price !== undefined ? Number(pkg.total_price) : undefined,
        is_custom_price: isCustom,
      });

      if (pkg.cover_image_url) {
        setImagePreview(pkg.cover_image_url);
      }
    } catch (error) {
      console.error('Error fetching package:', error);
      setErrors({ general: 'Failed to load package. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [packageId]);

  const fetchMetadata = useCallback(async () => {
    try {
      setIsLoadingMetadata(true);

      // Fetch caterer info
      const catererResponse = await catererApi.getCatererInfo();
      const catererInfo = (catererResponse.data as any)?.data || catererResponse.data;
      if (catererInfo?.minimum_guests) {
        setMinimumGuests(catererInfo.minimum_guests);
        setFormData((prev) => ({
          ...prev,
          minimum_people: prev.minimum_people || catererInfo.minimum_guests,
        }));
      }

      // Fetch occasions
      const occasionsResponse = await userApi.getOccasions();
      if (occasionsResponse.data?.data) {
        setOccasions(
          occasionsResponse.data.data.map((occ: any) => ({
            id: occ.id,
            name: occ.name,
          }))
        );
      }

      // Fetch dishes
      const dishesResponse = await catererApi.getAllDishes({ group_by_category: true });
      if (dishesResponse.data) {
        const data = dishesResponse.data as any;
        const responseData = data.data || data;

        if (responseData.categories && Array.isArray(responseData.categories)) {
          setDishesByCategory(responseData.categories);
        } else {
          const dishesList = Array.isArray(data) ? data : data.data || [];
          setDishesByCategory([
            {
              category: { id: 'all', name: 'All Dishes', description: null },
              dishes: Array.isArray(dishesList) ? dishesList : [],
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  }, []);

  useEffect(() => {
    fetchPackage();
  }, [fetchPackage]);

  useEffect(() => {
    if (originalPackage) {
      fetchMetadata();
    }
  }, [originalPackage, fetchMetadata]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleInputChange = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleDishToggle = useCallback((dishId: string) => {
    setFormData((prev) => {
      const currentIds = prev.package_item_ids;
      const isSelected = currentIds.includes(dishId);
      const newIds = isSelected
        ? currentIds.filter((id) => id !== dishId)
        : [...currentIds, dishId];

      return { ...prev, package_item_ids: newIds };
    });
  }, []);

  const handleOccasionToggle = useCallback((occasionId: string) => {
    setFormData((prev) => {
      const currentOccasions = prev.occassion;
      const isSelected = currentOccasions.includes(occasionId);
      const newOccasions = isSelected
        ? currentOccasions.filter((id) => id !== occasionId)
        : [...currentOccasions, occasionId];

      return { ...prev, occassion: newOccasions };
    });
  }, []);

  const handleCustomPriceToggle = useCallback(
    (enabled: boolean) => {
      setHasCustomPrice(enabled);
      if (!enabled) {
        setFormData((prev) => ({
          ...prev,
          total_price: undefined,
          is_custom_price: false,
        }));
      } else {
        // Initialize with calculated price if no custom price set
        const initialPrice = formData.total_price ?? calculatedPrice;
        setFormData((prev) => ({
          ...prev,
          total_price: initialPrice > 0 ? initialPrice : undefined,
          is_custom_price: true,
        }));
      }
    },
    [calculatedPrice, formData.total_price]
  );

  const handleCategorySelectionChange = useCallback(
    (categoryId: string, numDishes: number | null) => {
      setFormData((prev) => {
        const existing = prev.category_selections.findIndex(
          (s) => s.category_id === categoryId
        );
        const updated = [...prev.category_selections];

        if (existing >= 0) {
          updated[existing] = { category_id: categoryId, num_dishes_to_select: numDishes };
        } else {
          updated.push({ category_id: categoryId, num_dishes_to_select: numDishes });
        }

        return { ...prev, category_selections: updated };
      });
    },
    []
  );

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Package name is required';
    }

    // Minimum people validation
    const minPeople = formData.minimum_people || minimumGuests;
    if (!minPeople || minPeople <= 0) {
      newErrors.minimum_people = 'Minimum people must be greater than 0';
    }

    // Custom price validation
    if (hasCustomPrice) {
      if (
        formData.total_price === undefined ||
        formData.total_price === null ||
        formData.total_price <= 0
      ) {
        newErrors.total_price = 'Please enter a valid custom price';
      }
    }

    // FIXED package validation
    if (formData.customisation_type === 'FIXED') {
      if (formData.package_item_ids.length === 0) {
        newErrors.package_item_ids = 'At least one dish must be selected for fixed packages';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, hasCustomPrice, minimumGuests]);

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      setErrors({});

      // Validate form
      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        // Prepare package item IDs
        // For CUSTOMISABLE packages with no dishes selected, send empty array
        // Backend will keep existing items (all dishes available)
        const packageItemIds = [...formData.package_item_ids];

        // Prepare request data
        const requestData: UpdatePackageRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          minimum_people: formData.minimum_people || minimumGuests || undefined,
          currency: formData.currency,
          occassion: formData.occassion,
          is_active: formData.is_active,
          is_available: formData.is_available,
          customisation_type: formData.customisation_type,
          additional_info: formData.additional_info.trim(),
          package_item_ids: packageItemIds,
          category_selections: formData.category_selections.filter(
            (s) => s.category_id && s.category_id !== 'uncategorized'
          ),
        };

        // Handle pricing
        if (hasCustomPrice && formData.total_price !== undefined && formData.total_price > 0) {
          requestData.is_custom_price = true;
          requestData.total_price = formData.total_price;
        } else {
          requestData.is_custom_price = false;
          // Don't send total_price - backend will calculate
        }

        // Make API call
        const response = await catererApi.updatePackage(
          packageId,
          requestData,
          selectedImage || undefined
        );

        // Handle response
        if (response.error) {
          setErrors({ general: response.error });
          return;
        }

        // Check for success
        if (response.data && (response.data as any).success !== false) {
          router.push('/caterer/packages');
        } else {
          setErrors({ general: 'Failed to update package. Please try again.' });
        }
      } catch (error: any) {
        console.error('Error updating package:', error);
        setErrors({ general: error.message || 'Failed to update package. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formData,
      hasCustomPrice,
      validateForm,
      allDishes,
      minimumGuests,
      packageId,
      selectedImage,
      router,
    ]
  );

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDishesSection = () => {
    if (isLoadingMetadata) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#268700]"></div>
        </div>
      );
    }

    if (allDishes.length === 0) {
      return (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No dishes available. Please add dishes to your menu first.</p>
        </div>
      );
    }

    const filteredCategories = dishesByCategory.filter((cg) => cg.dishes.length > 0);

    return (
      <div className="space-y-6">
        {filteredCategories.map((categoryGroup) => {
          const categoryDishIds = categoryGroup.dishes.map((d) => d.id);
          const selectedInCategory = formData.package_item_ids.filter((id) =>
            categoryDishIds.includes(id)
          );
          const existingSelection = formData.category_selections.find(
            (s) => s.category_id === categoryGroup.category.id
          );

          return (
            <div
              key={categoryGroup.category.id}
              className={`space-y-4 ${
                formData.customisation_type === 'CUSTOMISABLE'
                  ? 'p-4 border-2 border-gray-200 rounded-lg'
                  : ''
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {categoryGroup.category.name}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({categoryGroup.dishes.length}{' '}
                    {categoryGroup.dishes.length === 1 ? 'dish' : 'dishes'})
                  </span>
                </div>

                {/* Selection limit dropdown for CUSTOMISABLE packages */}
                {formData.customisation_type === 'CUSTOMISABLE' &&
                  selectedInCategory.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 whitespace-nowrap">
                        Users must select:
                      </label>
                      <select
                        value={
                          existingSelection?.num_dishes_to_select === null
                            ? 'all'
                            : existingSelection?.num_dishes_to_select?.toString() || 'all'
                        }
                        onChange={(e) => {
                          const value =
                            e.target.value === 'all' ? null : parseInt(e.target.value, 10);
                          handleCategorySelectionChange(categoryGroup.category.id, value);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] bg-white text-gray-900 min-w-[120px]"
                      >
                        <option value="all">All selected</option>
                        {Array.from(
                          { length: Math.min(selectedInCategory.length, 10) },
                          (_, i) => i + 1
                        ).map((num) => (
                          <option key={num} value={num.toString()}>
                            {num} {num === 1 ? 'dish' : 'dishes'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryGroup.dishes.map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    isSelected={formData.package_item_ids.includes(dish.id)}
                    onToggle={() => handleDishToggle(dish.id)}
                  />
                ))}
              </div>

              {/* Info message for CUSTOMISABLE packages */}
              {formData.customisation_type === 'CUSTOMISABLE' &&
                selectedInCategory.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      {selectedInCategory.length} dish
                      {selectedInCategory.length === 1 ? '' : 'es'} selected. Users will be able
                      to choose{' '}
                      {existingSelection?.num_dishes_to_select === null
                        ? 'all of them'
                        : `${existingSelection?.num_dishes_to_select} dish${
                            existingSelection?.num_dishes_to_select === 1 ? '' : 'es'
                          }`}{' '}
                      from this category.
                    </p>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!originalPackage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Package not found</p>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-4 text-sm text-gray-600">
          <span>Set Menu</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Edit Menu</span>
        </div>

        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Menu</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* General Information Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">General Information</h2>

            {errors.general && <ErrorMessage message={errors.general} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Package Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter package name"
                    error={errors.name}
                  />
                  <Input
                    label="Minimum People"
                    type="number"
                    min="1"
                    value={formData.minimum_people?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      handleInputChange(
                        'minimum_people',
                        value === '' ? undefined : parseInt(value, 10)
                      );
                    }}
                    placeholder={
                      minimumGuests
                        ? `${minimumGuests} (default from profile)`
                        : 'Enter minimum number of people'
                    }
                    error={errors.minimum_people}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
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

                {/* Occasions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occasions{' '}
                    <span className="text-gray-500 text-xs">(Select all that apply)</span>
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
                            checked={formData.occassion.includes(occasion.id)}
                            onChange={() => handleOccasionToggle(occasion.id)}
                            className="w-4 h-4 text-[#268700] border-gray-300 rounded focus:ring-[#268700]"
                          />
                          <span className="text-sm text-gray-700">{occasion.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <div className="relative">
                  <img
                    src={imagePreview || '/cover.png'}
                    alt="Cover Preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-300"
                  />
                  {selectedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(originalPackage?.cover_image_url || '/cover.png');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
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
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formData.customisation_type === 'FIXED'
                    ? 'Package Items'
                    : 'Category Selections'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.customisation_type === 'FIXED'
                    ? 'Select specific dishes to include in this package'
                    : 'Select categories and set how many dishes users can choose from each'}
                </p>
              </div>
            </div>

            {/* Selected Dishes Summary */}
            {selectedDishes.length > 0 && (
              <div className="mb-4 p-3 bg-[#e8f5e0] rounded-lg border border-[#268700]/20">
                <p className="text-sm font-semibold text-[#1a5a00] mb-2">
                  {selectedDishes.length} dish{selectedDishes.length === 1 ? '' : 'es'} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDishes.map((dish) => (
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

            {errors.package_item_ids && (
              <div className="mb-4 text-sm text-red-600">{errors.package_item_ids}</div>
            )}

            {renderDishesSection()}
          </div>

          {/* Add-ons Section - Only for FIXED packages */}
          {formData.customisation_type === 'FIXED' && (
            <AddOnsSection packageId={packageId} />
          )}

          {/* Pricing & Status */}
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
                      onChange={(e) => handleCustomPriceToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#268700]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#268700]"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {hasCustomPrice ? 'Custom Price' : 'Auto Calculate'}
                    </span>
                  </label>
                </div>

                {/* Custom Price Input */}
                {hasCustomPrice && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <img
                        src="/dirham.svg"
                        alt="AED"
                        className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 z-10"
                      />
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.total_price?.toString() || ''}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          handleInputChange(
                            'total_price',
                            value === '' ? undefined : parseInt(value, 10)
                          );
                        }}
                        placeholder="Enter custom price"
                        className="pl-12"
                        error={errors.total_price}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      This price will be used as a fixed price regardless of the number of
                      guests.
                    </p>
                  </div>
                )}
              </div>

              {/* Calculated Price Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {hasCustomPrice ? 'Package Price (Custom)' : 'Starting Price (Calculated)'}
                </label>
                <div className="relative">
                  <img
                    src="/dirham.svg"
                    alt="AED"
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
                  />
                  <div className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    <span className="text-sm text-gray-500">Starting </span>
                    <span className="text-lg font-semibold">
                      AED {calculatedPrice.toLocaleString()}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {hasCustomPrice
                        ? 'Using custom price set by caterer (fixed price regardless of guest count)'
                        : `Price is automatically calculated from selected dishes × ${
                            formData.minimum_people || minimumGuests || 'minimum'
                          } people`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  value={formData.additional_info}
                  onChange={(e) => handleInputChange('additional_info', e.target.value)}
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
                AED {calculatedPrice.toFixed(2)}
              </span>
              {hasCustomPrice ? (
                <p className="text-xs text-gray-500 mt-1">
                  Using custom price (fixed price regardless of guest count)
                </p>
              ) : (
                selectedDishes.length > 0 &&
                (formData.minimum_people || minimumGuests) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Price will be calculated from selected items for{' '}
                    {formData.minimum_people || minimumGuests} people
                  </p>
                )
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Package
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
