'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { userApi, type Caterer, type Package } from '@/lib/api/user.api';
import { Star, MapPin, Users, ChefHat, ShoppingCart, Plus, Minus, Check, Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Toast, useToast } from '@/components/ui/Toast';
import { getLogoText, getMinEventDate, UAE_EMIRATES } from '@/lib/constants';
import { calculateDishPriceForGuests } from '@/lib/utils/priceCalculation';

type TabType = 'packages' | 'buildOwn' | 'requestQuote';

interface Occasion {
  id: string;
  name: string;
}

export default function CatererDetailPage() {
  const { catererSlug } = useParams<{ catererSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // Data states
  const [caterer, setCaterer] = useState<Caterer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [activeTab, setActiveTab] = useState<TabType>('packages');
  const [guestCount, setGuestCount] = useState(50);
  const [guestCountInput, setGuestCountInput] = useState<string>('50');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedCustomizablePackage, setSelectedCustomizablePackage] = useState<Package | null>(null);

  // Dish selection for customizable packages
  const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
  const [dietaryFilters, setDietaryFilters] = useState<Set<string>>(new Set());
  const [allCatererDishes, setAllCatererDishes] = useState<any[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(false);

  // Event details for add to cart
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [area, setArea] = useState('');

  // Modal state for package items
  const [packageItemsModal, setPackageItemsModal] = useState<{ package: Package; itemsByCategory: { [key: string]: string[] } } | null>(null);

  // Quote request states
  const [quoteEventType, setQuoteEventType] = useState('');
  const [location, setLocation] = useState('');
  const [quoteEventDate, setQuoteEventDate] = useState('');
  const [quoteVision, setQuoteVision] = useState('');
  const [quoteBudget, setQuoteBudget] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState<Set<string>>(new Set());
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Cart states
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartPackageIds, setCartPackageIds] = useState<Set<string>>(new Set());

  // Add-ons selection state (only for FIXED packages) - simple checkbox selection
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set()); // Set<addOnId>

  // Reset selected add-ons when package changes
  useEffect(() => {
    setSelectedAddOns(new Set());
  }, [selectedPackage?.id]);

  // Gallery state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Scroll state
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (!catererSlug) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [catererRes, packagesRes, occasionsRes] = await Promise.all([
          userApi.getCatererById(catererSlug),
          userApi.getPackagesByCatererId(catererSlug),
          userApi.getOccasions(),
        ]);

        if (catererRes.error) {
          setError(catererRes.error);
          return;
        }

        if (catererRes.data?.data) {
          setCaterer(catererRes.data.data);
          // Set initial guest count based on caterer's minimum
          if (catererRes.data.data.minimum_guests) {
            const initialCount = catererRes.data.data.minimum_guests;
            setGuestCount(initialCount);
            setGuestCountInput(String(initialCount));
          }
        }

        if (packagesRes.data?.data) {
          setPackages(packagesRes.data.data);
          // Set initial selected packages
          const fixedPackages = packagesRes.data.data.filter(
            (pkg: Package) => pkg.customisation_type === 'FIXED'
          );
          const customizablePackages = packagesRes.data.data.filter(
            (pkg: Package) => pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE'
          );

        }

        if (occasionsRes.data?.data) {
          setOccasions(occasionsRes.data.data);
        }
      } catch (err) {
        setError('Failed to load caterer details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [catererSlug]);

  // Check which packages are in cart
  useEffect(() => {
    const checkCart = async () => {
      try {
        if (user) {
          const res = await userApi.getCartItems();
          if (res.data?.data) {
            const ids = new Set(res.data.data.map((item: any) => item.package?.id).filter(Boolean));
            setCartPackageIds(ids as Set<string>);
          }
        } else {
          const { cartStorage } = await import('@/lib/utils/cartStorage');
          const localItems = cartStorage.getItems();
          const ids = new Set(localItems.map(item => item.package_id));
          setCartPackageIds(ids);
        }
      } catch (err) {
        console.error('Error checking cart:', err);
      }
    };

    checkCart();
  }, [user]);

  // Select package from URL query parameter and scroll to it
  useEffect(() => {
    const packageId = searchParams.get('packageId');
    if (packageId && packages.length > 0) {
      const pkg = packages.find((p) => p.id === packageId);
      if (pkg) {
        const isCustomizable = pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE';
        if (isCustomizable) {
          setSelectedCustomizablePackage(pkg);
          setActiveTab('buildOwn');
        } else {
          setSelectedPackage(pkg);
          setActiveTab('packages');
        }

        // Scroll to the package after a short delay to ensure DOM is ready
        setTimeout(() => {
          const packageElement = document.getElementById(`package-${packageId}`);
          if (packageElement) {
            packageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [packages, searchParams]);

  // Filter packages by type
  const fixedPackages = useMemo(() => {
    return packages.filter((pkg) => pkg.customisation_type === 'FIXED');
  }, [packages]);

  const customizablePackages = useMemo(() => {
    return packages.filter(
      (pkg) => pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE'
    );
  }, [packages]);

  // Reset selected dishes when customizable package changes
  useEffect(() => {
    if (selectedCustomizablePackage) {
      setSelectedDishes(new Set());
      setAllCatererDishes([]);

      // If package has category_selections but no items, fetch full package details
      const hasCategorySelections = selectedCustomizablePackage.category_selections &&
        selectedCustomizablePackage.category_selections.length > 0;
      const hasItems = selectedCustomizablePackage.items &&
        Array.isArray(selectedCustomizablePackage.items) &&
        selectedCustomizablePackage.items.length > 0;

      if (hasCategorySelections && !hasItems) {
        // Fetch full package details to ensure we have items
        const fetchPackageDetails = async () => {
          try {
            const res = await userApi.getPackageById(selectedCustomizablePackage.id);
            if (res.data?.data) {
              const updatedPackage = res.data.data;
              // Update the package in the packages array
              setPackages((prev) =>
                prev.map((pkg) =>
                  pkg.id === selectedCustomizablePackage.id ? updatedPackage : pkg
                )
              );
              // Update selected package with fresh data
              setSelectedCustomizablePackage(updatedPackage);
            }
          } catch (err) {
            console.error('Error fetching package details:', err);
            showToast('error', 'Failed to load package details');
          }
        };
        fetchPackageDetails();
      }
    }
  }, [selectedCustomizablePackage?.id]);

  // Fetch all caterer dishes when customizable package without category_selections is selected
  useEffect(() => {
    const fetchAllDishes = async () => {
      if (!selectedCustomizablePackage || !catererSlug) return;

      // Only fetch all dishes if package has no category_selections
      // (packages with category_selections use dishes from package.items)
      const hasCategorySelections = selectedCustomizablePackage.category_selections &&
        selectedCustomizablePackage.category_selections.length > 0;

      if (!hasCategorySelections) {
        setLoadingDishes(true);
        try {
          const res = await userApi.getDishesByCatererId(catererSlug);
          if (res.data?.data) {
            setAllCatererDishes(res.data.data);
          }
        } catch (err) {
          console.error('Error fetching caterer dishes:', err);
          showToast('error', 'Failed to load dishes');
        } finally {
          setLoadingDishes(false);
        }
      } else {
        setAllCatererDishes([]);
      }
    };

    fetchAllDishes();
  }, [selectedCustomizablePackage?.id, catererSlug]);

  // Group dishes by category for customizable packages
  const groupedDishesByCategory = useMemo(() => {
    if (!selectedCustomizablePackage) return {};

    const hasCategorySelections = selectedCustomizablePackage.category_selections &&
      selectedCustomizablePackage.category_selections.length > 0;

    // Helper function to check if dish matches dietary filters
    const matchesDietaryFilters = (dish: any): boolean => {
      if (dietaryFilters.size === 0) return true; // No filters selected, show all

      // Get free_forms from dish (dietary information)
      const freeForms = dish.free_forms || [];
      const dietaryNames = freeForms.map((ff: any) => {
        const name = ff.name || (typeof ff === 'string' ? ff : '');
        return name.toLowerCase().trim();
      });

      // Map UI filter names to possible database names
      const filterMap: { [key: string]: string[] } = {
        'gluten free': ['gluten free', 'gluten-free', 'gluten'],
        'vegan': ['vegan'],
        'sugar free': ['sugar free', 'sugar-free', 'no sugar', 'sugarless'],
        'guilt free': ['guilt free', 'guilt-free', 'healthy'],
        'dairy free': ['dairy free', 'dairy-free', 'lactose free', 'no dairy'],
        'nuts free': ['nuts free', 'nuts-free', 'nut free', 'nut-free', 'no nuts'],
      };

      // Check if dish has at least one of the selected dietary preferences
      return Array.from(dietaryFilters).some(filter => {
        const filterLower = filter.toLowerCase().trim();
        const possibleNames = filterMap[filterLower] || [filterLower];

        return possibleNames.some(possibleName =>
          dietaryNames.some((name: string) =>
            name.includes(possibleName) || possibleName.includes(name)
          )
        );
      });
    };

    // If package has category_selections, use dishes from package.items
    // Otherwise, use all caterer dishes
    let dishesToGroup: any[] = [];

    if (hasCategorySelections) {
      // Use package items - these are the dishes selected by the caterer
      if (selectedCustomizablePackage.items && Array.isArray(selectedCustomizablePackage.items) && selectedCustomizablePackage.items.length > 0) {
        dishesToGroup = selectedCustomizablePackage.items
          .filter((item: any) => item.dish && item.dish.id) // Only include items with valid dishes
          .filter((item: any) => matchesDietaryFilters(item.dish)) // Filter by dietary preferences
          .map((item: any) => {
            // API returns category as string (category name) or null
            // Convert to object format for consistency
            const categoryName = item.dish?.category || 'Other';

            return {
              id: item.id, // PackageItem ID
              dish: {
                id: item.dish?.id,
                name: item.dish?.name,
                image_url: item.dish?.image_url,
                price: item.dish?.price,
                currency: item.dish?.currency,
                category: item.dish?.category
                  ? (typeof item.dish.category === 'string'
                    ? { name: item.dish.category }
                    : item.dish.category)
                  : null,
                free_forms: item.dish?.free_forms || [],
              },
              quantity: item.quantity || 1,
              price_at_time: item.price_at_time || item.dish?.price,
            };
          });
      } else {
        // Package has category_selections but no items - this shouldn't happen but handle gracefully
        console.warn('Package has category_selections but no items:', selectedCustomizablePackage.id);
      }
    } else {
      // Use all caterer dishes - convert to same format as package items
      dishesToGroup = allCatererDishes
        .filter((dish: any) => dish.is_active !== false) // Only active dishes
        .filter((dish: any) => matchesDietaryFilters(dish)) // Filter by dietary preferences
        .map((dish: any) => ({
          id: dish.id, // Use dish ID as item ID
          dish: {
            id: dish.id,
            name: dish.name,
            image_url: dish.image_url,
            price: dish.price,
            currency: dish.currency,
            category: dish.category ? {
              id: dish.category.id,
              name: dish.category.name || (typeof dish.category === 'string' ? dish.category : 'Other')
            } : null,
            cuisine_type: dish.cuisine_type,
            free_forms: dish.free_forms || [],
          },
          quantity: 1,
          price_at_time: dish.price,
        }));
    }

    const grouped: { [key: string]: any[] } = {};
    dishesToGroup.forEach((item: any) => {
      // Extract category name - API returns category as string (name) or null
      // Handle both object and string formats for robustness
      let categoryName = 'Other';
      if (item.dish?.category) {
        if (typeof item.dish.category === 'string') {
          categoryName = item.dish.category;
        } else if (item.dish.category && typeof item.dish.category === 'object' && item.dish.category.name) {
          categoryName = item.dish.category.name;
        }
      }

      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(item);
    });
    return grouped;
  }, [selectedCustomizablePackage, allCatererDishes, dietaryFilters]);

  // Get category limits for customizable packages
  const categoryLimits = useMemo(() => {
    if (!selectedCustomizablePackage?.category_selections) return {};

    const limits: Record<string, number | null> = {};
    selectedCustomizablePackage.category_selections.forEach((selection: any) => {
      const categoryName = selection.category?.name || '';
      limits[categoryName] = selection.num_dishes_to_select;
    });
    return limits;
  }, [selectedCustomizablePackage]);

  // Get selected count per category
  const getSelectedCountForCategory = (categoryName: string): number => {
    if (!selectedCustomizablePackage) return 0;
    const items = groupedDishesByCategory[categoryName] || [];
    return items.filter((item) => selectedDishes.has(item.dish?.id)).length;
  };

  // Check if user can select more dishes in a category
  const canSelectMoreInCategory = (categoryName: string): boolean => {
    if (!selectedCustomizablePackage) return false;

    // If no category selections are defined, allow unlimited selection
    if (!selectedCustomizablePackage.category_selections || selectedCustomizablePackage.category_selections.length === 0) {
      return true;
    }

    const limit = categoryLimits[categoryName];
    if (limit === undefined) return true; // Category not in selections - allow unlimited
    if (limit === null) return true; // No limit (select all)
    const selected = getSelectedCountForCategory(categoryName);
    return selected < limit;
  };

  // Toggle dish selection
  const toggleDish = (dishId: string, categoryName: string) => {
    const newSelected = new Set(selectedDishes);
    const isCurrentlySelected = newSelected.has(dishId);

    if (isCurrentlySelected) {
      newSelected.delete(dishId);
    } else {
      // Check if we can add more dishes in this category
      if (!canSelectMoreInCategory(categoryName)) {
        const limit = categoryLimits[categoryName];
        showToast('error', `You can only select ${limit === null ? 'all' : limit} dish(es) from ${categoryName}`);
        return;
      }
      newSelected.add(dishId);
    }
    setSelectedDishes(newSelected);
  };

  // Calculate price for a package based on guest count
  const calculatePrice = (pkg: Package) => {
    // For FIXED packages with custom price, scale linearly
    if (pkg.customisation_type === 'FIXED' && pkg.is_custom_price) {
      const peopleCount = pkg.people_count || pkg.minimum_people || 1;
      const totalPrice = typeof pkg.total_price === 'number' ? pkg.total_price : Number(pkg.total_price || 0);
      return Math.round((totalPrice / peopleCount) * guestCount);
    }
    
    // For CUSTOMISABLE packages with custom price, use total_price as-is (no scaling)
    if (pkg.customisation_type === 'CUSTOMISABLE' && pkg.is_custom_price) {
      return typeof pkg.total_price === 'number' ? pkg.total_price : Number(pkg.total_price || 0);
    }

    const isCustomizable = pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE';
    const hasCategorySelections = pkg.category_selections && pkg.category_selections.length > 0;

    // For customizable packages, calculate from selected dishes
    if (isCustomizable && selectedDishes.size > 0) {
      let selectedTotal = 0;

      // Get all available dishes (from package items or all caterer dishes)
      const allAvailableDishes = hasCategorySelections
        ? (pkg.items || [])
        : allCatererDishes.map((dish: any) => ({
          dish: {
            id: dish.id,
            price: dish.price,
            serves_people: dish.serves_people,
          },
          quantity: 1,
          price_at_time: dish.price,
        }));

      allAvailableDishes.forEach((item: any) => {
        const dishId = item.dish?.id;
        if (selectedDishes.has(dishId)) {
          const dishPrice = Number(item.price_at_time || item.dish?.price || 0);
          const quantity = item.quantity || 1;
          const servesPeople = item.dish?.serves_people ?? null;
          // Use the new calculation function that considers serves_people
          const dishPriceForGuests = calculateDishPriceForGuests(dishPrice, servesPeople, guestCount);
          selectedTotal += dishPriceForGuests * quantity;
        }
      });

      return Math.round(selectedTotal);
    }

    // For fixed packages or customizable without selections
    // If package has items with dish details, recalculate using serves_people
    if (pkg.items && pkg.items.length > 0) {
      let totalPrice = 0;
      pkg.items.forEach((item: any) => {
        const dish = item.dish;
        if (dish) {
          const dishPrice = Number(item.price_at_time || dish.price || 0);
          const quantity = item.quantity || 1;
          const servesPeople = dish.serves_people ?? null;
          const dishPriceForGuests = calculateDishPriceForGuests(dishPrice, servesPeople, guestCount);
          totalPrice += dishPriceForGuests * quantity;
        }
      });
      return Math.round(totalPrice);
    }

    // Fallback to simple scaling if no items available
    const peopleCount = pkg.people_count || pkg.minimum_people || 1;
    // Ensure we're using Number() to convert from Decimal/string
    const totalPrice = typeof pkg.total_price === 'number' ? pkg.total_price : Number(pkg.total_price || 0);
    // Always calculate price_per_person from total_price to ensure accuracy
    const pricePerPerson = peopleCount > 0 ? totalPrice / peopleCount : 0;
    return Math.round(pricePerPerson * guestCount);
  };

  // Calculate price per person for display
  const calculatePricePerPerson = (pkg: Package) => {
    // Always calculate from total_price to ensure accuracy
    const peopleCount = pkg.people_count || pkg.minimum_people || 1;
    // Ensure we're using Number() to convert from Decimal/string
    const totalPrice = typeof pkg.total_price === 'number' ? pkg.total_price : Number(pkg.total_price || 0);
    if (peopleCount === 0) return 0;
    return totalPrice / peopleCount;
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    const pkg = activeTab === 'packages' ? selectedPackage : selectedCustomizablePackage;
    if (!pkg) {
      showToast('error', 'Please select a package');
      return;
    }

    // Validate event details
    if (!eventDate) {
      showToast('error', 'Please select an event date');
      return;
    }
    if (!eventTime) {
      showToast('error', 'Please select an event time');
      return;
    }
    if (!eventType) {
      showToast('error', 'Please select an event type');
      return;
    }
    if (!area) {
      showToast('error', 'Please select an area');
      return;
    }

    // Validate customizable package selections
    const isCustomizable = pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE';
    if (isCustomizable) {
      if (pkg.category_selections && pkg.category_selections.length > 0) {
        // Package has category limits - validate against them
        for (const selection of pkg.category_selections) {
          const categoryName = selection.category?.name || '';
          const limit = selection.num_dishes_to_select;
          const selectedCount = getSelectedCountForCategory(categoryName);
          const availableCount = groupedDishesByCategory[categoryName]?.length || 0;

          // Check if limit is exceeded
          if (limit !== null && selectedCount > limit) {
            showToast('error', `You can only select up to ${limit} dish${limit === 1 ? '' : 'es'} from ${categoryName} category`);
            return;
          }
        }

        // Ensure at least one dish is selected across all categories
        if (selectedDishes.size === 0) {
          showToast('error', 'Please select at least one dish to add to cart');
          return;
        }
      } else {
        // Package has no category limits - just require at least one dish selected
        if (selectedDishes.size === 0) {
          showToast('error', 'Please select at least one dish');
          return;
        }
      }
    }

    setAddingToCart(true);
    try {
      const totalPrice = calculatePrice(pkg);
      const peopleCount = pkg.people_count || pkg.minimum_people || 1;
      const pricePerPerson = pkg.price_per_person ?? (pkg.total_price / peopleCount);

      // For customizable packages with selected dishes, create a custom package first
      if (isCustomizable && selectedDishes.size > 0) {
        // Get dish IDs from selected dishes
        const dishIds = Array.from(selectedDishes);

        if (user) {
          // For authenticated users, create custom package on server
          const customPackageRes = await userApi.createCustomPackage({
            dish_ids: dishIds,
            people_count: guestCount,
          });

          if (customPackageRes.error) {
            showToast('error', customPackageRes.error);
            return;
          }

          if (customPackageRes.data?.data) {
            const customPackage = customPackageRes.data.data;

            // Add custom package to cart - let backend calculate price with serves_people
            const cartRes = await userApi.createCartItem({
              package_id: customPackage.id,
              guests: guestCount,
              // Don't send price_at_time - let backend recalculate with serves_people
              date: eventDate,
            });

            if (cartRes.error) {
              showToast('error', cartRes.error);
              return;
            }

            if (cartRes.data?.success) {
              showToast('success', 'Custom package added to cart!');
              setCartPackageIds(prev => new Set([...prev, customPackage.id]));
              // Dispatch event to update cart count in navbar
              window.dispatchEvent(new Event('cartUpdated'));
            }
          }
        } else {
          // For non-authenticated users, store in localStorage
          // Get dish details for the custom package
          const hasCategorySelections = pkg.category_selections && pkg.category_selections.length > 0;
          const allAvailableDishes = hasCategorySelections
            ? (pkg.items || [])
            : allCatererDishes;

          const selectedDishDetails = allAvailableDishes
            .filter((item: any) => {
              const dishId = item.dish?.id || item.id;
              return selectedDishes.has(dishId);
            })
            .map((item: any) => ({
              id: item.dish?.id || item.id,
              name: item.dish?.name || item.name,
              price: item.dish?.price || item.price,
              currency: item.dish?.currency || item.currency || 'AED',
              image_url: item.dish?.image_url || item.image_url,
              category: item.dish?.category
                ? (typeof item.dish.category === 'string'
                  ? { name: item.dish.category }
                  : item.dish.category)
                : (item.category ? { name: item.category } : null),
            }));

          // Store custom package in localStorage
          const { customPackageStorage } = await import('@/lib/utils/customPackageStorage');
          const customPackage = customPackageStorage.addPackage({
            caterer_id: caterer?.id || '',
            caterer_name: caterer?.business_name || caterer?.name || 'Unknown',
            dish_ids: dishIds,
            people_count: guestCount,
            dishes: selectedDishDetails,
            total_price: totalPrice,
            currency: pkg.currency,
          });

          // Add to localStorage cart with custom package reference
          const { cartStorage } = await import('@/lib/utils/cartStorage');
          cartStorage.addItem({
            package_id: customPackage.id, // Use custom package ID
            package: {
              id: customPackage.id,
              name: `Custom Package - ${pkg.name}`,
              people_count: guestCount,
              total_price: totalPrice,
              price_per_person: totalPrice / guestCount,
              currency: pkg.currency,
              cover_image_url: pkg.cover_image_url,
              caterer: {
                id: caterer?.id || '',
                business_name: caterer?.business_name || null,
                name: caterer?.name,
              },
            },
            guests: guestCount,
            price_at_time: totalPrice,
            event_date: eventDate,
            event_time: eventTime,
            event_type: eventType,
            area: area,
          });

          showToast('success', 'Custom package added to cart!');
          setCartPackageIds(prev => new Set([...prev, customPackage.id]));
          // Dispatch event to update cart count in navbar
          window.dispatchEvent(new Event('cartUpdated'));
        }
      } else {
        // For fixed packages or customizable without selections, add original package
        if (user) {
          // Prepare add-ons array for API (quantity is always 1 for checkbox selection)
          const addOnsArray = Array.from(selectedAddOns).map((addOnId) => ({
            add_on_id: addOnId,
            quantity: 1,
          }));

          // Add to server cart for authenticated users - let backend calculate with serves_people
          const res = await userApi.createCartItem({
            package_id: pkg.id,
            guests: guestCount,
            // Don't send price_at_time - let backend recalculate with serves_people
            date: eventDate,
            event_time: eventTime,
            event_type: eventType,
            area: area,
            add_ons: addOnsArray.length > 0 ? addOnsArray : undefined,
          });

          if (res.error) {
            showToast('error', res.error);
            return;
          }

          if (res.data?.success) {
            showToast('success', `${pkg.name} added to cart!`);
            setCartPackageIds(prev => new Set([...prev, pkg.id]));
            // Dispatch event to update cart count in navbar
            window.dispatchEvent(new Event('cartUpdated'));
          }
        } else {
          // Store in localStorage for non-authenticated users
          const { cartStorage } = await import('@/lib/utils/cartStorage');
          cartStorage.addItem({
            package_id: pkg.id,
            package: {
              id: pkg.id,
              name: pkg.name,
              people_count: peopleCount,
              total_price: pkg.total_price,
              price_per_person: pricePerPerson,
              currency: pkg.currency,
              cover_image_url: pkg.cover_image_url,
              caterer: {
                id: pkg.caterer?.id || caterer?.id || '',
                business_name: (pkg.caterer as any)?.business_name || caterer?.business_name || null,
                name: pkg.caterer?.name || caterer?.name,
              },
            },
            guests: guestCount,
            price_at_time: totalPrice,
            event_date: eventDate,
            event_time: eventTime,
            event_type: eventType,
            area: area,
          });

          showToast('success', `${pkg.name} added to cart!`);
          setCartPackageIds(prev => new Set([...prev, pkg.id]));
          // Dispatch event to update cart count in navbar
          window.dispatchEvent(new Event('cartUpdated'));
        }
      }
    } catch (err) {
      showToast('error', 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle quote request
  const handleRequestQuote = async () => {
    if (!caterer?.id) return;

    if (!user) {
      showToast('error', 'Please log in to request a quote');
      router.push('/login');
      return;
    }

    setSubmittingQuote(true);
    try {
      const res = await userApi.createProposal({
        caterer_id: caterer.id,
        event_type: quoteEventType || undefined,
        location: location || undefined,
        dietary_preferences: Array.from(dietaryPreferences),
        budget_per_person: quoteBudget || undefined,
        event_date: quoteEventDate || undefined,
        vision: quoteVision || undefined,
        guest_count: guestCount,
      });

      if (res.error) {
        showToast('error', res.error);
        return;
      }

      showToast('success', 'Quote request submitted successfully!');
      // Reset form
      setQuoteVision('');
      setQuoteBudget('');
      setDietaryPreferences(new Set());
    } catch (err) {
      showToast('error', 'Failed to submit quote request');
    } finally {
      setSubmittingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading caterer...</p>
        </div>
      </div>
    );
  }

  if (error || !caterer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Caterer not found'}</p>
          <Link
            href="/caterers"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to Caterers
          </Link>
        </div>
      </div>
    );
  }

  const logoText = getLogoText(caterer.name);
  const packageIdFromUrl = searchParams.get('packageId');
  const showBackLink = packageIdFromUrl !== null;

  return (
    <section className="bg-gray-50 min-h-screen pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          {showBackLink && (
            <>
              <Link href="/packages" className="hover:text-green-600 transition flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back to Packages
              </Link>
              <span>/</span>
            </>
          )}
          <Link href="/caterers" className="hover:text-green-600 transition">
            Caterers
          </Link>
          <span>/</span>
          <span className="text-gray-900">{caterer.name}</span>
        </nav>

        <div className={`grid grid-cols-1 ${caterer.gallery_images && caterer.gallery_images.length > 0 ? 'lg:grid-cols-2' : ''} gap-6 mb-6 transition-all duration-300 ease-in-out`}>
          {/* Left Column - Caterer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit transition-all duration-300 ease-in-out">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className={`font-bold text-gray-900 transition-all duration-300 ease-in-out origin-left ${scrolled ? 'text-xl' : 'text-3xl'}`}>
                {caterer.name}
              </h1>
              <div className={`relative rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200 transition-all duration-300 ease-in-out ${scrolled ? 'w-14 h-14' : 'w-24 h-24'}`}>
                {caterer.image_url ? (
                  <Image
                    src={caterer.image_url}
                    alt={caterer.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl bg-green-500">
                    {logoText}
                  </div>
                )}
              </div>
            </div>

            {/* Cuisines */}
            <div className={`flex flex-wrap gap-2 transition-all duration-300 mb-4`}>
              {caterer.cuisines.map((cuisine) => (
                <span
                  key={cuisine}
                  className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1 rounded-full"
                >
                  {cuisine}
                </span>
              ))}
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${scrolled ? 'mb-2 text-xs' : 'mb-6'}`}>
              {packages[0]?.rating && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Star className={`transition-all duration-300 ${scrolled ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-400 fill-yellow-400`} />
                  <span className="font-semibold">
                    {Number(packages[0].rating).toFixed(1)} <span className="text-gray-400 font-normal text-sm">Rating</span>
                  </span>
                </div>
              )}
              {caterer.location && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className={`transition-all duration-300 ${scrolled ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
                  <span className={`transition-all duration-300 ${scrolled ? 'text-xs' : 'text-sm'} font-medium`}>{caterer.location}</span>
                </div>
              )}
              {(caterer.minimum_guests || caterer.maximum_guests) && (
                <div className="flex items-center gap-2 text-gray-700 col-span-2">
                  <Users className={`transition-all duration-300 ${scrolled ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
                  <span className={`transition-all duration-300 ${scrolled ? 'text-xs' : 'text-sm'}`}>
                    Capacity: <span className="font-semibold">{caterer.minimum_guests || 0} - {caterer.maximum_guests || 'Unlimited'}</span> guests
                  </span>
                </div>
              )}
            </div>

            <div className={`border-t border-gray-100 transition-all duration-300 ${scrolled ? 'my-2 pt-2' : 'my-4 pt-4'}`}>
              {/* Description - Animated hide/show */}
              <div className={`transform-gpu overflow-hidden transition-all duration-300 ease-in-out ${scrolled ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-4'}`}>
                {caterer.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {caterer.description}
                  </p>
                )}
              </div>
            </div>

            {/* Service & Price */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Price Range</span>
                <span className="font-bold text-gray-900">{caterer.priceRange}</span>
              </div>

              {/* Tags - Animated hide/show */}
              <div className={`transform-gpu overflow-hidden transition-all duration-300 ease-in-out ${scrolled ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
                <div className="flex flex-wrap gap-2 pt-1">
                  {caterer.delivery_only && (
                    <span className="text-xs border border-blue-100 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5" /> Delivery
                    </span>
                  )}
                  {caterer.delivery_plus_setup && (
                    <span className="text-xs border border-blue-100 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5" /> Setup
                    </span>
                  )}
                  {caterer.full_service && (
                    <span className="text-xs border border-blue-100 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5" /> Full Service
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Gallery */}
          {caterer.gallery_images && caterer.gallery_images.length > 0 && (
            <div className="flex flex-col h-full transition-all duration-300">
              <div
                className="relative w-full rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 ease-in-out aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-0 mb-4"
                onClick={() => setIsGalleryOpen(true)}
              >
                <Image
                  src={caterer.gallery_images[currentImageIndex]}
                  alt="Main Gallery Image"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-semibold">View Fullscreen</span>
                </div>
              </div>

              {/* Thumbnails - Animated hide/show */}
              <div className={`transform-gpu overflow-hidden transition-all duration-300 ease-in-out ${scrolled ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
                {caterer.gallery_images && caterer.gallery_images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2 flex-shrink-0 pt-1">
                    {caterer.gallery_images.slice(0, 5).map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-100 transition-all ${currentImageIndex === idx ? 'ring-2 ring-green-500 ring-inset opacity-100' : 'opacity-70'
                          }`}
                        onClick={() => {
                          setCurrentImageIndex(idx);
                          if (idx === 4 && caterer.gallery_images && caterer.gallery_images.length > 5) {
                            setIsGalleryOpen(true);
                          }
                        }}
                      >
                        <Image
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {idx === 4 && caterer.gallery_images && caterer.gallery_images.length > 5 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                            +{caterer.gallery_images.length - 5}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-1 mb-6">
          <div className="flex gap-1">
            {[
              { id: 'packages', label: 'Set Menus' },
              { id: 'buildOwn', label: 'Build Your Own' },
              { id: 'requestQuote', label: 'Customized Menu' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guest Count Selector - Shown for packages and build your own tabs */}
        {(activeTab === 'packages' || activeTab === 'buildOwn') && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'packages' ? 'Select Your Package' : 'Build Your Menu'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a package and add it to your cart
                </p>
                {selectedPackage && selectedPackage.customisation_type === 'FIXED' && (
                  <p className="text-xs text-blue-600 mt-1">
                    Guest count must be in multiples of {selectedPackage.minimum_people || selectedPackage.people_count} for this package
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Number of guests:
                </label>
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() => {
                      let decrement = 1;
                      // For FIXED packages, decrement by minimum_people
                      if (selectedPackage && selectedPackage.customisation_type === 'FIXED') {
                        decrement = selectedPackage.minimum_people || selectedPackage.people_count || 1;
                      }
                      const newCount = Math.max(caterer.minimum_guests || 1, guestCount - decrement);
                      setGuestCount(newCount);
                      setGuestCountInput(String(newCount));
                    }}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={guestCountInput}
                    onChange={(e) => {
                      // Allow user to type freely - store as string
                      setGuestCountInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value.trim();
                      const numValue = Number(inputValue);

                      // Validate and clamp on blur
                      if (inputValue === '' || isNaN(numValue) || numValue < 1) {
                        const minGuests = caterer.minimum_guests || 1;
                        setGuestCount(minGuests);
                        setGuestCountInput(String(minGuests));
                        return;
                      }

                      // For FIXED packages, ensure guest count is a multiple of minimum_people
                      if (selectedPackage && selectedPackage.customisation_type === 'FIXED') {
                        const minPeople = selectedPackage.minimum_people || selectedPackage.people_count || 1;
                        const nearestMultiple = Math.round(numValue / minPeople) * minPeople;
                        const validValue = Math.max(minPeople, nearestMultiple);
                        setGuestCount(validValue);
                        setGuestCountInput(String(validValue));
                        return;
                      }

                      // Clamp to min/max range
                      const minGuests = caterer.minimum_guests || 1;
                      const maxGuests = caterer.maximum_guests || 9999;
                      const clampedValue = Math.max(minGuests, Math.min(maxGuests, numValue));
                      setGuestCount(clampedValue);
                      setGuestCountInput(String(clampedValue));
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key to validate and blur
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-20 text-center py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent"
                    min={caterer.minimum_guests || 1}
                    max={caterer.maximum_guests || 9999}
                    step={selectedPackage && selectedPackage.customisation_type === 'FIXED' ? (selectedPackage.minimum_people || selectedPackage.people_count || 1) : 1}
                  />
                  <button
                    onClick={() => {
                      let increment = 1;
                      // For FIXED packages, increment by minimum_people
                      if (selectedPackage && selectedPackage.customisation_type === 'FIXED') {
                        increment = selectedPackage.minimum_people || selectedPackage.people_count || 1;
                      }
                      const newCount = Math.min(caterer.maximum_guests || 9999, guestCount + increment);
                      setGuestCount(newCount);
                      setGuestCountInput(String(newCount));
                    }}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content - Two Column Layout */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Packages */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              {fixedPackages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No fixed menu packages available from this caterer.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fixedPackages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const totalPrice = calculatePrice(pkg);
                    const pricePerPerson = calculatePricePerPerson(pkg);

                    // Get menu summary
                    const menuSummary: { [key: string]: string[] } = {};
                    if (pkg.items) {
                      pkg.items.forEach((item: any) => {
                        // Category is returned as a string from the API, not an object
                        const categoryName = item.dish?.category || 'Other';
                        if (!menuSummary[categoryName]) {
                          menuSummary[categoryName] = [];
                        }
                        menuSummary[categoryName].push(item.dish?.name || 'Unknown');
                      });
                    }

                    // Flatten all dishes into a single list for the card
                    const allDishes: string[] = [];
                    if (pkg.items) {
                      pkg.items.forEach((item: any) => {
                        if (item.dish?.name) {
                          allDishes.push(item.dish.name);
                        }
                      });
                    }

                    return (
                      <div
                        id={`package-${pkg.id}`}
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative border rounded-lg p-5 cursor-pointer transition-all bg-white ${isSelected
                          ? 'border-green-500 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center z-10">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}

                        {/* Package Image */}
                        <div className="relative h-48 w-[calc(100%+2.5rem)] -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-lg bg-gray-100">
                          <Image
                            src={pkg.cover_image_url || '/logo2.svg'}
                            alt={pkg.name}
                            fill
                            className={pkg.cover_image_url && !pkg.cover_image_url.includes('logo2.svg') ? "object-cover" : "object-contain p-8"}
                            unoptimized
                          />
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-lg text-gray-900 mb-2 pr-8">
                          {pkg.name}
                        </h3>

                        {/* Description */}
                        {pkg.description && (
                          <p className="text-sm text-gray-500 mb-4">
                            {pkg.description}
                          </p>
                        )}

                        {/* Meal Components - Bulleted List */}
                        {allDishes.length > 0 && (
                          <div className="space-y-1.5 mb-4">
                            {allDishes.slice(0, 5).map((dishName, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>{dishName}</span>
                              </div>
                            ))}
                            {allDishes.length > 5 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPackageItemsModal({ package: pkg, itemsByCategory: menuSummary });
                                }}
                                className="text-green-600 hover:text-green-700 text-sm font-medium mt-1 pl-4"
                              >
                                +{allDishes.length - 5} more
                              </button>
                            )}
                          </div>
                        )}

                        {/* Separator */}
                        <div className="border-t border-gray-200 my-4"></div>

                        {/* Pricing */}
                        <div className="space-y-1">
                          <p className="font-bold text-base text-gray-900">
                            {pkg.is_custom_price ? (
                              <>AED {Number(pkg.total_price).toLocaleString()}</>
                            ) : (
                              <>AED {pricePerPerson.toLocaleString()} / person</>
                            )}
                          </p>
                          {!pkg.is_custom_price && (
                            <p className="text-sm text-gray-500">
                              Total for {guestCount} guests: AED {totalPrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column - Event Details */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>

                {/* Event Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={getMinEventDate()}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Event Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Event Time
                  </label>
                  <select
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select time</option>
                    {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
                      '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
                      '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
                      '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
                      '8:00 PM', '8:30 PM', '9:00 PM'].map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                  </select>
                </div>

                {/* Event Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select event type</option>
                    {occasions.map((occasion) => (
                      <option key={occasion.id} value={occasion.id}>
                        {occasion.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Area */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Area
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select area</option>
                    {UAE_EMIRATES.map((emirate) => (
                      <option key={emirate} value={emirate}>
                        {emirate}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add-ons Selection - Only for FIXED packages */}
                {selectedPackage && selectedPackage.customisation_type === 'FIXED' && selectedPackage.add_ons && selectedPackage.add_ons.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Optional Add-ons</h3>
                    <div className="space-y-3">
                      {selectedPackage.add_ons.map((addOn) => {
                        const isSelected = selectedAddOns.has(addOn.id);
                        return (
                          <label
                            key={addOn.id}
                            className={`flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                              } ${!addOn.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSet = new Set(selectedAddOns);
                                if (e.target.checked) {
                                  newSet.add(addOn.id);
                                } else {
                                  newSet.delete(addOn.id);
                                }
                                setSelectedAddOns(newSet);
                              }}
                              disabled={!addOn.is_active}
                              className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900">{addOn.name}</h4>
                                {!addOn.is_active && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">Unavailable</span>
                                )}
                              </div>
                              {addOn.description && (
                                <p className="text-xs text-gray-600 mt-1">{addOn.description}</p>
                              )}
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {addOn.currency} {addOn.price.toLocaleString()}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                {selectedPackage && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Package for {guestCount} guests</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPackage.currency} {calculatePrice(selectedPackage).toLocaleString()}
                        </span>
                      </div>
                      {selectedPackage.customisation_type === 'FIXED' && selectedPackage.add_ons && selectedPackage.add_ons.length > 0 && (
                        <>
                          {Array.from(selectedAddOns).map((addOnId) => {
                            const addOn = selectedPackage.add_ons?.find(a => a.id === addOnId);
                            if (!addOn) return null;
                            return (
                              <div key={addOnId} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{addOn.name}</span>
                                <span className="text-gray-900">
                                  {addOn.currency} {addOn.price.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                          <div className="border-t border-gray-300 pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-900">Total</span>
                              <span className="text-xl font-bold text-gray-900">
                                {selectedPackage.currency} {(
                                  calculatePrice(selectedPackage) +
                                  Array.from(selectedAddOns).reduce((sum, addOnId) => {
                                    const addOn = selectedPackage.add_ons?.find(a => a.id === addOnId);
                                    return sum + (addOn ? addOn.price : 0);
                                  }, 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      {(!selectedPackage.add_ons || selectedPackage.add_ons.length === 0 || selectedPackage.customisation_type !== 'FIXED') && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900">Total</span>
                          <span className="text-xl font-bold text-gray-900">
                            {selectedPackage.currency} {calculatePrice(selectedPackage).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || !eventDate || !eventTime || !eventType || !area || !selectedPackage}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingToCart ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buildOwn' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Packages */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              {customizablePackages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No customizable menu packages available from this caterer.
                </p>
              ) : selectedCustomizablePackage ? (
                // Show header with selected package and Change button
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">Build Your Menu</h2>
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm"
                      disabled
                    >
                      {selectedCustomizablePackage.name}
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedCustomizablePackage(null)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                // Show all packages when none selected
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customizablePackages.map((pkg) => {
                    const isSelected = false; // No package is selected in this branch
                    const totalPrice = calculatePrice(pkg);
                    const pricePerPerson = calculatePricePerPerson(pkg);

                    // Get menu summary
                    const menuSummary: { [key: string]: string[] } = {};
                    if (pkg.items) {
                      pkg.items.forEach((item: any) => {
                        // Category is returned as a string from the API, not an object
                        const categoryName = item.dish?.category || 'Other';
                        if (!menuSummary[categoryName]) {
                          menuSummary[categoryName] = [];
                        }
                        menuSummary[categoryName].push(item.dish?.name || 'Unknown');
                      });
                    }

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedCustomizablePackage(pkg)}
                        className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all ${isSelected
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center z-10">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}

                        {/* Package Image */}
                        <div className="relative h-48 w-[calc(100%+2.5rem)] -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-lg bg-gray-100">
                          <Image
                            src={pkg.cover_image_url || '/logo2.svg'}
                            alt={pkg.name}
                            fill
                            className={pkg.cover_image_url && !pkg.cover_image_url.includes('logo2.svg') ? "object-cover" : "object-contain p-8"}
                            unoptimized
                          />
                        </div>

                        {/* Package Header */}
                        <div className="flex items-start justify-between mb-3 pr-8">
                          <div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Customizable
                            </span>
                            <h3 className="font-semibold text-lg text-gray-900 mt-2">
                              {pkg.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              {pkg.is_custom_price ? (
                                <>AED {Number(pkg.total_price).toLocaleString()}</>
                              ) : (
                                <>AED {pricePerPerson.toLocaleString()}</>
                              )}
                            </p>
                            {!pkg.is_custom_price && (
                              <p className="text-xs text-gray-500">per person</p>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                        )}

                        {/* Menu Items */}
                        {Object.keys(menuSummary).length > 0 && (
                          <div className="space-y-2 mb-4 text-sm text-gray-600">
                            {Object.entries(menuSummary).slice(0, 5).map(([category, items]) => (
                              <div key={category} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>
                                  <span className="font-medium text-gray-700">{category}:</span>{' '}
                                  {items.slice(0, 3).join(', ')}
                                  {items.length > 3 && ` +${items.length - 3} more`}
                                </span>
                              </div>
                            ))}
                            {Object.keys(menuSummary).length > 5 && (
                              <p className="text-gray-400 text-xs italic pl-4">
                                +{Object.keys(menuSummary).length - 5} more categories
                              </p>
                            )}
                          </div>
                        )}

                        {/* Price Summary */}
                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                              {pkg.is_custom_price ? 'Total:' : `Total for ${guestCount} guests:`}
                            </span>
                            <span className="font-bold text-gray-900">AED {totalPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dish Selection Section - Shows when a customizable package is selected */}
              {selectedCustomizablePackage && (
                <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select Your Dishes
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedCustomizablePackage.category_selections && selectedCustomizablePackage.category_selections.length > 0
                        ? 'Choose dishes from each category according to the limits set by the caterer'
                        : 'Select any dishes you want from the menu below'}
                    </p>
                  </div>

                  {/* Dietary Preferences Filters - Always visible when package is selected */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Dietary Preferences
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Gluten Free', 'Vegan', 'Sugar Free', 'Guilt Free', 'Dairy Free', 'Nuts Free'].map((pref) => {
                        const isSelected = dietaryFilters.has(pref);
                        return (
                          <button
                            key={pref}
                            type="button"
                            onClick={() => {
                              const newFilters = new Set(dietaryFilters);
                              if (isSelected) {
                                newFilters.delete(pref);
                              } else {
                                newFilters.add(pref);
                              }
                              setDietaryFilters(newFilters);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${isSelected
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                              }`}
                          >
                            {pref}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {loadingDishes ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
                        <p className="text-gray-500 text-sm">Loading dishes...</p>
                      </div>
                    </div>
                  ) : Object.keys(groupedDishesByCategory).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-2">
                        {dietaryFilters.size > 0
                          ? 'No dishes match the selected dietary preferences. Try adjusting your filters.'
                          : selectedCustomizablePackage.category_selections && selectedCustomizablePackage.category_selections.length > 0
                            ? 'No dishes available for this package. Please contact the caterer.'
                            : 'No dishes available for selection.'}
                      </p>
                      {selectedCustomizablePackage.items && selectedCustomizablePackage.items.length === 0 && (
                        <p className="text-gray-400 text-sm">
                          This package has no dishes configured.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>

                      {/* Dishes by Category */}
                      <div className="space-y-4">
                        {Object.entries(groupedDishesByCategory).map(([categoryName, items]) => {
                          const selectedCount = getSelectedCountForCategory(categoryName);
                          const limit = categoryLimits[categoryName];
                          const hasLimits = selectedCustomizablePackage.category_selections && selectedCustomizablePackage.category_selections.length > 0;
                          const canSelectMore = canSelectMoreInCategory(categoryName);

                          return (
                            <div key={categoryName} className="border border-gray-200 rounded-lg overflow-hidden">
                              {/* Category Header */}
                              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{categoryName}</h4>
                                    {hasLimits && limit !== undefined && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Select {limit === null ? 'any dishes' : `up to ${limit} dish${limit === 1 ? '' : 'es'}`} from this category
                                      </p>
                                    )}
                                  </div>
                                  <span className={`text-sm font-medium ${selectedCount > 0 ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                    {hasLimits && limit !== undefined
                                      ? `${selectedCount} / ${limit === null ? items.length : limit} selected`
                                      : `${selectedCount} selected`}
                                  </span>
                                </div>
                              </div>

                              {/* Dishes List */}
                              <div className="divide-y divide-gray-100">
                                {items.map((item: any) => {
                                  const dishId = item.dish?.id;
                                  const isSelected = selectedDishes.has(dishId);
                                  const isDisabled = !isSelected && !canSelectMore;
                                  const dishPrice = Number(item.price_at_time || item.dish?.price || 0);
                                  const quantity = item.quantity || 1;

                                  return (
                                    <div
                                      key={item.id || dishId}
                                      onClick={() => !isDisabled && dishId && toggleDish(dishId, categoryName)}
                                      className={`px-4 py-3 flex items-center justify-between ${!isDisabled ? 'cursor-pointer hover:bg-gray-50' : ''
                                        } ${isSelected ? 'bg-green-50' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          {item.dish?.name || 'Unknown'}
                                        </p>
                                        {quantity > 1 && (
                                          <p className="text-xs text-gray-500">Quantity: {quantity}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                          AED {dishPrice.toLocaleString()} per person
                                        </p>
                                      </div>
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected
                                        ? 'bg-green-600 border-green-600'
                                        : isDisabled
                                          ? 'border-gray-200 bg-gray-100'
                                          : 'border-gray-300'
                                        }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Event Details */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>

                {/* Event Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={getMinEventDate()}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Event Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Event Time
                  </label>
                  <select
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select time</option>
                    {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
                      '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
                      '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
                      '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
                      '8:00 PM', '8:30 PM', '9:00 PM'].map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                  </select>
                </div>

                {/* Event Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select event type</option>
                    {occasions.map((occasion) => (
                      <option key={occasion.id} value={occasion.id}>
                        {occasion.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Area */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Area
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select area</option>
                    {UAE_EMIRATES.map((emirate) => (
                      <option key={emirate} value={emirate}>
                        {emirate}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Summary */}
                {selectedCustomizablePackage && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Total for {guestCount} guests</span>
                      <span className="text-xl font-bold text-gray-900">
                        AED {calculatePrice(selectedCustomizablePackage).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || !eventDate || !eventTime || !eventType || !area || !selectedCustomizablePackage}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingToCart ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requestQuote' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Request a Custom Quote
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Tell us about your event and we'll create a personalized proposal for you.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={quoteEventType}
                    onChange={(e) => setQuoteEventType(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Event Type</option>
                    {occasions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Guest Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Event Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={quoteEventDate}
                    onChange={(e) => setQuoteEventDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget per Person (AED)
                  </label>
                  <input
                    type="text"
                    value={quoteBudget}
                    onChange={(e) => setQuoteBudget(e.target.value)}
                    placeholder="e.g., 150"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your event location"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Dietary Preferences */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Vegetarian', 'Vegan', 'Halal', 'Gluten Free', 'Sugar Free', 'Kosher'].map(
                    (pref) => {
                      const isSelected = dietaryPreferences.has(pref);
                      return (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => {
                            const newPrefs = new Set(dietaryPreferences);
                            if (isSelected) {
                              newPrefs.delete(pref);
                            } else {
                              newPrefs.add(pref);
                            }
                            setDietaryPreferences(newPrefs);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${isSelected
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                          {pref}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Vision */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us about your vision
                </label>
                <textarea
                  value={quoteVision}
                  onChange={(e) => setQuoteVision(e.target.value)}
                  placeholder="Describe your event, theme, special requirements..."
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <button
                onClick={handleRequestQuote}
                disabled={submittingQuote}
                className={`w-full py-3 rounded-lg font-medium transition ${submittingQuote
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {submittingQuote ? 'Submitting...' : 'Submit Quote Request'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={hideToast} />
      )}
      {/* Image Viewer Modal */}
      {isGalleryOpen && caterer.gallery_images && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsGalleryOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50 transition-colors"
            onClick={() => setIsGalleryOpen(false)}
          >
            <X size={32} />
          </button>

          <div
            className="relative w-full max-w-6xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous button */}
            <button
              className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed z-10"
              onClick={(e) => {
                e.stopPropagation();
                const galleryImages = caterer.gallery_images;
                if (galleryImages) {
                  setCurrentImageIndex((prev) =>
                    prev === 0 ? galleryImages.length - 1 : prev - 1
                  );
                }
              }}
            >
              <ChevronLeft size={32} />
            </button>

            {/* Image */}
            <div className="relative w-full h-[80vh]">
              {caterer.gallery_images && (
                <Image
                  src={caterer.gallery_images[currentImageIndex]}
                  alt={`Gallery image ${currentImageIndex + 1}`}
                  fill
                  className="object-contain select-none"
                  priority
                  unoptimized
                />
              )}
            </div>

            {/* Next button */}
            <button
              className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed z-10"
              onClick={(e) => {
                e.stopPropagation();
                const galleryImages = caterer.gallery_images;
                if (galleryImages) {
                  setCurrentImageIndex((prev) =>
                    prev === galleryImages.length - 1 ? 0 : prev + 1
                  );
                }
              }}
            >
              <ChevronRight size={32} />
            </button>

            {/* Image counter */}
            {caterer.gallery_images && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-1 rounded-full text-white text-sm backdrop-blur-md">
                {currentImageIndex + 1} / {caterer.gallery_images.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Package Items Modal */}
      {packageItemsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPackageItemsModal(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{packageItemsModal.package.name}</h2>
                {packageItemsModal.package.description && (
                  <p className="text-sm text-gray-500 mt-1">{packageItemsModal.package.description}</p>
                )}
              </div>
              <button
                onClick={() => setPackageItemsModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Items ({Object.values(packageItemsModal.itemsByCategory).reduce((sum, items) => sum + items.length, 0)})
              </h3>
              <div className="space-y-6">
                {Object.entries(packageItemsModal.itemsByCategory).map(([categoryName, items]) => (
                  <div key={categoryName}>
                    <h4 className="font-semibold text-gray-900 mb-2">{categoryName}</h4>
                    <div className="space-y-1.5">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
