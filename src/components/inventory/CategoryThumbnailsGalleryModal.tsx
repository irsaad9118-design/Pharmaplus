import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  Image as ImageIcon,
  Info,
  ChevronRight
} from 'lucide-react';
import { MedicationInventory } from '../../types/pharmacy';
import { 
  CATEGORY_ARCHETYPES, 
  getResolvedCategoryThumbnail, 
  requestImagenCategoryThumbnail,
  getNormalizedCategory
} from '../../utils/categoryThumbnailUtils';

interface CategoryThumbnailsGalleryModalProps {
  inventory: MedicationInventory[];
  onClose: () => void;
  onSelectCategoryItem: (item: MedicationInventory) => void;
  onToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const CategoryThumbnailsGalleryModal: React.FC<CategoryThumbnailsGalleryModalProps> = ({
  inventory,
  onClose,
  onSelectCategoryItem,
  onToast
}) => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const archetypes = Object.values(CATEGORY_ARCHETYPES);

  const handleGenerateCategory = async (catKey: string) => {
    setLoadingKey(catKey);
    try {
      const arch = CATEGORY_ARCHETYPES[catKey];
      const res = await requestImagenCategoryThumbnail(arch.label, arch.defaultDosage, arch.imagenPrompt, true);
      setRefreshTrigger(prev => prev + 1);
      if (res.isAiGenerated) {
        onToast?.({
          type: 'success',
          title: 'Imagen Thumbnail Generated',
          message: `Generated AI placeholder for ${arch.label}!`
        });
      } else {
        onToast?.({
          type: 'info',
          title: 'Category Thumbnail',
          message: res.statusMessage || 'Updated category placeholder'
        });
      }
    } catch (err: any) {
      onToast?.({
        type: 'error',
        title: 'Imagen Generation Failed',
        message: err.message
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="gallery-modal-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Medication Category Thumbnails</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Imagen API Integrated</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Whenever a drug in inventory has no uploaded image, its category thumbnail is automatically rendered across all views.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-gallery-modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-teal-50/60 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/50 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              Each medication automatically inherits its category's clinical placeholder thumbnail until a product photo is added.
            </span>
          </div>
          <span className="font-mono font-semibold text-[11px] text-teal-700 dark:text-teal-300">
            {archetypes.length} Categories Defined
          </span>
        </div>

        {/* Grid of Categories */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archetypes.map((arch) => {
              const currentThumb = getResolvedCategoryThumbnail(arch.label, arch.defaultDosage);
              const count = inventory.filter(
                i => getNormalizedCategory(i.category, i.dosageForm).key === arch.key
              ).length;
              const sampleItem = inventory.find(
                i => getNormalizedCategory(i.category, i.dosageForm).key === arch.key
              );
              const isLoading = loadingKey === arch.key;

              return (
                <div
                  key={arch.key}
                  id={`cat-card-${arch.key}`}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 bg-white dark:bg-slate-900/40 transition-all flex gap-4 items-center group"
                >
                  {/* Thumbnail Preview */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-950 shadow-2xs">
                    <img
                      src={currentThumb.imageUrl}
                      alt={arch.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {currentThumb.isAiGenerated && (
                      <span className="absolute top-1 right-1 bg-black/70 text-amber-300 rounded px-1 text-[8px] font-bold flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2 text-amber-300" />
                        AI
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {arch.label}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {arch.shortCode}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {arch.description}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      <span className="text-teal-600 dark:text-teal-400 font-semibold font-mono">
                        {count} {count === 1 ? 'medicine' : 'medicines'}
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">
                        {currentThumb.isAiGenerated ? 'Imagen AI' : 'Vector SVG'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleGenerateCategory(arch.key)}
                      disabled={isLoading}
                      id={`regen-btn-${arch.key}`}
                      title="Generate or refresh with Imagen API"
                      className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    {sampleItem && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategoryItem(sampleItem);
                          onClose();
                        }}
                        id={`edit-prompt-btn-${arch.key}`}
                        title="Customize prompt in studio modal"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Powered by Google Imagen API via `@google/genai`
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
