'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api/user.api';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, ShoppingBag, Users, ChevronRight, Lock, Minus, Plus } from 'lucide-react';
import { Toast, useToast } from '@/components/ui/Toast';

interface CartItem {
  id: string;
  package: {
    id: string;
    name: string;
    people_count: number;
    minimum_people?: number;
    total_price: number;
    price_per_person: number;
    currency: string;
    cover_image_url?: string | null;
    customisation_type?: 'FIXED' | 'CUSTOMISABLE';
    caterer: {
      id: string;
      business_name: string | null;
      name?: string;
    };
  };
  guests: number | null;
  price_at_time: number | null;
  // Add-ons
  add_ons?: Array<{
    id: string;
    add_on_id: string;
    quantity: number;
    price_at_time: number | null;
    add_on: {
      id: string;
      name: string;
      description?: string | null;
      price: number;
      currency: string;
    };
  }>;
  created_at: Date | string;
  updated_at: Date | string;
}

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Track input values for each cart item's guest count
  const [guestCountInputs, setGuestCountInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading) {
      fetchCart();
    }
  }, [authLoading, user]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      if (user) {
        // Fetch from server for authenticated users
        const res = await userApi.getCartItems();
        if (res.data?.data) {
          setCartItems(res.data.data);
          // Initialize input values
          const inputs: Record<string, string> = {};
          res.data.data.forEach((item: CartItem) => {
            const guests = item.guests || item.package.people_count || 1;
            inputs[item.id] = String(guests);
          });
          setGuestCountInputs(inputs);
        } else if (res.error && res.status !== 401) {
          showToast('error', 'Failed to load cart');
        }
      } else {
        // Load from localStorage for non-authenticated users
        const { cartStorage } = await import('@/lib/utils/cartStorage');
        const localItems = cartStorage.getItems();
        setCartItems(localItems as any);
        // Initialize input values
        const inputs: Record<string, string> = {};
        localItems.forEach((item: any) => {
          const guests = item.guests || item.package.people_count || 1;
          inputs[item.id] = String(guests);
        });
        setGuestCountInputs(inputs);
      }
    } catch (err) {
      // Silently handle errors for non-authenticated users
      if (user) {
        showToast('error', 'Failed to load cart');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      if (user) {
        // Delete from server for authenticated users
        const res = await userApi.deleteCartItem(itemId);
        if (res.error) {
          showToast('error', res.error);
          return;
        }
      } else {
        // Delete from localStorage for non-authenticated users
        const { cartStorage } = await import('@/lib/utils/cartStorage');
        cartStorage.removeItem(itemId);
      }
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      showToast('success', 'Item removed from cart');
      // Dispatch event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      showToast('error', 'Failed to remove item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateGuests = async (itemId: string, newGuests: number) => {
    if (newGuests < 1) return;

    // Update input state immediately
    setGuestCountInputs(prev => ({ ...prev, [itemId]: String(newGuests) }));

    setUpdatingId(itemId);
    try {
      const item = cartItems.find(i => i.id === itemId);
      if (!item) return;

      if (user) {
        // Update on server for authenticated users - let backend recalculate price based on serves_people
        const res = await userApi.updateCartItem(itemId, {
          guests: newGuests,
          // Don't send price_at_time - let backend recalculate based on serves_people
        });
        if (res.error) {
          showToast('error', res.error);
          return;
        }
        
        // Update cart items from response
        if (res.data?.data) {
          const updatedItem = res.data.data;
          setCartItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, guests: updatedItem.guests, price_at_time: updatedItem.price_at_time }
                : item
            )
          );
        }
      } else {
        // For non-authenticated users, we need to calculate locally
        // But we don't have package items with serves_people, so use simple calculation
        // This is a limitation - non-authenticated users won't get serves_people calculation
        const pricePerPerson = item.package.price_per_person ||
          (item.package.total_price / (item.package.people_count || 1));
        const packagePrice = Math.round(pricePerPerson * newGuests);

        // Add add-ons prices (add-ons are fixed price, not multiplied by guest count)
        const addOnsPrice = item.add_ons && item.add_ons.length > 0
          ? item.add_ons.reduce((sum, addOn) => sum + (addOn.add_on.price * addOn.quantity), 0)
          : 0;

        const newPrice = packagePrice + addOnsPrice;

        // Update in localStorage for non-authenticated users
        const { cartStorage } = await import('@/lib/utils/cartStorage');
        cartStorage.updateGuestCount(itemId, newGuests, newPrice);

        setCartItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, guests: newGuests, price_at_time: newPrice }
              : item
          )
        );
      }
    } catch (err) {
      showToast('error', 'Failed to update guests');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      // Sync localStorage cart to server after login
      showToast('error', 'Please log in to proceed to checkout');
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }

    if (cartItems.length === 0) {
      showToast('error', 'Your cart is empty');
      return;
    }

    router.push('/checkout');
  };

  // Calculate price for an item
  // Use price_at_time from backend (which is calculated with serves_people) if available
  const calculateItemPrice = (item: CartItem) => {
    // Use price_at_time if available (calculated by backend with serves_people)
    let packagePrice = 0;
    if (item.price_at_time) {
      packagePrice = item.price_at_time;
    } else {
      // Fallback to simple calculation if price_at_time not available
      const guests = item.guests || item.package.people_count || 1;
      
      // For FIXED packages, scale linearly
      if ((item.package as any).customisation_type === 'FIXED') {
        const minPeople = (item.package as any).minimum_people || item.package.people_count || 1;
        const basePrice = item.package.total_price;
        packagePrice = Math.round((basePrice / minPeople) * guests);
      } else {
        // For CUSTOMISABLE packages
        const pricePerPerson = item.package.price_per_person ||
          (item.package.total_price / (item.package.people_count || 1));
        packagePrice = Math.round(pricePerPerson * guests);
      }
    }

    // Add add-ons prices (add-ons are fixed price, not multiplied by guest count)
    const addOnsPrice = item.add_ons && item.add_ons.length > 0
      ? item.add_ons.reduce((sum, addOn) => sum + (addOn.add_on.price * addOn.quantity), 0)
      : 0;

    return packagePrice + addOnsPrice;
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  }, [cartItems]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cartItems.length === 0
              ? 'Your cart is empty'
              : `${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'} in your cart`}
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {user
                ? 'Browse our caterers and packages to get started'
                : 'Log in to see your saved items, or browse our caterers to add items to your cart'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!user && (
                <Link
                  href={`/login?redirect=${encodeURIComponent('/cart')}`}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  <Lock className="w-4 h-4" />
                  Log In to View Cart
                </Link>
              )}
              <Link
                href="/caterers"
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Browse Caterers
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const guests = item.guests || item.package.people_count || 1;
                const pricePerPerson = item.package.price_per_person ||
                  (item.package.total_price / (item.package.people_count || 1));
                const totalPrice = calculateItemPrice(item);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="relative w-full sm:w-40 h-40 sm:h-auto shrink-0 bg-gray-50">
                        <Image
                          src={item.package.cover_image_url || '/logo2.svg'}
                          alt={item.package.name}
                          fill
                          className={item.package.cover_image_url === '/logo2.svg' || (item.package.cover_image_url && item.package.cover_image_url.includes('logo2.svg')) ? "object-contain p-2" : "object-cover"}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 sm:p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {item.package.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {item.package.caterer?.business_name || item.package.caterer?.name || 'Caterer'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Remove"
                          >
                            {deletingId === item.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {/* Guest Count Adjuster */}
                        <div className="flex items-center gap-3 mb-4">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Guests:</span>
                          <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                              onClick={() => handleUpdateGuests(item.id, Math.max(1, guests - 1))}
                              disabled={updatingId === item.id || guests <= 1}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={guestCountInputs[item.id] ?? String(guests)}
                              onChange={(e) => {
                                // Allow user to type freely - store as string
                                setGuestCountInputs(prev => ({ ...prev, [item.id]: e.target.value }));
                              }}
                              onBlur={(e) => {
                                const inputValue = e.target.value.trim();
                                const numValue = Number(inputValue);

                                // Validate and update on blur
                                if (inputValue === '' || isNaN(numValue) || numValue < 1) {
                                  // Reset to current guests value
                                  setGuestCountInputs(prev => ({ ...prev, [item.id]: String(guests) }));
                                  return;
                                }

                                // Update guests if valid
                                handleUpdateGuests(item.id, numValue);
                              }}
                              onKeyDown={(e) => {
                                // Handle Enter key to validate and blur
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-16 text-center py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent"
                              min={1}
                            />
                            <button
                              onClick={() => handleUpdateGuests(item.id, guests + 1)}
                              disabled={updatingId === item.id}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          {updatingId === item.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          )}
                        </div>

                        {/* Add-ons display */}
                        {item.add_ons && item.add_ons.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 mb-2">Add-ons:</p>
                            <div className="space-y-2">
                              {item.add_ons.map((cartAddOn) => (
                                <div key={cartAddOn.id} className="flex items-start justify-between text-xs">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 text-gray-900">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5"></div>
                                      <span className="font-medium">{cartAddOn.add_on.name}</span>
                                    </div>
                                    {cartAddOn.add_on.description && (
                                      <p className="text-gray-600 text-xs mt-0.5 ml-4">{cartAddOn.add_on.description}</p>
                                    )}
                                  </div>
                                  <span className="text-gray-900 font-medium ml-2">
                                    {cartAddOn.add_on.currency} {cartAddOn.add_on.price.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Price */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <span className="text-sm text-gray-500">
                            AED {pricePerPerson.toLocaleString()}/person
                          </span>
                          <span className="font-bold text-green-600">
                            AED {totalPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
                <h2 className="font-semibold text-lg text-gray-900 mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                    </span>
                    <span className="font-medium">AED {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-gray-500">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="text-gray-500">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Subtotal</span>
                    <span className="text-xl font-bold text-green-600">
                      AED {subtotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                  className={`w-full py-3 rounded-lg font-medium transition mb-3 ${cartItems.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  Proceed to Checkout
                </button>

                <Link
                  href="/caterers"
                  className="block w-full text-center py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Continue Shopping
                </Link>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Event details and delivery address will be collected at checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={hideToast} />
      )}
    </section>
  );
}
