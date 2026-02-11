'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { userApi, type Caterer, type Occasion, type FilterCaterersParams } from '@/lib/api/user.api';
import { Calendar, X, Filter, ChevronDown, Check, ChevronUp } from 'lucide-react';

export default function BrowseCaterersContent() {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState('');

    // Dropdown Data States
    const [occasions, setOccasions] = useState<Occasion[]>([]);
    const [menuTypeOptions, setMenuTypeOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [dietaryOptions, setDietaryOptions] = useState<Array<{ id: string; name: string }>>([]);

    // Filter States
    const [selectedEventType, setSelectedEventType] = useState('All events');
    const [eventDate, setEventDate] = useState('');
    const [guestMin, setGuestMin] = useState<string>('');
    const [guestMax, setGuestMax] = useState<string>('');
    const [budgetMin, setBudgetMin] = useState<string>('');
    const [budgetMax, setBudgetMax] = useState<string>('');

    // Dynamic Checkbox States (store IDs as keys with boolean values)
    const [selectedMenuTypes, setSelectedMenuTypes] = useState<Record<string, boolean>>({});
    const [selectedDietaryNeeds, setSelectedDietaryNeeds] = useState<Record<string, boolean>>({});
    const [showFilters, setShowFilters] = useState<string | false>(false);

    const [filteredCaterers, setFilteredCaterers] = useState<Caterer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);

    // Helper function to get initials from name
    const getInitials = (name: string) => {
        const words = name.split(' ').filter(word => word.length > 0);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Fetch initial data (metadata only, caterers will be fetched via filters)
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [occasionsRes, packageTypesRes, dietaryRes] = await Promise.all([
                    userApi.getOccasions(),
                    userApi.getPackageTypes(),
                    userApi.getDietaryNeeds(),
                ]);

                // Handle occasions response
                if (occasionsRes.error) {
                    console.error('Error fetching occasions:', occasionsRes.error);
                } else if (occasionsRes.data) {
                    // Response structure: { data: { success: true, data: [...] } }
                    const occasionsData = occasionsRes.data.data || occasionsRes.data;
                    setOccasions(Array.isArray(occasionsData) ? occasionsData : []);

                    // Check if occasion_id is in URL params and set it
                    const occasionIdFromUrl = searchParams.get('occasion_id');
                    if (occasionIdFromUrl && Array.isArray(occasionsData)) {
                        // Verify the occasion exists in the list
                        const occasionExists = occasionsData.find((occ: Occasion) => occ.id === occasionIdFromUrl);
                        if (occasionExists) {
                            setSelectedEventType(occasionIdFromUrl);
                        }
                    }
                }

                // Handle package types response
                if (packageTypesRes.error) {
                    console.error('Error fetching package types:', packageTypesRes.error);
                } else if (packageTypesRes.data) {
                    // Response structure: { data: { success: true, data: [...] } }
                    const packageTypesData = packageTypesRes.data.data || packageTypesRes.data;
                    setMenuTypeOptions(Array.isArray(packageTypesData) ? packageTypesData : []);
                }

                // Handle dietary needs response
                if (dietaryRes.error) {
                    console.error('Error fetching dietary needs:', dietaryRes.error);
                } else if (dietaryRes.data) {
                    // Response structure: { data: { success: true, data: [...] } }
                    const dietaryData = dietaryRes.data.data || dietaryRes.data;
                    setDietaryOptions(Array.isArray(dietaryData) ? dietaryData : []);
                }

                // Note: Initial caterer fetch is handled by the filter useEffect
                // which will trigger after selectedEventType is set from URL params
                setInitialDataLoaded(true);

            } catch (err) {
                console.error("Error fetching data:", err);
                setError('Failed to fetch data');
                setInitialDataLoaded(true); // Still mark as loaded even on error
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [searchParams]);

    // Filter Caterers Logic - Now using server-side filtering
    const fetchAndFilterCaterers = async () => {
        setLoading(true);
        setError(null);
        try {
            // Build menu type filter object
            const activeMenuTypeIds = Object.entries(selectedMenuTypes)
                .filter(([_, isSelected]) => isSelected)
                .map(([id]) => id);

            const menuTypeFilter: { fixed?: boolean; customizable?: boolean; liveStations?: boolean } = {};
            if (activeMenuTypeIds.length > 0) {
                activeMenuTypeIds.forEach(id => {
                    if (id === 'fixed') menuTypeFilter.fixed = true;
                    if (id === 'customizable') menuTypeFilter.customizable = true;
                    if (id === 'liveStations') menuTypeFilter.liveStations = true;
                });
            }

            // Build dietary needs array
            const activeDietaryIds = Object.entries(selectedDietaryNeeds)
                .filter(([_, isSelected]) => isSelected)
                .map(([id]) => id);

            // Parse guest count min/max
            const gMin = guestMin && guestMin.trim() !== '' ? parseInt(guestMin) : undefined;
            const gMax = guestMax && guestMax.trim() !== '' ? parseInt(guestMax) : undefined;

            // Parse budget min/max
            const bMin = budgetMin && budgetMin.trim() !== '' ? parseInt(budgetMin) : undefined;
            const bMax = budgetMax && budgetMax.trim() !== '' ? parseInt(budgetMax) : undefined;

            // Build filter params for API
            const filterParams: FilterCaterersParams = {
                search: search || undefined,
                minGuests: gMin !== undefined && !isNaN(gMin) ? gMin : undefined,
                maxGuests: gMax !== undefined && !isNaN(gMax) ? gMax : undefined,
                date: eventDate || undefined,
                minBudget: bMin !== undefined && !isNaN(bMin) ? bMin : undefined,
                maxBudget: bMax !== undefined && !isNaN(bMax) ? bMax : undefined,
                occasionId: selectedEventType && selectedEventType !== 'All events' ? selectedEventType : undefined,
                menuType: Object.keys(menuTypeFilter).length > 0 ? menuTypeFilter : undefined,
                dietaryNeeds: activeDietaryIds.length > 0 ? activeDietaryIds : undefined,
            };

            // Remove undefined values
            (Object.keys(filterParams) as Array<keyof FilterCaterersParams>).forEach(key => {
                if (filterParams[key] === undefined) {
                    delete filterParams[key];
                }
            });

            // Call API with filters
            const response = await userApi.filterCaterers(filterParams);

            if (response.error) {
                setError(response.error);
                setFilteredCaterers([]);
            } else if (response.data?.data) {
                setFilteredCaterers(response.data.data);
            } else {
                setFilteredCaterers([]);
            }
        } catch (err) {
            console.error(err);
            setError('Error filtering caterers');
            setFilteredCaterers([]);
        } finally {
            setLoading(false);
        }
    };

    // Trigger filters when any filter changes (debounced for search)
    useEffect(() => {
        // Only fetch after initial data is loaded
        if (!initialDataLoaded) return;

        const timeoutId = setTimeout(() => {
            fetchAndFilterCaterers();
        }, search ? 500 : 0); // Debounce search by 500ms

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, guestMin, guestMax, budgetMin, budgetMax, selectedEventType, eventDate, selectedMenuTypes, selectedDietaryNeeds, initialDataLoaded]);

    const handleApplyFilters = () => {
        fetchAndFilterCaterers();
    };

    const clearFilters = () => {
        setSelectedEventType('All events');
        setEventDate('');
        setGuestMin('');
        setGuestMax('');
        setBudgetMin('');
        setBudgetMax('');
        setSelectedMenuTypes({});
        setSelectedDietaryNeeds({});
        setSearch('');
        // Filters will be applied automatically via useEffect
    };

    const toggleMenuType = (id: string) => {
        setSelectedMenuTypes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleDietaryNeed = (id: string) => {
        setSelectedDietaryNeeds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <section className="bg-[#FAFAFA] min-h-screen">
            <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-12">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6 md:mb-10">Browse Caterers</h1>

                {/* Filter Dropdowns */}
                <div className="mb-6 relative">
                    <div className="flex items-center justify-start gap-3 flex-wrap">
                        {/* Event Type Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedEventType}
                                onChange={(e) => setSelectedEventType(e.target.value)}
                                className="bg-white border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none whitespace-nowrap focus:outline-none"
                            >
                                <option value="All events">Event Type</option>
                                {occasions.map((occ) => (
                                    <option key={occ.id} value={occ.id}>{occ.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Date Picker */}
                        <div className="relative">
                            <input
                                type="date"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="bg-white border border-gray-200 rounded-full pl-4 pr-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer whitespace-nowrap focus:outline-none"
                            />
                        </div>

                        {/* Guest Count Dropdown */}
                        <div className="relative">
                            <select
                                value={guestMin || ''}
                                onChange={(e) => setGuestMin(e.target.value)}
                                className="bg-white border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none whitespace-nowrap focus:outline-none"
                            >
                                <option value="">Min Guests</option>
                                {[10, 20, 30, 50, 75, 100, 150, 200, 300, 500].map((num) => (
                                    <option key={num} value={num}>
                                        {num}+
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Budget Dropdown */}
                        <div className="relative">
                            <select
                                value={budgetMax || ''}
                                onChange={(e) => setBudgetMax(e.target.value)}
                                className="bg-white border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer appearance-none whitespace-nowrap focus:outline-none"
                            >
                                <option value="">Budget</option>
                                <option value="50">Under AED 50</option>
                                <option value="100">Under AED 100</option>
                                <option value="150">Under AED 150</option>
                                <option value="200">Under AED 200</option>
                                <option value="300">Under AED 300</option>
                                <option value="500">Under AED 500</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Menu Type Multi-Select */}
                        {menuTypeOptions.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFilters(showFilters === 'menuType' ? false : 'menuType');
                                    }}
                                    className="bg-white border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 focus:outline-none"
                                >
                                    Menu Type
                                    {Object.values(selectedMenuTypes).some(Boolean) && (
                                        <span className="bg-[#268700] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {Object.values(selectedMenuTypes).filter(Boolean).length}
                                        </span>
                                    )}
                                </button>
                                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none transition-transform ${showFilters === 'menuType' ? 'rotate-180' : ''}`} />
                                {showFilters === 'menuType' && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-[99]"
                                            onClick={() => setShowFilters(false)}
                                        />
                                        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[100] min-w-[200px] max-h-[300px] overflow-y-auto">
                                            <div className="space-y-3">
                                                {menuTypeOptions.map((item) => (
                                                    <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedMenuTypes[item.id] ? 'bg-[#268700] border-[#268700]' : 'border-gray-300 bg-white'}`}>
                                                            {selectedMenuTypes[item.id] && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedMenuTypes[item.id]}
                                                            onChange={() => toggleMenuType(item.id)}
                                                            className="hidden"
                                                        />
                                                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{item.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Dietary Needs Multi-Select */}
                        {dietaryOptions.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFilters(showFilters === 'dietary' ? false : 'dietary');
                                    }}
                                    className="bg-white border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 focus:outline-none"
                                >
                                    Dietary Needs
                                    {Object.values(selectedDietaryNeeds).some(Boolean) && (
                                        <span className="bg-[#268700] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {Object.values(selectedDietaryNeeds).filter(Boolean).length}
                                        </span>
                                    )}
                                </button>
                                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none transition-transform ${showFilters === 'dietary' ? 'rotate-180' : ''}`} />
                                {showFilters === 'dietary' && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-[99]"
                                            onClick={() => setShowFilters(false)}
                                        />
                                        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[100] min-w-[200px] max-h-[300px] overflow-y-auto">
                                            <div className="space-y-3">
                                                {dietaryOptions.map((item) => (
                                                    <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedDietaryNeeds[item.id] ? 'bg-[#268700] border-[#268700]' : 'border-gray-300 bg-white'}`}>
                                                            {selectedDietaryNeeds[item.id] && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedDietaryNeeds[item.id]}
                                                            onChange={() => toggleDietaryNeed(item.id)}
                                                            className="hidden"
                                                        />
                                                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{item.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Clear Filters Button */}
                        {(selectedEventType !== 'All events' || eventDate || guestMin || guestMax || budgetMin || budgetMax ||
                            Object.values(selectedMenuTypes).some(Boolean) || Object.values(selectedDietaryNeeds).some(Boolean)) && (
                                <button
                                    onClick={clearFilters}
                                    className="bg-white border border-gray-200 rounded-full pl-4 pr-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
                                >
                                    Clear All
                                </button>
                            )}
                    </div>
                </div>

                {/* Search and Sort */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search for a Package, Food Item"
                        className="w-full sm:flex-1 bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent"
                    />
                    <select className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent">
                        <option>Recommended</option>
                        <option>Rating</option>
                    </select>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-20">
                        <p className="text-gray-500">Loading caterers...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="text-center py-20">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Caterer Grid */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {filteredCaterers.length === 0 ? (
                            <div className="col-span-full text-center py-20">
                                <p className="text-gray-500">No caterers found matching your filters.</p>
                            </div>
                        ) : (
                            filteredCaterers.map((c) => {
                                const initials = getInitials(c.name);
                                // c.packages is now Package[], so we can access properties safely
                                const rating = c.packages?.[0]?.rating
                                    ? typeof c.packages[0].rating === 'number'
                                        ? c.packages[0].rating.toFixed(1)
                                        : parseFloat(String(c.packages[0].rating)).toFixed(1)
                                    : null;

                                return (
                                    <Link
                                        key={c.id}
                                        href={`/caterers/${c.slug || c.id}`}
                                        className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gray-300 flex flex-col h-full"
                                    >
                                        {/* Image Section */}
                                        <div className="relative h-40 bg-gray-100 overflow-hidden flex-shrink-0">
                                            {c.image_url ? (
                                                <Image
                                                    src={c.image_url}
                                                    alt={c.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                                    <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span className="text-xl font-semibold text-gray-600">{initials}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rating Badge */}
                                            {rating && (
                                                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                                    <span>⭐</span>
                                                    <span>{rating}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-4 flex flex-col flex-grow">
                                            <h3 className="font-semibold text-base text-gray-900 mb-1.5 group-hover:text-[#268700] transition-colors line-clamp-2">
                                                {c.name}
                                            </h3>

                                            {/* Cuisines */}
                                            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[20px]">
                                                {c.cuisines.slice(0, 3).map((cu) => (
                                                    <span
                                                        key={cu}
                                                        className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full"
                                                    >
                                                        {cu}
                                                    </span>
                                                ))}
                                                {c.cuisines.length > 3 && (
                                                    <span className="text-xs font-medium text-gray-500 px-2 py-0.5">
                                                        +{c.cuisines.length - 3}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Price and CTA - Pushed to bottom */}
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-0.5">Price Range</p>
                                                    <p className="text-sm font-semibold text-gray-900">{c.priceRange}</p>
                                                </div>
                                                <div className="text-[#268700] font-medium text-xs group-hover:translate-x-1 transition-transform whitespace-nowrap">
                                                    View →
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
