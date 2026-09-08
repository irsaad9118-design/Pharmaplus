import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  RefreshCw, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Tag, 
  Sliders, 
  Download,
  Info,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { MedicationInventory, CategoryThumbnailInfo } from '../../types/pharmacy';
import { 
  getResolvedCategoryThumbnail, 
  getNormalizedCategory, 
  requestImagenCategoryThumbnail, 
  setLocalThumbnail,
  buildImagenPromptForCategory,
  generateClinicalCategorySvg,
  CATEGORY_ARCHETYPES
} from '../../utils/categoryThumbnailUtils';

interface CategoryThumbnailModalProps {
  item: MedicationInventory;
  inventory: MedicationInventory[];
  onClose: () => void;
  onToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
  onUpdateItemImage?: (itemId: string, imageUrl: string) => void;
}

export const CategoryThumbnailModal: React.FC<CategoryThumbnailModalProps> = ({
  item,
  inventory,
  onClose,
  onToast,
  onUpdateItemImage
}) => {
  const archetype = getNormalizedCategory(item.category, item.dosageForm);
  const [thumbInfo, setThumbInfo] = useState<CategoryThumbnailInfo>(() => 
    getResolvedCategoryThumbnail(item.category, item.dosageForm)
  );

  const [promptText, setPromptText] = useState<string>(() => 
    thumbInfo.prompt || buildImagenPromptForCategory(item.category, item.dosageForm)
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(thumbInfo.statusMessage || null);
  const [activeTab, setActiveTab] = useState<'preview' | 'prompt' | 'category_items'>('preview');

  // Find all medicines in same category
  const siblingItems = inventory.filter(
    i => getNormalizedCategory(i.category, i.dosageForm).key === archetype.key
  );

  const handleGenerateImagen = async () => {
    setIsGenerating(true);
    setStatusMessage('Contacting Google Imagen API to synthesize category thumbnail...');

    try {
      const result = await requestImagenCategoryThumbnail(
        item.category,
        item.dosageForm,
        promptText,
        true
      );

      setThumbInfo(result);
      setStatusMessage(result.statusMessage || null);

      if (result.isAiGenerated) {
        onToast?.({
          type: 'success',
          title: 'Imagen AI Thumbnail Generated',
          message: `Generated studio placeholder thumbnail for ${archetype.label}!`
        });
      } else {
        onToast?.({
          type: 'info',
          title: 'Category Thumbnail',
          message: result.statusMessage || 'Updated category placeholder'
        });
      }
    } catch (err: any) {
      setStatusMessage(`Generation failed: ${err.message}`);
      onToast?.({
        type: 'error',
        title: 'Imagen Generation Failed',
        message: err.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetToClinicalVector = () => {
    const defaultSvg = generateClinicalCategorySvg(item.category, item.dosageForm);
    const info: CategoryThumbnailInfo = {
      category: item.category,
      normalizedCategory: archetype.key,
      imageUrl: defaultSvg,
      isAiGenerated: false,
      provider: 'fallback_svg',
      prompt: buildImagenPromptForCategory(item.category, item.dosageForm),
      generatedAt: new Date().toISOString(),
      statusMessage: 'Reset to clinical vector placeholder'
    };
    setLocalThumbnail(info);
    setThumbInfo(info);
    setPromptText(info.prompt || '');
    setStatusMessage('Reset to clinical vector archetype.');
    onToast?.({
      type: 'info',
      title: 'Reset to Vector Graphic',
      message: 'Category thumbnail restored to default clinical vector archetype'
    });
  };

  const applyPromptPreset = (modifier: string) => {
    const base = buildImagenPromptForCategory(item.category, item.dosageForm);
    setPromptText(`${base}, ${modifier}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-thumb-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="category-thumb-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{archetype.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300">
                  {archetype.shortCode}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI Category Placeholder Thumbnail (Imagen API) • Used when drug image is unavailable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-category-thumb-modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Thumbnail & Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'prompt'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Imagen Prompt Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('category_items')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'category_items'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Medicines in this Category ({siblingItems.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'preview' && (
            <div className="space-y-5">
              {/* Image Preview & Details Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <div className="relative w-36 h-36 shrink-0 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-950">
                  <img
                    src={thumbInfo.imageUrl}
                    alt={archetype.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {thumbInfo.isAiGenerated && (
                    <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-xs text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Imagen AI</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      thumbInfo.isAiGenerated 
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                    }`}>
                      {thumbInfo.isAiGenerated ? <Sparkles className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      <span>{thumbInfo.isAiGenerated ? 'AI Generated via Imagen' : 'Clinical Vector Archetype'}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      1:1 Square
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {item.brandName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {archetype.description}
                  </p>

                  <div className="pt-2 flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs">
                    <button
                      onClick={handleGenerateImagen}
                      disabled={isGenerating}
                      id="generate-imagen-btn-preview"
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Generating...' : 'Generate with Imagen AI'}</span>
                    </button>

                    <button
                      onClick={handleResetToClinicalVector}
                      id="reset-vector-btn"
                      className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                    >
                      Reset to Vector
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Message Banner */}
              {statusMessage && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{statusMessage}</p>
                    {statusMessage.includes('paid API key') && (
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">
                        Google Gemini Imagen image synthesis is a paid API tier feature. When a paid key with image quota is active in the environment, high-res photorealistic thumbnails render directly from Google's Imagen model.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Applied Scope Info */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Automatic Thumbnail Fallback Rule</span>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">Active</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Whenever any drug in your catalog does not possess an uploaded photograph, PharmPulse automatically renders this professional category thumbnail in the inventory grid, POS billing item search, and WhatsApp receipt previews.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Imagen Prompt for {archetype.label}
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden font-mono leading-relaxed"
                  placeholder="Describe the medical packaging photograph to generate with Imagen..."
                />
              </div>

              {/* Quick Prompt Presets */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Add Clinical Modifiers
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'commercial white blister pack',
                    'aluminium foil seal',
                    'clear glass medicine vial with rubber stopper',
                    'minimalist laboratory setting',
                    'clean clinical macro photography',
                    'soft pharmaceutical studio shadows',
                    'sterile hospital dispensary lighting'
                  ].map((modifier) => (
                    <button
                      key={modifier}
                      type="button"
                      onClick={() => applyPromptPreset(modifier)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors"
                    >
                      + {modifier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Generation */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPromptText(buildImagenPromptForCategory(item.category, item.dosageForm))}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  Reset Prompt to Default
                </button>

                <button
                  type="button"
                  onClick={handleGenerateImagen}
                  disabled={isGenerating}
                  id="generate-imagen-custom-prompt-btn"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Calling Imagen API...' : 'Synthesize New Thumbnail'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'category_items' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All medicines below belong to <strong className="text-slate-800 dark:text-slate-200">{archetype.label}</strong> and share this placeholder thumbnail when no individual photo is uploaded:
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                {siblingItems.map((med) => (
                  <div key={med.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        <img
                          src={med.imageUrl || thumbInfo.imageUrl}
                          alt={med.brandName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{med.brandName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{med.genericName} • {med.dosageForm}</span>
                      </div>
                    </div>

                    <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                      ₹{med.mrp.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            Category Key: {archetype.key}
          </span>
          <button
            onClick={onClose}
            id="done-category-thumb-modal"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
