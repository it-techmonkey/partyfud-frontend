'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin.api';

interface CatererDetail {
  id: string;
  business_name: string;
  business_type: string;
  business_description: string | null;
  cuisines: string[];
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  created_at: string;
  updated_at: string;
  caterer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company_name: string | null;
    image_url: string | null;
    profile_completed: boolean;
    verified: boolean;
    created_at: string;
  };
}


// This file will now include Tabs and render different components based on the active tab
import OrdersList from '@/components/admin/orders/OrdersList';
import CatererFinancials from '@/components/admin/caterers/CatererFinancials';

type TabType = 'details' | 'orders' | 'financials';

export default function CatererDetailPage() {
  const params = useParams();
  const router = useRouter();
  const catererId = params.id as string;

  const [caterer, setCaterer] = useState<CatererDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('details');

  useEffect(() => {
    if (catererId) {
      fetchCatererDetails();
    }
  }, [catererId]);

  const fetchCatererDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.getCatererInfoById(catererId);

      if (response.error) {
        setError(response.error);
        setLoading(false);
        return;
      }

      if (response.data?.success && response.data.data) {
        // Backend returns cuisines from the caterer's packages
        setCaterer(response.data.data as any);
      } else {
        setError('Caterer information not found.');
      }
    } catch (err) {
      console.error('Error fetching caterer details:', err);
      setError('An unexpected error occurred while fetching details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCaterer = async () => {
    if (!caterer) return;

    // Confirm action
    const confirmed = window.confirm(
      `Are you sure you want to block ${caterer.business_name}? This action will change their status to BLOCKED.`
    );

    if (!confirmed) return;

    setBlocking(true);
    setError(null);

    try {
      const response = await adminApi.updateCatererInfoStatus(catererId, 'BLOCKED');

      if (response.error) {
        setError(response.error);
        setBlocking(false);
        return;
      }

      if (response.data?.success) {
        // Refresh the caterer details to show updated status
        await fetchCatererDetails();
        alert('Caterer has been blocked successfully.');
      } else {
        setError('Failed to block caterer. Please try again.');
      }
    } catch (err) {
      console.error('Error blocking caterer:', err);
      setError('An unexpected error occurred while blocking the caterer.');
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockCaterer = async () => {
    if (!caterer) return;

    // Confirm action
    const confirmed = window.confirm(
      `Are you sure you want to unblock ${caterer.business_name}? This will restore their status to APPROVED.`
    );

    if (!confirmed) return;

    setUnblocking(true);
    setError(null);

    try {
      // Re-approving the caterer essentially unblocks them
      const response = await adminApi.updateCatererInfoStatus(catererId, 'APPROVED');

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data?.success) {
        // Refresh the caterer details to show updated status
        await fetchCatererDetails();
        alert('Caterer has been unblocked successfully.');
      } else {
        setError('Failed to unblock caterer. Please try again.');
      }
    } catch (err) {
      console.error('Error unblocking caterer:', err);
      setError('An unexpected error occurred while unblocking the caterer.');
    } finally {
      setUnblocking(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-600"></div>
            <p className="text-gray-600 mt-4 text-sm font-medium">Loading caterer details...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !caterer) {
    return (
      <main className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{error}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/caterers')}
            className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-sm"
          >
            ← Back to Caterers
          </button>
        </div>
      </main>
    );
  }

  if (!caterer) {
    return (
      <main className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-600 text-lg mb-4">Caterer information not found.</p>
            <button
              onClick={() => router.push('/admin/caterers')}
              className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-sm"
            >
              ← Back to Caterers
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <button
            onClick={() => router.push('/admin/caterers')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <span>←</span>
            <span>Back to Caterers</span>
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{caterer.business_name}</h1>
              <p className="text-base text-gray-600">{caterer.business_type}</p>
            </div>
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase ${caterer.status === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-700'
                : caterer.status === 'PENDING'
                  ? 'bg-amber-100 text-amber-700'
                  : caterer.status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : caterer.status === 'BLOCKED'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-gray-200 text-gray-700'
                }`}
            >
              {caterer.status}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'details'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'orders'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'financials'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Financials
            </button>
          </div>

        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
            {/* Cuisines */}
            {caterer.cuisines && caterer.cuisines.length > 0 && (
              <section className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                  Cuisines
                </h2>
                <div className="flex flex-wrap gap-2">
                  {caterer.cuisines.map((cuisine, idx) => (
                    <span
                      key={idx}
                      className="text-sm font-medium bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-200"
                    >
                      {cuisine}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Business Information */}
            <section className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Business Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Name</label>
                  <p className="text-gray-900 font-medium text-base">{caterer.business_name}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Type</label>
                  <p className="text-gray-900 font-medium text-base">{caterer.business_type}</p>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                  <p className="text-gray-700 leading-relaxed">
                    {caterer.business_description || <span className="text-gray-400 italic">No description provided</span>}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Area</label>
                  <p className="text-gray-900 font-medium">{caterer.service_area || <span className="text-gray-400">N/A</span>}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                  <p className="text-gray-900 font-medium">{caterer.region || <span className="text-gray-400">N/A</span>}</p>
                </div>
              </div>
            </section>

            {/* Capacity Information */}
            <section className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Capacity & Staff
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Minimum Guests</label>
                  <p className="text-gray-900 font-medium text-lg">{caterer.minimum_guests || <span className="text-gray-400">N/A</span>}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Maximum Guests</label>
                  <p className="text-gray-900 font-medium text-lg">{caterer.maximum_guests || <span className="text-gray-400">N/A</span>}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preparation Time</label>
                  <p className="text-gray-900 font-medium text-lg">
                    {caterer.preparation_time ? `${caterer.preparation_time} hours` : <span className="text-gray-400">N/A</span>}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff Count</label>
                  <p className="text-gray-900 font-medium text-lg">{caterer.staff || <span className="text-gray-400">N/A</span>}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Servers Count</label>
                  <p className="text-gray-900 font-medium text-lg">{caterer.servers || <span className="text-gray-400">N/A</span>}</p>
                </div>
              </div>
            </section>

            {/* Service Options */}
            <section className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Service Options
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    checked={caterer.delivery_only}
                    disabled
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-gray-900 font-medium">Delivery Only</label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    checked={caterer.delivery_plus_setup}
                    disabled
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-gray-900 font-medium">Delivery + Setup</label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    checked={caterer.full_service}
                    disabled
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-gray-900 font-medium">Full Service</label>
                </div>
              </div>
            </section>

            {/* Caterer Contact Information */}
            <section className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                  <p className="text-gray-900 font-medium text-base">
                    {caterer.caterer.first_name} {caterer.caterer.last_name}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <p className="text-gray-900 font-medium text-base break-all">{caterer.caterer.email}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                  <p className="text-gray-900 font-medium text-base">{caterer.caterer.phone}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Name</label>
                  <p className="text-gray-900 font-medium">
                    {caterer.caterer.company_name || <span className="text-gray-400">N/A</span>}
                  </p>
                </div>
              </div>
            </section>

            {/* Documents */}
            <section className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Food License</label>
                  {caterer.food_license ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewingDocument({ url: caterer.food_license!, name: 'Food License' })}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <a
                        href={caterer.food_license}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Not provided</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registration</label>
                  {caterer.Registration ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewingDocument({ url: caterer.Registration!, name: 'Registration' })}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <a
                        href={caterer.Registration}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Not provided</p>
                  )}
                </div>
              </div>
            </section>

            {/* Timestamps */}
            <section className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Timestamps
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created At</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(caterer.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(caterer.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <OrdersList catererId={caterer.caterer.id} />
          </div>
        )}

        {/* Financials Tab Content */}
        {activeTab === 'financials' && caterer && (
          <div className="space-y-6">
            <CatererFinancials catererId={caterer.id} />
          </div>
        )}


        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-end gap-3">
            {caterer.status === 'BLOCKED' ? (
              <button
                onClick={handleUnblockCaterer}
                disabled={unblocking}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm ${unblocking
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                  }`}
              >
                {unblocking ? 'Unblocking...' : 'UNBLOCK CATERER'}
              </button>
            ) : (
              <button
                onClick={handleBlockCaterer}
                disabled={blocking || (caterer.status as string) === 'BLOCKED'}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm ${blocking || (caterer.status as string) === 'BLOCKED'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md'
                  }`}
              >
                {blocking ? 'Blocking...' : 'BLOCK CATERER'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => setViewingDocument(null)}>
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{viewingDocument.name}</h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingDocument.url.toLowerCase().endsWith('.pdf') || viewingDocument.url.includes('pdf') ? (
                <iframe
                  src={viewingDocument.url}
                  className="w-full h-full min-h-[600px] border-0 rounded"
                  title={viewingDocument.name}
                />
              ) : (
                <img
                  src={viewingDocument.url}
                  alt={viewingDocument.name}
                  className="max-w-full h-auto mx-auto rounded"
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <a
                href={viewingDocument.url}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              <button
                onClick={() => setViewingDocument(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

