'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { userApi, Caterer } from '@/lib/api/user.api';

interface TopCaterersProps {
  occasionId: string;
  occasionName: string;
}

export default function TopCaterers({ occasionId, occasionName }: TopCaterersProps) {
  const [caterers, setCaterers] = useState<Caterer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCaterers = async () => {
      try {
        setLoading(true);
        // Fetch caterers - we'll get all caterers and filter by occasion from packages
        const response = await userApi.filterCaterers({});

        if (response.data?.data) {
          // Take top 3 caterers for display
          setCaterers(response.data.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching caterers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCaterers();
  }, [occasionId]);

  const handleViewAll = () => {
    if (occasionId) {
      router.push(`/caterers?occasion_id=${encodeURIComponent(occasionId)}`);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82C43C]"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Top {occasionName} Caterers
            </h2>
            <p className="text-gray-600">
              Discover caterers who specialize in creating memorable {occasionName.toLowerCase()} experiences.
            </p>
          </div>
          {occasionId && (
            <button
              onClick={handleViewAll}
              className="border border-gray-300 hover:border-gray-400 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              View All
            </button>
          )}
        </div>

        {caterers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No caterers available at the moment. Please check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {caterers.map((caterer) => (
              <div
                key={caterer.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/caterers/${caterer.slug || caterer.id}`)}
              >
                {/* Caterer Image */}
                <div className="relative h-[250px] bg-gray-100">
                  <Image
                    src={caterer.image_url || '/user/default-caterer.jpg'}
                    alt={caterer.business_name || caterer.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/user/default-caterer.jpg';
                    }}
                  />
                </div>

                {/* Caterer Info */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600 text-lg">★</span>
                    <span className="font-semibold">
                      {caterer.packages?.[0]?.rating || 4.8}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {caterer.business_name || caterer.name}
                  </h3>

                  <p className="text-gray-600 text-sm mb-3">
                    {caterer.description || 'Traditional Afternoon Tea'}
                  </p>

                  <p className="text-gray-900 font-medium">
                    From AED {caterer.minPrice} per person
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
