'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { userApi, type Caterer } from '@/lib/api/user.api';
import { getLogoText } from '@/lib/constants';

export default function CatererLogoSlider() {
    const router = useRouter();
    const [caterers, setCaterers] = useState<Caterer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCaterers = async () => {
            try {
                const response = await userApi.filterCaterers({});
                if (response.data?.data) {
                    // Filter out caterers that might inactive if that's a flag, but we don't have that flag visible in interface
                    // Just take all.
                    setCaterers(response.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch caterers for slider', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCaterers();
    }, []);

    if (loading || caterers.length === 0) {
        return null;
    }

    // Ensure we have enough items to scroll smoothly. 
    // If we have few items, we repeat them more times.
    const repeatCount = caterers.length < 5 ? 8 : caterers.length < 10 ? 4 : 2;
    const displayCaterers = Array(repeatCount).fill(caterers).flat();

    return (
        <div className="w-full bg-[#FAFAFA] py-16 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
                    Trusted by Top Caterers
                </h2>
            </div>

            <div className="relative w-full overflow-hidden pause-on-hover py-4">
                {/* Gradients to fade edges */}
                <div className="absolute top-0 left-0 z-10 w-20 md:w-40 h-full bg-gradient-to-r from-[#FAFAFA] to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 z-10 w-20 md:w-40 h-full bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none"></div>

                <div className="flex w-max animate-marquee gap-12 md:gap-20 items-center">
                    {displayCaterers.map((caterer, index) => (
                        <div
                            key={`${caterer.id}-${index}`}
                            className="flex-shrink-0 group cursor-pointer transition-opacity hover:opacity-100 opacity-80 relative"
                            onClick={() => router.push(`/caterers/${caterer.slug || caterer.id}`)}
                        >
                            {caterer.image_url ? (
                                <div className="relative h-16 w-32 md:h-20 md:w-40 flex items-center justify-center">
                                    <Image
                                        src={caterer.image_url}
                                        alt={caterer.name}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                                        {getLogoText(caterer.name)}
                                    </div>
                                    <span className="font-semibold text-gray-800 text-lg whitespace-nowrap">
                                        {caterer.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
