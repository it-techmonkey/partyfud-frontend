'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin.api';

interface Caterer {
  id: string;
  name: string;
  type: string;
  city: string;
  cuisines: string[];
  email: string;
  phone: string;
  registered: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
}

export default function CaterersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Caterer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch approved and blocked caterers
  useEffect(() => {
    const fetchCatererInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all caterers (no status filter)
        const response = await adminApi.getCatererInfo();

        if (response.error) {
          setError(response.error);
          setLoading(false);
          return;
        }

        if (response.data?.success && response.data.data) {
          console.log('Raw API response data:', response.data.data.slice(0, 2));

          // Filter for APPROVED and BLOCKED caterers
          const relevantCaterers = response.data.data.filter(
            (item) => item.status === 'APPROVED' || item.status === 'BLOCKED'
          );

          const caterers: Caterer[] = relevantCaterers.map((item) => {
            console.log(`Mapping ${item.business_name}: cuisines =`, item.cuisines);
            return {
              id: item.id,
              name: item.business_name,
              type: item.business_type,
              city: item.region || item.service_area || 'N/A',
              cuisines: item.cuisines || [],
              email: item.caterer.email,
              phone: item.caterer.phone,
              registered: new Date(item.created_at).toLocaleDateString(),
              status: item.status,
            };
          });
          console.log('Mapped caterers:', caterers.slice(0, 2));
          setItems(caterers);
        }
      } catch (err) {
        console.error('Error fetching caterer info:', err);
        setError('Failed to load caterer information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCatererInfo();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    );
  }, [items, search]);

  return (
    <main className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Caterers</h1>
              <p className="text-gray-600 mt-2 text-sm">View and manage approved and blocked caterers</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-sm text-gray-600">
                {items.length === 1 ? 'caterer' : 'caterers'} total
              </p>
            </div>
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

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="relative">
            <input
              placeholder="Search by name, email, or phone..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-gray-600"></div>
            <p className="text-gray-600 mt-4 text-sm font-medium">Loading caterers...</p>
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-gray-500 text-base">
                  {search ? 'No caterers found matching your search.' : 'No caterers found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl shadow-sm p-6 space-y-4 cursor-pointer hover:shadow-lg transition-all border border-gray-100 hover:border-gray-200"
                    onClick={() => router.push(`/admin/caterers/${c.id}`)}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{c.name}</h3>
                        <p className="text-sm text-gray-600 mb-1">{c.type}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span>📍</span>
                          <span>{c.city}</span>
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase ${c.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : c.status === 'BLOCKED'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Cuisines */}
                    {c.cuisines && c.cuisines.length > 0 && (
                      <div className="pt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Cuisines</p>
                        <div className="flex flex-wrap gap-2">
                          {c.cuisines.slice(0, 3).map((cuisine, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200"
                            >
                              {cuisine}
                            </span>
                          ))}
                          {c.cuisines.length > 3 && (
                            <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200">
                              +{c.cuisines.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium w-20">Email:</span>
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium w-20">Phone:</span>
                        <span>{c.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium w-20">Registered:</span>
                        <span>{c.registered}</span>
                      </div>
                    </div>

                    {/* View Details Hint */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center font-medium">
                        Click to view details →
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
