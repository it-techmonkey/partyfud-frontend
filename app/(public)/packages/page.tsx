'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { userApi, Package as ApiPackage } from '@/lib/api/user.api';
import { UAE_EMIRATES } from '@/lib/constants';

interface PackageViewModel {
    id: string;
    title: string;
    description?: string;
    caterer: string;
    catererId: string | undefined;
    catererSlug?: string;
    price: number;
    rating?: number;
    image: string;
    customizable?: boolean;
    discount?: string;
    eventType: string;
    occasionIds?: string[];
    minimumPeople: number;
}

export default function PackagesPage() {
    // Filter states
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState('');
    const [minGuests, setMinGuests] = useState<number | ''>('');
    const [maxGuests, setMaxGuests] = useState<number | ''>('');
    const [minPrice, setMinPrice] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number>(50000); // Default to max range
    const [menuType, setMenuType] = useState<'fixed' | 'customizable' | ''>('');
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating_desc' | 'created_desc'>('created_desc');
    const [occasionId, setOccasionId] = useState<string>('');
    const [occasionName, setOccasionName] = useState<string>('');
    const [occasionNameParam, setOccasionNameParam] = useState<string>('');
    const [cuisineTypeId, setCuisineTypeId] = useState<string>('');
    const [cuisineTypeName, setCuisineTypeName] = useState<string>('');
    const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
    const [dishId, setDishId] = useState<string>('');
    const [dishName, setDishName] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    // Data states
    const [allPackages, setAllPackages] = useState<PackageViewModel[]>([]); // Store all packages from API
    const [packages, setPackages] = useState<PackageViewModel[]>([]); // Filtered packages to display
    const [apiPackagesData, setApiPackagesData] = useState<ApiPackage[]>([]); // Store raw API data for people_count access
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [occasions, setOccasions] = useState<Array<{ id: string; name: string }>>([]);
    const router = useRouter();

    // Scroll ref for occasions
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Read occasion_id, occasion_name, and cuisine_type_id from URL on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const occasionIdParam = params.get('occasion_id');
            const occasionNameParamValue = params.get('occasion_name');
            const cuisineTypeIdParam = params.get('cuisine_type_id');
            const dishIdParam = params.get('dish_id');

            if (dishIdParam) {
                setDishId(dishIdParam);
                // Fetch dish name
                const fetchDishName = async () => {
                    try {
                        const response = await userApi.getDishById(dishIdParam);
                        if (response.data?.data) {
                            setDishName(response.data.data.name);
                        }
                    } catch (err) {
                        console.error('Error fetching dish name:', err);
                    }
                };
                fetchDishName();
            }

            if (occasionIdParam) {
                const decodedId = decodeURIComponent(occasionIdParam);
                setOccasionId(decodedId);
                setSelectedOccasions([decodedId]); // Sync URL occasion to checkboxes
                // Fetch occasion name for display
                const fetchOccasionName = async () => {
                    try {
                        const response = await userApi.getOccasions();
                        if (response.data?.data) {
                            const occasion = response.data.data.find(
                                (occ: any) => occ.id === occasionIdParam
                            );
                            if (occasion) {
                                setOccasionName(occasion.name);
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching occasion name:', err);
                    }
                };
                fetchOccasionName();
            }

            if (occasionNameParamValue) {
                const decodedName = decodeURIComponent(occasionNameParamValue);
                setOccasionNameParam(decodedName);
                if (!occasionIdParam) {
                    setOccasionName(decodedName);
                }
            }

            if (cuisineTypeIdParam) {
                setCuisineTypeId(decodeURIComponent(cuisineTypeIdParam));
                // Fetch cuisine type name for display
                const fetchCuisineTypeName = async () => {
                    try {
                        const response = await userApi.getCuisineTypes();
                        if (response.data) {
                            const cuisineTypes = Array.isArray(response.data)
                                ? response.data
                                : (response.data as any).data || [];
                            const cuisine = cuisineTypes.find(
                                (ct: any) => ct.id === cuisineTypeIdParam
                            );
                            if (cuisine) {
                                setCuisineTypeName(cuisine.name);
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching cuisine type name:', err);
                    }
                };
                fetchCuisineTypeName();
            }
        }
    }, []);

    // Fetch occasions for filter
    useEffect(() => {
        const fetchOccasions = async () => {
            try {
                const response = await userApi.getOccasions();
                if (response.data?.data) {
                    setOccasions(response.data.data.map(occ => ({
                        id: occ.id,
                        name: occ.name,
                    })));
                }
            } catch (err) {
                console.error('Error fetching occasions:', err);
            }
        };
        fetchOccasions();
    }, []);

    // Check scroll position for arrows
    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    // Update scroll state when occasions change
    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [occasions]);

    // Scroll functions
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    // Build filters object for API
    const buildFilters = () => {
        const filters: Parameters<typeof userApi.getAllPackages>[0] = {};

        if (search) {
            filters.search = search;
        }

        if (location) {
            filters.location = location;
        }

        // Removed min_guests, max_guests, min_price, max_price from API filters to rely on client-side filtering

        if (menuType) {
            filters.menu_type = menuType;
        }

        // Removed occasion_id and occasion_name from API filters to rely on client-side filtering via selectedOccasions

        if (cuisineTypeId) {
            filters.cuisine_type_id = cuisineTypeId;
        }

        // Don't send occasion_ids to API - we'll filter client-side

        if (sortBy) {
            filters.sort_by = sortBy;
        }

        if (dishId) {
            filters.dish_id = dishId;
        }

        return filters;
    };

    // Fetch packages from API with filters
    useEffect(() => {
        const fetchPackages = async () => {
            setLoading(true);
            setError(null);
            try {
                const filters = buildFilters();
                const response = await userApi.getAllPackages(filters);
                if (response.data?.data) {
                    // Store raw API data
                    setApiPackagesData(response.data.data);

                    // Map API response to component structure
                    const mappedPackages: PackageViewModel[] = response.data.data
                        .filter((pkg: ApiPackage) => pkg.caterer?.id) // Only include packages with valid caterer ID
                        .map((pkg: ApiPackage) => ({
                            id: pkg.id,
                            title: pkg.name,
                            description: pkg.description,
                            caterer: pkg.caterer?.name || 'Unknown Caterer',
                            catererId: pkg.caterer?.id,
                            catererSlug: (pkg.caterer as any)?.slug,
                            price: Number(pkg.total_price),
                            rating: pkg.rating || undefined,
                            image: pkg.cover_image_url || '/logo2.svg',
                            customizable: pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE',
                            discount: undefined, // Can be added if discount logic exists
                            eventType: pkg.occasions?.[0]?.occasion?.name || 'All',
                            occasionIds: pkg.occasions?.map(occ => occ.occasion.id).filter(Boolean) || [],
                            minimumPeople: pkg.minimum_people || pkg.people_count || 1,
                        }));
                    setAllPackages(mappedPackages); // Store all packages
                    // Don't setPackages here directly, let the filtering useEffect handle it
                }
            } catch (err: any) {
                console.error('Error fetching packages:', err);
                setError(err.message || 'Failed to fetch packages');
                setPackages([]);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            fetchPackages();
        }, search ? 500 : 0);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, location, menuType, sortBy, occasionId, occasionNameParam, cuisineTypeId, dishId]); // Removed selectedOccasions, minGuests, maxGuests, minPrice, maxPrice

    // Client-side filtering
    useEffect(() => {
        let filtered = allPackages;

        // Occasions
        if (selectedOccasions.length > 0) {
            filtered = filtered.filter(pkg => {
                const pkgOccasionIds = pkg.occasionIds || [];
                return selectedOccasions.some(selectedId => pkgOccasionIds.includes(selectedId));
            });
        }

        // Guests
        if (minGuests !== '') {
            filtered = filtered.filter(pkg => pkg.minimumPeople >= Number(minGuests));
        }
        if (maxGuests !== '') {
            filtered = filtered.filter(pkg => pkg.minimumPeople <= Number(maxGuests));
        }

        // Price
        if (minPrice !== '') {
            filtered = filtered.filter(pkg => pkg.price >= Number(minPrice));
        }
        if (maxPrice !== 50000) { // Using 50000 as "unlimited" or max
            filtered = filtered.filter(pkg => pkg.price <= Number(maxPrice));
        }

        setPackages(filtered);
    }, [selectedOccasions, allPackages, minGuests, maxGuests, minPrice, maxPrice]);

    const handleClearFilters = () => {
        setSearch('');
        setLocation('');
        setMinGuests('');
        setMaxGuests('');
        setMinPrice('');
        setMaxPrice(50000);
        setMenuType('');
        setSortBy('created_desc');
        setOccasionId('');
        setOccasionName('');
        setCuisineTypeName('');
        setSelectedOccasions([]);
        setDishId('');
        setDishName('');
        // Clear URL parameters
        if (occasionId || occasionNameParam || cuisineTypeId || dishId) {
            window.history.replaceState({}, '', '/packages');
        }
    };

    return (
        <section className="bg-[#FAFAFA] min-h-screen">
            <div className="max-w-[1400px] mx-auto px-6 mt-8 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    aria-label="Go back"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <h1 className='text-2xl md:text-3xl font-semibold'>Browse from Packages</h1>
            </div>

            {/* Occasion Filters */}
            {occasions.length > 0 && (
                <div className="max-w-[1400px] mx-auto px-6 mt-6">
                    <div className="relative flex items-center gap-2">
                        {/* Left Arrow */}
                        {canScrollLeft && (
                            <button
                                onClick={scrollLeft}
                                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={18} className="text-gray-600" />
                            </button>
                        )}

                        {/* Scrollable Container */}
                        <div
                            ref={scrollContainerRef}
                            onScroll={checkScroll}
                            className="flex gap-3 overflow-x-auto no-scrollbar flex-1"
                        >
                            {occasions.map((occasion) => (
                                <label
                                    key={occasion.id}
                                    className="cursor-pointer flex-shrink-0"
                                >
                                    <input
                                        type="radio"
                                        name="occasion"
                                        checked={selectedOccasions.includes(occasion.id)}
                                        onChange={() => {
                                            if (selectedOccasions.includes(occasion.id)) {
                                                // Deselect if already selected
                                                setSelectedOccasions([]);
                                                // Also clear URL params if present
                                                if (occasionId || occasionNameParam) {
                                                    setOccasionId('');
                                                    setOccasionName('');
                                                    setOccasionNameParam('');
                                                    const params = new URLSearchParams(window.location.search);
                                                    params.delete('occasion_id');
                                                    params.delete('occasion_name');
                                                    const newUrl = params.toString()
                                                        ? `/packages?${params.toString()}`
                                                        : '/packages';
                                                    window.history.replaceState({}, '', newUrl);
                                                }
                                            } else {
                                                // Select this occasion only
                                                setSelectedOccasions([occasion.id]);
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <span className="inline-block px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 transition-all peer-checked:bg-[#268700] peer-checked:text-white peer-checked:border-[#268700] hover:border-gray-300 whitespace-nowrap">
                                        {occasion.name}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Right Arrow */}
                        {canScrollRight && (
                            <button
                                onClick={scrollRight}
                                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={18} className="text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Dropdowns */}
            <div className="max-w-7xl mx-auto px-6 mt-6">
                <div className="flex items-center justify-start gap-3 flex-wrap">
                    {/* Location Dropdown */}
                    <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none pr-10 bg-no-repeat bg-right"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 1rem center',
                            backgroundSize: '16px'
                        }}
                    >
                        <option value="">Location</option>
                        {UAE_EMIRATES.map((emirate) => (
                            <option key={emirate} value={emirate}>
                                {emirate}
                            </option>
                        ))}
                    </select>

                    {/* Menu Type Dropdown */}
                    <select
                        value={menuType}
                        onChange={(e) => setMenuType(e.target.value as 'fixed' | 'customizable' | '')}
                        className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none pr-10 bg-no-repeat bg-right"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 1rem center',
                            backgroundSize: '16px'
                        }}
                    >
                        <option value="">Menu Type</option>
                        <option value="fixed">Fixed</option>
                        <option value="customizable">Customizable</option>
                    </select>

                    {/* Guests Dropdown */}
                    <select
                        value={minGuests || ''}
                        onChange={(e) => setMinGuests(e.target.value ? Number(e.target.value) : '')}
                        className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none pr-10 bg-no-repeat bg-right"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 1rem center',
                            backgroundSize: '16px'
                        }}
                    >
                        <option value="">Min Guests</option>
                        {[10, 20, 30, 50, 75, 100, 150, 200, 300, 500].map((num) => (
                            <option key={num} value={num}>
                                {num}+
                            </option>
                        ))}
                    </select>

                    {/* Max Price Dropdown */}
                    <select
                        value={maxPrice === 50000 ? '' : maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : 50000)}
                        className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none pr-10 bg-no-repeat bg-right"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 1rem center',
                            backgroundSize: '16px'
                        }}
                    >
                        <option value="">Budget</option>
                        <option value="5000">Under AED 5,000</option>
                        <option value="10000">Under AED 10,000</option>
                        <option value="15000">Under AED 15,000</option>
                        <option value="20000">Under AED 20,000</option>
                        <option value="30000">Under AED 30,000</option>
                        <option value="50000">Under AED 50,000</option>
                    </select>

                    {/* Clear Filters Button */}
                    {(location || menuType || minGuests || maxPrice !== 50000 || selectedOccasions.length > 0) && (
                        <button
                            onClick={handleClearFilters}
                            className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-10">

                {/* RIGHT CONTENT */}
                <div>
                    {/* Active Filter Indicators */}
                    {(occasionName && selectedOccasions.length === 1 && occasionId && selectedOccasions[0] === occasionId || cuisineTypeName || dishName) && (
                        <div className="mb-4 space-y-2">
                            {occasionName && selectedOccasions.length === 1 && occasionId && selectedOccasions[0] === occasionId && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-green-700 font-medium">
                                            Filtered by Occasion: <strong>{occasionName}</strong>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setOccasionId('');
                                            setOccasionName('');
                                            setOccasionNameParam('');
                                            setSelectedOccasions([]);
                                            const params = new URLSearchParams(window.location.search);
                                            params.delete('occasion_id');
                                            params.delete('occasion_name');
                                            const newUrl = params.toString()
                                                ? `/packages?${params.toString()}`
                                                : '/packages';
                                            window.history.replaceState({}, '', newUrl);
                                        }}
                                        className="text-sm text-green-700 hover:text-green-900 underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                            {cuisineTypeName && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-green-700 font-medium">
                                            Filtered by Cuisine: <strong>{cuisineTypeName}</strong>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCuisineTypeId('');
                                            setCuisineTypeName('');
                                            const params = new URLSearchParams(window.location.search);
                                            params.delete('cuisine_type_id');
                                            const newUrl = params.toString()
                                                ? `/packages?${params.toString()}`
                                                : '/packages';
                                            window.history.replaceState({}, '', newUrl);
                                        }}
                                        className="text-sm text-green-700 hover:text-green-900 underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                            {dishName && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-green-700 font-medium">
                                            Packages including: <strong>{dishName}</strong>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDishId('');
                                            setDishName('');
                                            const params = new URLSearchParams(window.location.search);
                                            params.delete('dish_id');
                                            const newUrl = params.toString()
                                                ? `/packages?${params.toString()}`
                                                : '/packages';
                                            window.history.replaceState({}, '', newUrl);
                                        }}
                                        className="text-sm text-green-700 hover:text-green-900 underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search Bar and Sort */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search for a Package, Food Item"
                            className="w-full sm:flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2"
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'created_desc' | 'price_asc' | 'price_desc' | 'rating_desc')}
                            className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2"
                        >
                            <option value="created_desc">Newest First</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="rating_desc">Highest Rated</option>
                        </select>
                    </div>

                    {/* Packages Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#268700]"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    ) : packages.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded text-center">
                            <p>No packages found matching your filters.</p>
                            <p className="text-sm mt-2">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-gray-600">
                                Showing {packages.length} package{packages.length !== 1 ? 's' : ''}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {packages.map((pkg) => {
                                    const apiPkg = apiPackagesData.find((p: any) => p.id === pkg.id);
                                    const minimumPeople = apiPkg?.minimum_people || apiPkg?.people_count || 1;

                                    return (
                                        <Link
                                            key={pkg.id}
                                            href={`/caterers/${pkg.catererSlug || pkg.catererId}?packageId=${pkg.id}`}
                                            className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gray-300 flex flex-col h-full"
                                        >
                                            {/* Image Section */}
                                            <div className="relative h-40 bg-gray-100 overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={pkg.image}
                                                    alt={pkg.title}
                                                    fill
                                                    className={pkg.image === '/logo2.svg' || pkg.image.includes('logo2.svg') ? "object-contain p-8" : "object-cover group-hover:scale-105 transition-transform duration-300"}
                                                />

                                                {/* Rating Badge */}
                                                {pkg.rating && (
                                                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                                        <span>⭐</span>
                                                        <span>{Number(pkg.rating).toFixed(1)}</span>
                                                    </div>
                                                )}

                                                {/* Customizable Badge */}
                                                {pkg.customizable && (
                                                    <div className="absolute top-2 left-2 bg-[#268700] text-white text-xs font-medium px-2 py-1 rounded-full">
                                                        Customisable
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Section */}
                                            <div className="p-4 flex flex-col flex-grow">
                                                <h3 className="font-semibold text-base text-gray-900 mb-1.5 group-hover:text-[#268700] transition-colors line-clamp-2">
                                                    {pkg.title}
                                                </h3>

                                                {/* Package Description */}
                                                {pkg.description && (
                                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                        {pkg.description}
                                                    </p>
                                                )}

                                                {/* Caterer Name & Min People */}
                                                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[20px]">
                                                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {pkg.caterer}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        Min. {minimumPeople}
                                                    </span>
                                                </div>

                                                {/* Price and CTA - Pushed to bottom */}
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            AED {typeof pkg.price === 'number' ? pkg.price.toLocaleString() : parseInt(String(pkg.price || '0'), 10).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-[#268700] font-medium text-xs group-hover:translate-x-1 transition-transform whitespace-nowrap">
                                                        View →
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
