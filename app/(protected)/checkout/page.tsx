'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api/user.api';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Minus,
  Plus,
  Truck
} from 'lucide-react';
import { Toast, useToast } from '@/components/ui/Toast';
import { UAE_EMIRATES, getMinEventDate } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

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
  // Event details (from localStorage or server)
  event_date?: string;
  event_time?: string;
  event_type?: string;
  area?: string;
  // Server fields (legacy)
  date?: Date | string | null;
  location?: string | null;
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

interface Occasion {
  id: string;
  name: string;
}

type CheckoutStep = 'event-details' | 'review' | 'payment';

// Time slots for event
const TIME_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM',
];


export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [syncingCart, setSyncingCart] = useState(false);

  // Checkout step
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('event-details');

  // Occasions
  const [occasions, setOccasions] = useState<Occasion[]>([]);

  // Event details form
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [guestCountInput, setGuestCountInput] = useState<string>('1');

  // Delivery address form
  const [venueName, setVenueName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [area, setArea] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'pay_on_delivery'>('pay_on_delivery');

  const minDate = getMinEventDate();

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, user]);


  const fetchData = async () => {
    setLoading(true);
    try {
      // If user is authenticated, sync localStorage cart first
      if (user) {
        const { cartStorage } = await import('@/lib/utils/cartStorage');
        const localItems = cartStorage.getItems();

        // If there are items in localStorage, sync them to server
        if (localItems.length > 0) {
          setSyncingCart(true);
          try {
            await cartStorage.syncToServer();
            // Wait a bit for server to process
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (syncError) {
            console.error('Error syncing cart:', syncError);
            // Continue even if sync fails
          } finally {
            setSyncingCart(false);
          }
        }
      }

      // Fetch cart items
      if (user) {
        // For authenticated users, fetch from server
        const cartRes = await userApi.getCartItems();

        if (cartRes.data?.data) {
          setCartItems(cartRes.data.data);

          // Set initial guest count from first cart item
          if (cartRes.data.data.length > 0) {
            const firstItem = cartRes.data.data[0];
            const initialGuests = firstItem.guests || firstItem.package?.people_count || 1;
            setGuestCount(initialGuests);
            setGuestCountInput(String(initialGuests));
          }

          // Load event details immediately
          const { cartStorage } = await import('@/lib/utils/cartStorage');
          const savedEventDetails = cartStorage.getEventDetails();
          const localItems = cartStorage.getItems();
          const localItemWithDetails = localItems.find(item =>
            item.event_date || item.event_time || item.event_type || item.area
          );

          const firstItem = cartRes.data.data[0];

          // Priority: savedEventDetails > localItem > server cart item
          const eventDateValue = savedEventDetails.event_date ||
            localItemWithDetails?.event_date ||
            firstItem.event_date ||
            (firstItem.date ? new Date(firstItem.date).toISOString().split('T')[0] : '');
          if (eventDateValue) {
            setEventDate(eventDateValue);
          }

          const eventTimeValue = savedEventDetails.event_time ||
            localItemWithDetails?.event_time ||
            firstItem.event_time;
          if (eventTimeValue && eventTimeValue.trim() !== '') {
            setEventTime(eventTimeValue.trim());
          }

          const eventTypeValue = savedEventDetails.event_type ||
            localItemWithDetails?.event_type ||
            firstItem.event_type;
          if (eventTypeValue && eventTypeValue.trim() !== '') {
            setEventType(eventTypeValue.trim());
          }

          const areaValue = savedEventDetails.area ||
            localItemWithDetails?.area ||
            firstItem.area ||
            firstItem.location;
          if (areaValue && areaValue.trim() !== '') {
            setArea(areaValue.trim());
          }
        } else if (cartRes.error && cartRes.status !== 401) {
          showToast('error', cartRes.error || 'Failed to load cart');
        }
      } else {
        // For non-authenticated users, load from localStorage
        const { cartStorage } = await import('@/lib/utils/cartStorage');
        const localItems = cartStorage.getItems();
        setCartItems(localItems as any);

        // Set initial guest count and event details from first cart item
        if (localItems.length > 0) {
          const firstItem = localItems[0];
          const initialGuests = firstItem.guests || firstItem.package?.people_count || 1;
          setGuestCount(initialGuests);
          setGuestCountInput(String(initialGuests));

          // Also check saved event details storage
          const savedEventDetails = cartStorage.getEventDetails();

          // Auto-fill event details - priority: savedEventDetails > cart item
          const eventDateValue = savedEventDetails.event_date || firstItem.event_date;
          if (eventDateValue) {
            setEventDate(eventDateValue);
          }

          const eventTimeValue = savedEventDetails.event_time || firstItem.event_time;
          if (eventTimeValue && eventTimeValue.trim() !== '') {
            setEventTime(eventTimeValue.trim());
          }

          const eventTypeValue = savedEventDetails.event_type || firstItem.event_type;
          if (eventTypeValue && eventTypeValue.trim() !== '') {
            setEventType(eventTypeValue.trim());
          }

          const areaValue = savedEventDetails.area || firstItem.area;
          if (areaValue && areaValue.trim() !== '') {
            setArea(areaValue.trim());
          }
        }

        // If no items in localStorage, redirect to login
        if (localItems.length === 0) {
          router.push('/login?redirect=/checkout');
          return;
        }
      }

      // Fetch occasions
      const occasionsRes = await userApi.getOccasions();
      if (occasionsRes.data?.data) {
        setOccasions(occasionsRes.data.data);
      }
    } catch (err) {
      showToast('error', 'Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate prices based on guest count
  // In checkout, use the form's guestCount (which applies to all items)
  // This allows users to change guest count for all items at once
  // Use price_at_time from backend (calculated with serves_people) if guest count matches
  // Otherwise, we'll need to update cart items to get recalculated prices
  const calculateItemPrice = (item: CartItem) => {
    // Use price_at_time if guest count matches (calculated by backend with serves_people)
    let packagePrice = 0;
    if (item.price_at_time && item.guests === guestCount) {
      // Use price_at_time if guest count matches - this was calculated with serves_people
      packagePrice = item.price_at_time;
    } else {
      // If guest count doesn't match, we need to recalculate
      // For FIXED packages, scale linearly
      if (item.package.customisation_type === 'FIXED') {
        const minPeople = item.package.minimum_people || item.package.people_count || 1;
        const basePrice = item.package.total_price;
        packagePrice = Math.round((basePrice / minPeople) * guestCount);
      } else {
        // For CUSTOMISABLE packages with custom price or auto-calculated
        // Use simple calculation as fallback
        // The actual recalculation will happen when user proceeds to review/payment
        const pricePerPerson = item.package.price_per_person ||
          (item.package.total_price / (item.package.people_count || 1));
        packagePrice = Math.round(pricePerPerson * guestCount);
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
  }, [cartItems, guestCount]);

  const total = subtotal;

  // Validation
  const isEventDetailsValid = eventDate && eventTime && eventType && guestCount > 0 && streetAddress && area;
  const isPaymentValid = paymentMethod === 'pay_on_delivery';

  const handleContinueToReview = async () => {
    if (!isEventDetailsValid) {
      showToast('error', 'Please fill in all required fields');
      return;
    }
    
    // Update cart items with new guest count and let backend recalculate prices with serves_people
    setSyncingCart(true);
    try {
      // Update all cart items with new guest count (don't send price_at_time so backend recalculates)
      const updatePromises = cartItems.map(item => {
        if (item.guests !== guestCount) {
          return userApi.updateCartItem(item.id, {
            guests: guestCount,
            // Don't send price_at_time - let backend recalculate with serves_people
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      
      // Refetch cart items to get updated prices from backend
      const updatedCartRes = await userApi.getCartItems();
      if (updatedCartRes.data?.data) {
        setCartItems(updatedCartRes.data.data);
      }
    } catch (err) {
      console.error('Failed to update cart items:', err);
      showToast('error', 'Failed to update prices. Please try again.');
      return;
    } finally {
      setSyncingCart(false);
    }
    
    setCurrentStep('review');
  };

  const handleContinueToPayment = () => {
    setCurrentStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      showToast('error', 'Your cart is empty');
      return;
    }

    if (!isPaymentValid) {
      showToast('error', 'Please select a payment method');
      return;
    }

    setPlacingOrder(true);
    try {
      // Update cart items with new guest count before placing order
      // Let backend recalculate prices with serves_people - don't send price_at_time
      const updatePromises = cartItems.map(item => {
        if (item.guests !== guestCount) {
          return userApi.updateCartItem(item.id, {
            guests: guestCount,
            // Don't send price_at_time - let backend recalculate with serves_people
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      
      // Refetch cart items to get updated prices from backend
      const updatedCartRes = await userApi.getCartItems();
      if (updatedCartRes.data?.data) {
        setCartItems(updatedCartRes.data.data);
      }

      const res = await userApi.createOrder({
        cart_item_ids: cartItems.map((item) => item.id),
        items: [],
      });

      if (res.error) {
        showToast('error', res.error);
        return;
      }

      if (res.data?.success) {
        setOrderPlaced(true);
        showToast('success', 'Order placed successfully!');
        setTimeout(() => {
          router.push('/orders');
        }, 2000);
      }
    } catch (err) {
      showToast('error', 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };


  if (loading || syncingCart || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">
            {syncingCart ? 'Syncing your cart...' : authLoading ? 'Loading...' : 'Loading checkout...'}
          </p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Order Placed Successfully!
          </h2>
          <p className="text-gray-500 mb-6">
            Your order has been confirmed. Redirecting to orders page...
          </p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Add items to your cart before checkout
          </p>
          <button
            onClick={() => router.push('/cart')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Go to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'event-details'
                ? 'bg-green-600 text-white'
                : 'bg-green-600 text-white'
                }`}>
                1
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === 'event-details' ? 'text-green-600' : 'text-gray-900'
                }`}>
                Event Details
              </span>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 mx-4" />

            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'review'
                ? 'bg-green-600 text-white'
                : currentStep === 'payment'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}>
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === 'review' ? 'text-green-600' : 'text-gray-500'
                }`}>
                Review Order
              </span>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 mx-4" />

            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'payment'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
                }`}>
                3
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === 'payment' ? 'text-green-600' : 'text-gray-500'
                }`}>
                Payment
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Event Details */}
            {currentStep === 'event-details' && (
              <>
                {/* Event Details Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-lg text-gray-900">Event Details</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* Event Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          min={minDate}
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Select date"
                        />
                      </div>
                    </div>

                    {/* Event Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Time <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                        >
                          <option value="">Select time</option>
                          {TIME_SLOTS.map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Event Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select event type</option>
                      {occasions.map((occasion) => (
                        <option key={occasion.id} value={occasion.id}>{occasion.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Guests */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Number of Guests <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-lg w-fit">
                      <button
                        onClick={() => {
                          const newCount = Math.max(1, guestCount - 1);
                          setGuestCount(newCount);
                          setGuestCountInput(String(newCount));
                        }}
                        className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition"
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
                            setGuestCount(1);
                            setGuestCountInput('1');
                            return;
                          }

                          // Clamp to minimum of 1
                          const clampedValue = Math.max(1, numValue);
                          setGuestCount(clampedValue);
                          setGuestCountInput(String(clampedValue));
                        }}
                        onKeyDown={(e) => {
                          // Handle Enter key to validate and blur
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-24 text-center py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#268700] focus:border-transparent"
                        min={1}
                      />
                      <button
                        onClick={() => {
                          const newCount = guestCount + 1;
                          setGuestCount(newCount);
                          setGuestCountInput(String(newCount));
                        }}
                        className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-lg text-gray-900">Delivery Address</h2>
                  </div>

                  {/* Venue Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Name
                    </label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="Venue Name"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Street Address */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Street Address *"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Area */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Area</option>
                      {UAE_EMIRATES.map((emirate) => (
                        <option key={emirate} value={emirate}>{emirate}</option>
                      ))}
                    </select>
                  </div>

                  {/* Special Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Special Instructions..."
                      rows={3}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleContinueToReview}
                  disabled={!isEventDetailsValid}
                  className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${isEventDetailsValid
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Continue to Review
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Step 2: Review Order */}
            {currentStep === 'review' && (
              <>
                {/* Order Items */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FileText className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-lg text-gray-900">Order Items</h2>
                  </div>

                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                      >
                        <div className="flex gap-4">
                          <div className="relative w-20 h-20 shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                            <Image
                              src={item.package.cover_image_url || '/logo2.svg'}
                              alt={item.package.name}
                              fill
                              className={item.package.cover_image_url === '/logo2.svg' || (item.package.cover_image_url && item.package.cover_image_url.includes('logo2.svg')) ? "object-contain p-1" : "object-cover"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {item.package.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {item.package.caterer?.business_name || item.package.caterer?.name || 'Caterer'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                              <Users className="w-3 h-3" />
                              <span>{guestCount} guests</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-green-600">
                              AED {calculateItemPrice(item).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {/* Add-ons display */}
                        {item.add_ons && item.add_ons.length > 0 && (
                          <div className="mt-3 ml-24 space-y-2">
                            {item.add_ons.map((cartAddOn) => (
                              <div key={cartAddOn.id} className="flex items-start justify-between text-sm">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-gray-900">
                                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5" />
                                    <span className="font-medium">{cartAddOn.add_on.name}</span>
                                  </div>
                                  {cartAddOn.add_on.description && (
                                    <p className="text-gray-600 text-xs mt-1 ml-5">{cartAddOn.add_on.description}</p>
                                  )}
                                </div>
                                <span className="text-gray-900 font-medium ml-2">
                                  {cartAddOn.add_on.currency} {cartAddOn.add_on.price.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Summary */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-lg text-gray-900">Event Summary</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium text-gray-900">{eventDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Time</p>
                      <p className="font-medium text-gray-900">{eventTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Event Type</p>
                      <p className="font-medium text-gray-900">
                        {occasions.find(o => o.id === eventType)?.name || eventType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Guests</p>
                      <p className="font-medium text-gray-900">{guestCount}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 mt-4 pt-4">
                    <p className="text-gray-500 text-sm mb-1">Delivery Address</p>
                    <p className="font-medium text-gray-900">
                      {venueName && `${venueName}, `}
                      {streetAddress}{area && `, ${area}`}
                    </p>
                    {specialInstructions && (
                      <p className="text-sm text-gray-500 mt-2">
                        <span className="font-medium">Note:</span> {specialInstructions}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentStep('event-details')}
                    className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Edit Details
                  </button>
                </div>

                {/* Continue to Payment */}
                <button
                  onClick={handleContinueToPayment}
                  className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  Continue to Payment
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Step 3: Payment */}
            {currentStep === 'payment' && (
              <>
                {/* Payment Method Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Truck className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-lg text-gray-900">Payment Method</h2>
                  </div>

                  {/* Pay on Delivery Option */}
                  <div className="space-y-4">
                    <label
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'pay_on_delivery'
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="pay_on_delivery"
                        checked={paymentMethod === 'pay_on_delivery'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'pay_on_delivery')}
                        className="mt-1 w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-gray-900">Pay on Delivery</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Pay with cash or card when your order is delivered
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Payment Information</p>
                        <p className="text-blue-700">
                          You will pay the total amount of <span className="font-semibold">AED {total.toLocaleString()}</span> when your order is delivered to the specified address.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back and Place Order Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="flex-1 py-3 rounded-lg font-medium transition border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !isPaymentValid}
                    className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${placingOrder || !isPaymentValid
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                  >
                    {placingOrder ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Place Order (Pay on Delivery)</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
              <h2 className="font-semibold text-lg text-gray-900 mb-4">
                Order Summary
              </h2>

              {/* Cart Items Summary */}
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate pr-2">{item.package.name}</span>
                    <span className="font-medium shrink-0">AED {calculateItemPrice(item).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">AED {subtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-green-600">
                    AED {total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Guest count info */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                For {guestCount} guests
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={hideToast} />
      )}
    </div>
  );
}
