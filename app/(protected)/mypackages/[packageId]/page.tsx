'use client';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';
import { userApi, type Package } from '@/lib/api/user.api';
import { Check, Plus, Minus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UAE_EMIRATES } from '@/lib/constants';
import { calculateDishPriceForGuests } from '@/lib/utils/priceCalculation';
// import { Testimonials } from '@/user/Testimonials';

interface Occasion {
    id: string;
    name: string;
    description?: string | null;
}

interface CategoryGroup {
    categoryName: string;
    dishes: any[];
    maxSelections?: number;
}

export default function PackageDetailsPage() {
    const [eventType, setEventType] = useState('');
    const [location, setLocation] = useState('');
    const [guests, setGuests] = useState<number>(0);
    const [date, setDate] = useState('');
    const [pkg, setPkg] = useState<Package | null>(null);
    const [occasions, setOccasions] = useState<Occasion[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingToCart, setAddingToCart] = useState(false);
    const [removingFromCart, setRemovingFromCart] = useState(false);
    const [cartMessage, setCartMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isAddedToCart, setIsAddedToCart] = useState(false);
    const [cartItemId, setCartItemId] = useState<string | null>(null);

    // Customization states
    const [isCustomizable, setIsCustomizable] = useState(false);
    const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
    const [savingCustomPackage, setSavingCustomPackage] = useState(false);
    const [showCustomizeSection, setShowCustomizeSection] = useState(false);
    
    // Add-ons selection state (only for FIXED packages) - simple checkbox selection
    const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set()); // Set<addOnId>
    
    // Reset selected add-ons when package changes
    useEffect(() => {
        setSelectedAddOns(new Set());
    }, [pkg?.id]);

    const params = useParams();
    const packageId = params.packageId as string;
    const router = useRouter();
    const { user } = useAuth();

    // Fetch occasions
    useEffect(() => {
        const fetchOccasions = async () => {
            setLoadingTypes(true);
            try {
                const response = await userApi.getOccasions();

                if (response.error) {
                    console.error('Failed to fetch occasions:', response.error);
                } else if (response.data?.data) {
                    setOccasions(response.data.data);
                }
            } catch (err) {
                console.error('Error fetching occasions:', err);
            } finally {
                setLoadingTypes(false);
            }
        };

        fetchOccasions();
    }, []);

    // Fetch package details
    useEffect(() => {
        const fetchPackage = async () => {
            if (!packageId) return;

            setLoading(true);
            setError(null);

            try {
                const response = await userApi.getPackageById(packageId);

                if (response.error) {
                    setError(response.error);
                } else if (response.data?.data) {
                    const packageData = response.data.data;
                    setPkg(packageData);
                    // Event type is no longer used
                    // Set default guests to the package's people_count
                    if (packageData.people_count) {
                        setGuests(packageData.people_count);
                    }

                    // Check if package is customizable based on customisation_type field
                    const isPackageCustomizable = packageData.customisation_type === 'CUSTOMISABLE' ||
                        packageData.customisation_type === 'CUSTOMIZABLE';
                    setIsCustomizable(isPackageCustomizable);

                    // Initialize selected dishes with all items (both optional and non-optional) if customizable
                    if (packageData.items && isPackageCustomizable) {
                        const initialSelected = new Set<string>();
                        packageData.items.forEach((item: any) => {
                            // Handle both item.dish and direct dish reference
                            const dish = item.dish || item;
                            if (dish && dish.id) {
                                // Include all dishes if package is customizable
                                initialSelected.add(dish.id);
                            }
                        });
                        setSelectedDishes(initialSelected);
                    }
                }
            } catch (err) {
                setError('Failed to fetch package');
            } finally {
                setLoading(false);
            }
        };

        fetchPackage();
    }, [packageId]);

    // Check if package is already in cart
    useEffect(() => {
        const checkCartStatus = async () => {
            if (!packageId) return;

            try {
                const response = await userApi.getCartItems();

                if (response.data?.data && Array.isArray(response.data.data)) {
                    const cartItem = response.data.data.find(
                        (item: any) => item.package?.id === packageId
                    );

                    if (cartItem) {
                        setIsAddedToCart(true);
                        setCartItemId(cartItem.id);
                    } else {
                        setIsAddedToCart(false);
                        setCartItemId(null);
                    }
                }
            } catch (err) {
                console.error('Error checking cart status:', err);
            }
        };

        checkCartStatus();
    }, [packageId]);

    // Handle Add to Cart
    const handleAddToCart = async () => {
        // Check authentication first
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setCartMessage({ type: 'error', text: 'Please log in to add items to cart' });
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            return;
        }

        if (!pkg) {
            setCartMessage({ type: 'error', text: 'Package information not available' });
            return;
        }

        // Validate required fields
        if (!eventType) {
            setCartMessage({ type: 'error', text: 'Please select an event type' });
            return;
        }

        if (!location) {
            setCartMessage({ type: 'error', text: 'Please select a location' });
            return;
        }

        if (!guests || guests <= 0) {
            setCartMessage({ type: 'error', text: 'Please select number of guests' });
            return;
        }

        if (!date) {
            setCartMessage({ type: 'error', text: 'Please select a date' });
            return;
        }

        setAddingToCart(true);
        setCartMessage(null);

        try {
            // Format date to ISO string with default time (18:00 local time)
            // Date input gives YYYY-MM-DD, we'll set it to 18:00:00 local time
            const dateObj = new Date(date);
            dateObj.setHours(18, 0, 0, 0); // Set to 6 PM local time
            const isoDate = dateObj.toISOString();

            // Let backend calculate price based on serves_people
            // Don't send price_at_time so backend can recalculate properly

            // Prepare add-ons array for API (quantity is always 1 for checkbox selection)
            const addOnsArray = Array.from(selectedAddOns).map((addOnId) => ({
                add_on_id: addOnId,
                quantity: 1,
            }));

            const cartData = {
                package_id: pkg.id,
                location: location,
                guests: guests,
                date: isoDate,
                // Don't send price_at_time - let backend calculate with serves_people
                add_ons: addOnsArray.length > 0 ? addOnsArray : undefined,
            };

            const response = await userApi.createCartItem(cartData);

            if (response.error) {
                // Handle specific error cases with user-friendly messages
                let errorMessage = response.error;

                if (errorMessage.includes('authentication') || errorMessage.includes('Unauthorized') || errorMessage.includes('User account not found')) {
                    errorMessage = 'Your session has expired. Please log in again.';
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else if (errorMessage.includes('Foreign key') || errorMessage.includes('constraint')) {
                    errorMessage = 'Unable to add to cart. Please try logging in again.';
                } else if (errorMessage.includes('already exists')) {
                    errorMessage = 'This package is already in your cart.';
                }

                setCartMessage({ type: 'error', text: errorMessage });
                setIsAddedToCart(false);
            } else if (response.data?.success) {
                setCartMessage({ type: 'success', text: 'Item added to cart successfully!' });
                setIsAddedToCart(true);
                // Store cart item ID if available in response
                if (response.data?.data?.id) {
                    setCartItemId(response.data.data.id);
                }
                // Clear message after 3 seconds
                setTimeout(() => {
                    setCartMessage(null);
                }, 3000);
            } else {
                setCartMessage({ type: 'error', text: 'Failed to add item to cart' });
                setIsAddedToCart(false);
            }
        } catch (err) {
            console.error('Error adding to cart:', err);
            setCartMessage({ type: 'error', text: 'An error occurred while adding to cart' });
            setIsAddedToCart(false);
        } finally {
            setAddingToCart(false);
        }
    };

    // Handle Remove from Cart
    const handleRemoveFromCart = async () => {
        if (!cartItemId) {
            setCartMessage({ type: 'error', text: 'Cart item ID not found' });
            return;
        }

        if (!confirm('Are you sure you want to remove this item from your cart?')) {
            return;
        }

        setRemovingFromCart(true);
        setCartMessage(null);

        try {
            const response = await userApi.deleteCartItem(cartItemId);

            if (response.error) {
                setCartMessage({ type: 'error', text: response.error });
            } else {
                setCartMessage({ type: 'success', text: 'Item removed from cart successfully!' });
                setIsAddedToCart(false);
                setCartItemId(null);
                // Clear message after 3 seconds
                setTimeout(() => {
                    setCartMessage(null);
                }, 3000);
            }
        } catch (err) {
            console.error('Error removing from cart:', err);
            setCartMessage({ type: 'error', text: 'An error occurred while removing from cart' });
        } finally {
            setRemovingFromCart(false);
        }
    };

    // Reset added to cart state when form fields change (only if not already in cart)
    useEffect(() => {
        // Only reset if the item was just added, not if it was already in cart
        if (isAddedToCart && !cartItemId) {
            setIsAddedToCart(false);
        }
    }, [eventType, location, guests, date]);

    // Group items by category for display
    const groupedItems = pkg ? pkg.items.reduce((acc: any, item) => {
        const categoryName = item.dish?.category?.name || item.dish?.category || 'Uncategorized';
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(item);
        return acc;
    }, {}) : {};

    // Get all dishes from package items for customization
    const getAllDishesFromPackage = () => {
        if (!pkg || !pkg.items) return [];
        const dishMap = new Map<string, any>();
        pkg.items.forEach((item: any) => {
            // Handle both item.dish and direct dish reference
            const dish = item.dish || item;
            if (dish && dish.id) {
                dishMap.set(dish.id, dish);
            }
        });
        return Array.from(dishMap.values());
    };

    // Group dishes by category for customization
    const groupDishesByCategory = (): CategoryGroup[] => {
        const dishes = getAllDishesFromPackage();
        const grouped: { [key: string]: any[] } = {};

        dishes.forEach((dish) => {
            const categoryName = dish.category?.name || 'Other';
            if (!grouped[categoryName]) {
                grouped[categoryName] = [];
            }
            grouped[categoryName].push(dish);
        });

        return Object.entries(grouped).map(([categoryName, categoryDishes]) => ({
            categoryName,
            dishes: categoryDishes,
        }));
    };

    // Toggle dish selection
    const toggleDishSelection = (dishId: string) => {
        const newSelected = new Set(selectedDishes);
        if (newSelected.has(dishId)) {
            newSelected.delete(dishId);
        } else {
            newSelected.add(dishId);
        }
        setSelectedDishes(newSelected);
    };

    // Check if dish is selected
    const isDishSelected = (dishId: string) => {
        return selectedDishes.has(dishId);
    };

    // Calculate total price for customized package
    const calculateCustomizedTotal = () => {
        if (!pkg) return 0;
        let total = 0;
        selectedDishes.forEach((dishId) => {
            const dish = getAllDishesFromPackage().find(d => d.id === dishId);
            if (dish) {
                const dishPrice = Math.round(Number(dish.price));
                const servesPeople = dish.serves_people ?? null;
                // Use the new calculation function that considers serves_people
                const dishPriceForGuests = calculateDishPriceForGuests(dishPrice, servesPeople, guests);
                total += dishPriceForGuests;
            }
        });
        return total;
    };

    // Handle Save Customised Package
    const handleSaveCustomPackage = async () => {
        if (!user) {
            alert('You must be logged in to create a custom package. Please log in and try again.');
            router.push('/login');
            return;
        }

        if (selectedDishes.size === 0) {
            alert('Please select at least one dish to create a custom package.');
            return;
        }

        setSavingCustomPackage(true);
        try {
            const dishIds = Array.from(selectedDishes);

            const response = await userApi.createCustomPackage({
                dish_ids: dishIds,
                people_count: guests || pkg?.people_count || 50,
            });

            if (response.error) {
                if (response.status === 401 || response.error.includes('Unauthorized') || response.error.includes('401')) {
                    alert('Your session has expired. Please log in again.');
                    router.push('/login');
                    return;
                }
                alert(response.error || 'Failed to create custom package. Please try again.');
                return;
            }

            if (response.data?.success && response.data?.data) {
                const newPackageId = response.data.data.id;
                // Redirect to mypackages with the new package ID to highlight it
                router.push(`/mypackages?highlight=${newPackageId}`);
            } else if (response.data?.data) {
                const newPackageId = response.data.data.id;
                router.push(`/mypackages?highlight=${newPackageId}`);
            } else {
                alert('Failed to create custom package. Please try again.');
            }
        } catch (err: any) {
            console.error('Error creating custom package:', err);
            if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
                alert('Your session has expired. Please log in again.');
                router.push('/login');
            } else {
                alert(err?.message || 'Failed to create custom package. Please try again.');
            }
        } finally {
            setSavingCustomPackage(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    if (error || !pkg) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                {error || 'Package not found'}
            </div>
        );
    }

    // Create placeholder images array if cover_image_url exists
    const images = pkg.cover_image_url
        ? [pkg.cover_image_url, '/user/package2.svg', '/user/package3.svg', '/user/package4.svg']
        : ['/user/package1.svg', '/user/package2.svg', '/user/package3.svg', '/user/package4.svg'];

    return (
        <>
            <section className="bg-[#FAFAFA] min-h-screen px-6 py-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">

                    {/* LEFT CONTENT */}
                    <div>
                        {/* Image Gallery */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="col-span-2 row-span-2 relative h-[260px] rounded-xl overflow-hidden">
                                <Image
                                    src={images[0] || '/default_dish.jpg'}
                                    alt={pkg.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {images.slice(1, 4).map((img, i) => (
                                <div
                                    key={i}
                                    className="relative h-[120px] rounded-xl overflow-hidden"
                                >
                                    <Image src={img || '/default_dish.jpg'} alt="" fill className="object-cover" />
                                    {i === 2 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                                            View All ({pkg.items.length})
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Package Description */}
                        {pkg.description && (
                            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {pkg.description}
                                </p>
                            </div>
                        )}

                        {/* Menu Items */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium">
                                    Menu Items {isCustomizable ? '(Customizable)' : '(Fixed)'}
                                </h3>
                                {isCustomizable && (
                                    <button
                                        onClick={() => setShowCustomizeSection(!showCustomizeSection)}
                                        className="px-4 py-2 bg-[#268700] text-white rounded-lg text-sm font-medium hover:bg-[#1f6b00] transition"
                                    >
                                        {showCustomizeSection ? 'Hide Customization' : 'Customize Package'}
                                    </button>
                                )}
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                Package includes {pkg.items.length} items for {pkg.people_count} people.
                            </p>

                            {/* List grouped by category */}
                            <div className="space-y-0">
                                {Object.entries(groupedItems).map(([category, items]: [string, any], categoryIndex) => (
                                    <div key={category} className="mb-0">
                                        {/* Category Header with light grey background */}
                                        <div className="bg-gray-100 py-2 px-4 font-semibold text-gray-900">
                                            {category}
                                        </div>

                                        {/* Dishes List */}
                                        <div className="bg-white">
                                            {items.map((item: any, itemIndex: number) => (
                                                <div
                                                    key={item.id}
                                                    className={`py-3 px-4 border-b border-gray-200 ${itemIndex === items.length - 1 && categoryIndex !== Object.keys(groupedItems).length - 1
                                                        ? 'border-b-2 border-gray-300' : ''}`}
                                            >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">
                                                    {item.dish?.name || 'Unknown Dish'}
                                                    {item.quantity > 1 && (
                                                        <span className="text-gray-500 ml-2">(x{item.quantity})</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Category Selections (if customizable) */}
                        {pkg.category_selections.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h4 className="font-medium mb-2">Customizable Categories</h4>
                                {pkg.category_selections.map((selection) => (
                                    <div key={selection.id} className="text-sm text-gray-600 mb-1">
                                        {selection.category.name}: {selection.num_dishes_to_select === null || selection.num_dishes_to_select === undefined
                                            ? 'Select all'
                                            : `Select ${selection.num_dishes_to_select} dish(es)`}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Customization Section */}
                    {isCustomizable && showCustomizeSection && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
                            <h3 className="font-semibold text-lg mb-4 text-gray-900">Customize Your Package</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Select dishes from the menu below to create your custom package.
                            </p>

                            {groupDishesByCategory().length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No dishes available for customization.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {groupDishesByCategory().map((categoryGroup) => {
                                        const selectedInCategory = Array.from(selectedDishes).filter(id => {
                                            const dish = getAllDishesFromPackage().find(d => d.id === id);
                                            return dish?.category?.name === categoryGroup.categoryName;
                                        }).length;

                                        return (
                                            <div key={categoryGroup.categoryName} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                <h4 className="font-semibold text-lg text-gray-900 mb-4">
                                                    {categoryGroup.categoryName}
                                                    {selectedInCategory > 0 && (
                                                        <span className="text-sm text-gray-500 ml-2">
                                                            ({selectedInCategory} selected)
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="space-y-2">
                                                    {categoryGroup.dishes.map((dish) => {
                                                        const isSelected = isDishSelected(dish.id);

                                                        return (
                                                            <div
                                                                key={dish.id}
                                                                className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${isSelected
                                                                    ? 'border-[#268700] bg-green-50'
                                                                    : 'border-gray-200 hover:border-gray-300'
                                                                }`}
                                                    onClick={() => toggleDishSelection(dish.id)}
                                                            >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{dish.name}</p>
                                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                                            {dish.cuisine_type?.name || 'Cuisine'} • <img src="/dirham.svg" alt="AED" className="w-3 h-3" />{Math.round(Number(dish.price)).toLocaleString()}/person
                                                        </p>
                                                    </div>
                                                    <div className="ml-4">
                                                        {isSelected ? (
                                                            <Check className="w-5 h-5 text-[#268700]" />
                                                        ) : (
                                                            <Plus className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                                    })}
                                            </div>
                                            </div>
                            );
                                    })}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                                    <img src="/dirham.svg" alt="AED" className="w-6 h-6" />
                                    {calculateCustomizedTotal().toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">{guests || pkg.people_count} guests</p>
                            </div>
                            <button
                                onClick={handleSaveCustomPackage}
                                disabled={selectedDishes.size === 0 || savingCustomPackage}
                                className={`px-8 py-3 rounded-full font-semibold transition ${selectedDishes.size === 0 || savingCustomPackage
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : 'bg-[#268700] text-white hover:bg-[#1f6b00]'
                                        }`}
                                    >
                            {savingCustomPackage ? 'Saving...' : 'Save Customised Package'}
                        </button>
                    </div>
                </div>
            </div>
                    )}
        </div >

            {/* RIGHT SIDEBAR */ }
            < aside className = "bg-white border border-gray-200 rounded-xl p-5 h-fit" >
                    <button className="text-sm text-gray-600 mb-2">
                        ← {pkg.name}
                    </button>

                    <h2 className="font-semibold text-lg">{pkg.name}</h2>

    {
        pkg.rating && (
            <div className="text-sm mt-2">
                ⭐ {pkg.rating}
            </div>
        )
    }

                    <p className="mt-2 font-semibold flex items-center gap-1">
                        <img src="/dirham.svg" alt="AED" className="w-4 h-4" />
                        {(pkg.price_per_person ?? (pkg.total_price / (pkg.people_count || pkg.minimum_people || 1))).toLocaleString()}/Person
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        Total: <img src="/dirham.svg" alt="AED" className="w-3 h-3" />{pkg.total_price?.toLocaleString() ?? '0'} for {pkg.people_count || pkg.minimum_people || 0} people
                    </p>

    {/* Controls */ }
                    <div className="mt-4 space-y-3">
                        {/* Event Type */}
                        <div>
                            <label className="block px-1 text-sm py-2">
                                Event Type
                            </label>
                            <select
                                name="eventType"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#268700]"
                                disabled={loadingTypes}
                            >
                                <option value="" className="text-black">
                                    {loadingTypes ? 'Loading...' : 'Select Event Type'}
                                </option>
                                {occasions.map((occasion) => (
                                    <option key={occasion.id} value={occasion.id} className="text-black">
                                        {occasion.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block px-1 text-sm py-2">
                                Location
                            </label>
                            <select
                                name="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#268700]"
                            >
                                <option value="" className="text-black">Select Location</option>
                                {UAE_EMIRATES.map((emirate) => (
                                    <option key={emirate} value={emirate} className="text-black">
                                        {emirate}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block px-1 text-sm py-2">
                                Guests
                            </label>
                            <select
                                name="guests"
                                value={guests}
                                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#268700]"
                                disabled={!pkg || !pkg.people_count}
                            >
                                {pkg && (pkg.people_count || pkg.minimum_people) ? (
                                    Array.from({ length: 10 }, (_, i) => {
                                        const baseCount = pkg.people_count || pkg.minimum_people || 1;
                                        const guestCount = baseCount * (i + 1);
                                        return (
                                            <option key={guestCount} value={guestCount} className="text-black">
                                                {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
                                            </option>
                                        );
                                    })
                                ) : (
                                    <option value="0" className="text-black">Loading...</option>
                                )}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                name="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 mb-4 focus:outline-none focus:border-[#268700]"
                            />
                        </div>

                    </div>

                    {/* Add-ons Selection - Only for FIXED packages */}
                    {pkg && pkg.customisation_type === 'FIXED' && pkg.add_ons && pkg.add_ons.length > 0 && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Optional Add-ons</h3>
                            <div className="space-y-3">
                                {pkg.add_ons.map((addOn) => {
                                    const isSelected = selectedAddOns.has(addOn.id);
                                    return (
                                        <label
                                            key={addOn.id}
                                            className={`flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                                                isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
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

                    <div className="mt-4 font-semibold">
                        Total Cost
                        <div className="text-lg flex items-center gap-1">
                            <img src="/dirham.svg" alt="AED" className="w-5 h-5" />
                            {(() => {
                                let basePrice = 0;
                                const guestCount = guests > 0 ? guests : (pkg.people_count || pkg.minimum_people || 1);
                                
                                // If package has custom price, use it as-is
                                if (pkg.is_custom_price) {
                                    basePrice = pkg.total_price ?? 0;
                                } else if (pkg.items && pkg.items.length > 0) {
                                    // Calculate from package items using serves_people
                                    pkg.items.forEach((item: any) => {
                                        const dish = item.dish;
                                        if (dish) {
                                            const dishPrice = Number(item.price_at_time || dish.price || 0);
                                            const quantity = item.quantity || 1;
                                            const servesPeople = dish.serves_people ?? null;
                                            const dishPriceForGuests = calculateDishPriceForGuests(dishPrice, servesPeople, guestCount);
                                            basePrice += dishPriceForGuests * quantity;
                                        }
                                    });
                                    basePrice = Math.round(basePrice);
                                } else {
                                    // Fallback to simple scaling if no items
                                    const peopleCount = pkg.people_count || pkg.minimum_people || 1;
                                    basePrice = guests > 0 && guests !== peopleCount 
                                        ? pkg.total_price * (guests / peopleCount)
                                        : pkg.total_price ?? 0;
                                }
                                
                                // Add add-ons price
                                const addOnsTotal = Array.from(selectedAddOns).reduce((sum, addOnId) => {
                                    const addOn = pkg.add_ons?.find(a => a.id === addOnId);
                                    return sum + (addOn ? addOn.price : 0);
                                }, 0);
                                
                                return (basePrice + addOnsTotal).toLocaleString(undefined, { maximumFractionDigits: 2 });
                            })()}
                        </div>
                        <div className="text-sm text-gray-500 font-normal flex items-center gap-1">
                            {(() => {
                                const peopleCount = pkg.people_count || pkg.minimum_people || 1;
                                const pricePerPerson = pkg.price_per_person ?? (pkg.total_price / peopleCount);
                                return (
                                    <>
                                        ({guests > 0 ? guests : peopleCount} {guests === 1 || peopleCount === 1 ? 'person' : 'people'} × <img src="/dirham.svg" alt="AED" className="w-3 h-3" />{pricePerPerson.toLocaleString()}/person)
                                    </>
                                );
                            })()}
                        </div>
                    </div>

    {/* Cart Message */}
    {cartMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${cartMessage.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
                            {cartMessage.text}
                        </div>
                    )}

                    <button 
                        onClick={isAddedToCart ? handleRemoveFromCart : handleAddToCart}
                        disabled={
                            (addingToCart || removingFromCart) || 
                            (!pkg) || 
                            (isAddedToCart ? false : (!eventType || !location || !guests || !date))
                        }
                        className={`mt-4 w-full py-3 rounded-full text-white font-medium transition-all ${
        (addingToCart || removingFromCart) || !pkg
                                ? 'bg-gray-400 cursor-not-allowed'
                                : isAddedToCart
                                    ? 'bg-green-800 hover:bg-green-900 cursor-pointer'
                                    : (!eventType || !location || !guests || !date)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-[#268700] hover:opacity-90 cursor-pointer'
                        }`}
                    >
                        {removingFromCart 
                            ? 'Removing from Cart...' 
                            : addingToCart 
                            ? 'Adding to Cart...' 
                            : isAddedToCart 
                            ? 'Remove from Cart' 
                            : 'Add to Cart'}
                    </button>
                </aside>
            </div>
        </section>
        {/* <Testimonials/> */}
        </>
    );
}