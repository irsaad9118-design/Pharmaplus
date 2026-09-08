import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { MedicationInventory, CategoryThumbnailInfo } from '../../types/pharmacy';
import { getResolvedCategoryThumbnail, getNormalizedCategory } from '../../utils/categoryThumbnailUtils';

interface MedicineThumbnailProps {
  item: MedicationInventory;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showAiBadge?: boolean;
  className?: string;
}

export const MedicineThumbnail: React.FC<MedicineThumbnailProps> = ({
  item,
  size = 'md',
  onClick,
  showAiBadge = true,
  className = ''
}) => {
  const [thumbInfo, setThumbInfo] = useState<CategoryThumbnailInfo>(() => {
    return getResolvedCategoryThumbnail(item.category, item.dosageForm);
  });

  // Re-sync if category changes
  useEffect(() => {
    const resolved = getResolvedCategoryThumbnail(item.category, item.dosageForm);
    setThumbInfo(resolved);
  }, [item.category, item.dosageForm]);

  const hasDirectImage = !!item.imageUrl;
  const displaySrc = item.imageUrl || thumbInfo.imageUrl;
  const isAiGenerated = !hasDirectImage && thumbInfo.isAiGenerated;
  const archetype = getNormalizedCategory(item.category, item.dosageForm);

  // Dimensions
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl'
  }[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      id={`med-thumb-${item.id}`}
      title={hasDirectImage 
        ? `${item.brandName} custom image` 
        : `${archetype.label} placeholder thumbnail (Click to view or generate with Imagen AI)`}
      className={`relative shrink-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs group cursor-pointer select-none transition-all hover:border-teal-400 hover:shadow-xs ${sizeClasses} ${className}`}
    >
      <img
        src={displaySrc}
        alt={item.brandName}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
        onError={(e) => {
          // Fallback safely to generated SVG
          const fallback = getResolvedCategoryThumbnail(item.category, item.dosageForm);
          (e.currentTarget as HTMLImageElement).src = fallback.imageUrl;
        }}
      />

      {/* AI or Category Indicator Overlay */}
      {showAiBadge && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between px-1 py-0.5 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
          {isAiGenerated ? (
            <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-300 tracking-tight leading-none drop-shadow-xs">
              <Sparkles className="w-2 h-2 text-amber-300 animate-pulse" />
              <span>AI</span>
            </span>
          ) : (
            <span className="text-[7.5px] font-bold text-white/90 uppercase tracking-tighter leading-none font-mono">
              {archetype.shortCode}
            </span>
          )}

          <ImageIcon className="w-2 h-2 text-white/70 ml-auto" />
        </div>
      )}
    </div>
  );
};
