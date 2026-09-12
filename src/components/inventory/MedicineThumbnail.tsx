import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  Shield, 
  Pill, 
  Wind, 
  Droplet, 
  Eye, 
  Syringe, 
  Stethoscope 
} from 'lucide-react';
import { MedicationInventory } from '../../types/pharmacy';
import { getNormalizedCategory } from '../../utils/categoryThumbnailUtils';

interface MedicineThumbnailProps {
  item: MedicationInventory;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const MedicineThumbnail: React.FC<MedicineThumbnailProps> = ({
  item,
  size = 'md',
  className = '',
  onClick
}) => {
  const [imgError, setImgError] = useState(false);
  const archetype = getNormalizedCategory(item.category, item.dosageForm);

  // Size configurations
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-xs',
    md: 'w-10 h-10 rounded-xl text-xs',
    lg: 'w-14 h-14 rounded-2xl text-sm'
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  }[size];

  // Render static category Lucide icon
  const renderCategoryIcon = () => {
    switch (archetype.iconName) {
      case 'Heart':
        return <Heart className={iconSizes} />;
      case 'Activity':
        return <Activity className={iconSizes} />;
      case 'Shield':
        return <Shield className={iconSizes} />;
      case 'Pill':
        return <Pill className={iconSizes} />;
      case 'Wind':
        return <Wind className={iconSizes} />;
      case 'Droplet':
        return <Droplet className={iconSizes} />;
      case 'Eye':
        return <Eye className={iconSizes} />;
      case 'Syringe':
        return <Syringe className={iconSizes} />;
      default:
        return <Stethoscope className={iconSizes} />;
    }
  };

  // If user provided a real custom image URL and it hasn't failed to load
  if (item.imageUrl && !imgError) {
    return (
      <div 
        onClick={onClick}
        className={`relative shrink-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs ${sizeClasses} ${className}`}
        title={`${item.brandName} (${item.category})`}
      >
        <img
          src={item.imageUrl}
          alt={item.brandName}
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Lightweight static vector Lucide badge
  return (
    <div
      onClick={onClick}
      id={`med-badge-${item.id}`}
      title={`${item.brandName} • ${archetype.label} (${item.dosageForm})`}
      className={`relative shrink-0 flex flex-col items-center justify-center select-none border transition-colors ${archetype.bgClass} ${archetype.textClass} ${archetype.borderClass} ${sizeClasses} ${className}`}
    >
      {renderCategoryIcon()}
      {size !== 'sm' && (
        <span className="text-[8px] font-bold tracking-tight uppercase leading-none mt-0.5 opacity-85 font-mono">
          {archetype.shortCode}
        </span>
      )}
    </div>
  );
};
