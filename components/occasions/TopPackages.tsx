'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { userApi, Package } from '@/lib/api/user.api';

interface TopPackagesProps {
  occasionId: string;
  occasionName: string;
}

export default function TopPackages({ occasionId, occasionName }: TopPackagesProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPackages = async () => {
      if (!occasionId) return;

      try {
        setLoading(true);
        // Fetch packages filtered by occasion_id
        const response = await userApi.getAllPackages({
          occasion_id: occasionId,
          sort_by: 'rating_desc', // Show top-rated packages first
        });

        if (response.data?.data) {
          // Take top 6 packages for display
          setPackages(response.data.data.slice(0, 6));
        }
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [occasionId]);

  const handleViewAll = () => {
    if (occasionId) {
      router.push(`/packages?occasion_id=${encodeURIComponent(occasionId)}&occasion_name=${encodeURIComponent(occasionName)}`);
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
              Top {occasionName} Packages
            </h2>
            <p className="text-gray-600">
              Discover the best packages for your {occasionName.toLowerCase()} event.
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

        {packages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No packages available at the moment. Please check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => {
              const catererId = pkg.caterer?.id;
              const catererSlug = (pkg.caterer as any)?.slug;
              const catererName = pkg.caterer?.name || 'Unknown Caterer';
              const packageImage = pkg.cover_image_url || '/user/package1.svg';
              const rating = pkg.rating;
              const isCustomizable = pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE';
              // Fallback to people_count if minimum_people is missing/zero, though type definition says minimum_people is number.
              const minPeople = pkg.minimum_people || pkg.people_count || 1;

              return (
                <Link
                  key={pkg.id}
                  href={catererId ? `/caterers/${catererSlug || catererId}?packageId=${pkg.id}` : `/packages`}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Package Image */}
                  <div className="relative h-[250px] bg-gray-100">
                    <Image
                      src={packageImage}
                      alt={pkg.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/user/package1.svg';
                      }}
                    />

                    {/* Rating Badge */}
                    {rating !== undefined && (
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
                        <span>⭐</span>
                        <span>{typeof rating === 'number' ? rating.toFixed(1) : parseFloat(String(rating)).toFixed(1)}</span>
                      </div>
                    )}

                    {/* Customizable Badge */}
                    {isCustomizable && (
                      <div className="absolute top-3 left-3 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        Customizable
                      </div>
                    )}
                  </div>

                  {/* Package Info */}
                  <div className="p-5">
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 line-clamp-2">
                      {pkg.name}
                    </h3>

                    <p className="text-gray-600 text-sm mb-3">
                      {catererName}
                    </p>

                    <div className="flex items-baseline justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-gray-900 font-semibold text-lg">
                          AED {typeof pkg.total_price === 'number'
                            ? pkg.total_price.toLocaleString()
                            : parseInt(String(pkg.total_price || '0'), 10).toLocaleString()}
                        </p>
                        {!pkg.is_custom_price && (
                          <p className="text-gray-500 text-xs mt-1">
                            For minimum {minPeople} people
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
