'use client';

import { Package } from '@/lib/api/user.api';
import { Check } from 'lucide-react';

interface PackageCardProps {
  pkg: Package;
  isSelected: boolean;
  onSelect: () => void;
  guestCount: number;
  showCustomBadge?: boolean;
}

export function PackageCard({
  pkg,
  isSelected,
  onSelect,
  guestCount,
  showCustomBadge = false,
}: PackageCardProps) {
  // Format menu items for display
  const getMenuSummary = () => {
    if (!pkg.items || pkg.items.length === 0) {
      return null;
    }

    const categories: { [key: string]: string[] } = {};
    pkg.items.forEach((item: any) => {
      const categoryName = item.dish?.category?.name || 'Other';
      if (!categories[categoryName]) {
        categories[categoryName] = [];
      }
      categories[categoryName].push(item.dish?.name || 'Unknown');
    });

    return categories;
  };

  const menuSummary = getMenuSummary();

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Package Type Badge */}
      <div className="flex items-start gap-2 mb-2">
        {pkg.customisation_type === 'CUSTOMISABLE' || pkg.customisation_type === 'CUSTOMIZABLE' ? (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            Customizable
          </span>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            Fixed Menu
          </span>
        )}
        {showCustomBadge && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            Custom
          </span>
        )}
      </div>

      {/* Package Name */}
      <h3 className="font-semibold text-base text-gray-900 mb-2 pr-8">
        {pkg.name}
      </h3>

      {/* Package Description */}
      {pkg.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 pr-8">
          {pkg.description}
        </p>
      )}

      {/* Menu Summary */}
      {menuSummary && (
        <div className="space-y-1.5 text-xs text-gray-600 mb-3">
          {Object.entries(menuSummary).slice(0, 4).map(([category, items]) => (
            <div key={category} className="line-clamp-1">
              <span className="font-medium text-gray-700">{category}:</span>{' '}
              {items.slice(0, 2).join(', ')}
              {items.length > 2 && ` +${items.length - 2} more`}
            </div>
          ))}
          {Object.keys(menuSummary).length > 4 && (
            <p className="text-gray-400 italic">
              +{Object.keys(menuSummary).length - 4} more categories
            </p>
          )}
        </div>
      )}

      {/* Price */}
      <div className="border-t border-gray-100 pt-3 mt-auto">
        <div className="flex items-baseline justify-between">
          <div>
            {!pkg.is_custom_price && (
              <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
            )}
            <span className="text-lg font-bold text-gray-900">
              AED {typeof pkg.total_price === 'number' ? pkg.total_price.toLocaleString() : parseInt(String(pkg.total_price || '0'), 10).toLocaleString()}
            </span>
          </div>
        </div>
        {!pkg.is_custom_price && (
          <p className="text-xs text-gray-500 mt-1">
            For minimum {(pkg as any).minimum_people || (pkg as any).people_count || 1} people
          </p>
        )}
      </div>
    </div>
  );
}
