import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Download,
  Trash2,
  FileText,
  Printer,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Shield,
  Palette,
  Heart,
  Pill,
  Activity,
  Layers,
  Plus
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { useAuth } from '../../context/AuthContext';
import {
  generateParametricSvgLogo,
  PRESET_PHARMACY_LOGOS,
  LOGO_PALETTES,
  convertSvgToPngDataUrl,
  processUploadedLogoFile,
  LogoGenerationOptions
} from '../../utils/logoGenerator';

interface StoreLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreLogoModal: React.FC<StoreLogoModalProps> = ({ isOpen, onClose }) => {
  const { shopSettings, updateShopSettings, addToast } = usePharmacy();
  const { currentStore } = useAuth();

  const activeStoreName = currentStore?.storeName || shopSettings?.shopName || shopSettings?.storeName || 'Apex Medicos';
  const activeStoreId = currentStore?.storeId || 'STORE-001';
  const activeDlNumber = currentStore?.dlNumber || shopSettings?.dlNumber || shopSettings?.drugLicense || 'DL-20B/3891';

  // Active Modes: 'ai-studio' | 'upload' | 'presets'
  const [activeTab, setActiveTab] = useState<'ai-studio' | 'upload' | 'presets'>('ai-studio');
  const [previewSurface, setPreviewSurface] = useState<'header' | 'invoice' | 'thermal' | 'whatsapp'>('header');

  // AI Configuration State
  const [storeNameInput, setStoreNameInput] = useState(shopSettings?.shopName || shopSettings?.storeName || activeStoreName || 'Apex Medicos');
  const [taglineInput, setTaglineInput] = useState(shopSettings?.tagline || 'Trusted 24x7 Retail & Clinical Pharmacy');
  const [selectedStyle, setSelectedStyle] = useState<LogoGenerationOptions['style']>('modern-clinical');
  const [selectedPalette, setSelectedPalette] = useState<LogoGenerationOptions['palette']>('teal-emerald');
  const [selectedSymbol, setSelectedSymbol] = useState<LogoGenerationOptions['symbol']>('shield-rx');
  const [customPrompt, setCustomPrompt] = useState('');

  // Selected / Working Logo State (can be SVG string or Data URL)
  const [workingLogo, setWorkingLogo] = useState<string>(shopSettings?.logoUrl || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [designRationale, setDesignRationale] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from current store settings
  useEffect(() => {
    if (isOpen) {
      const initialName = shopSettings?.shopName || shopSettings?.storeName || activeStoreName || 'Apex Medicos';
      setStoreNameInput(initialName);
      setTaglineInput(shopSettings?.tagline || 'Trusted 24x7 Retail & Clinical Pharmacy');
      if (shopSettings?.logoUrl) {
        setWorkingLogo(shopSettings.logoUrl);
      } else {
        // Generate initial parametric SVG preview
        const initialSvg = generateParametricSvgLogo({
          storeName: initialName,
          tagline: shopSettings?.tagline || 'Trusted 24x7 Retail & Clinical Pharmacy',
          style: 'modern-clinical',
          palette: 'teal-emerald',
          symbol: 'shield-rx'
        });
        setWorkingLogo(initialSvg);
      }
    }
  }, [isOpen, shopSettings, activeStoreName]);

  if (!isOpen) return null;

  // 1. Generate Logo using AI (Gemini + Parametric Engine)
  const handleGenerateWithAi = async () => {
    setIsGenerating(true);
    setUploadError(null);
    try {
      const response = await fetch('/api/gemini/generate-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeNameInput,
          tagline: taglineInput,
          style: selectedStyle,
          palette: selectedPalette,
          symbol: selectedSymbol,
          customPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.svg) {
        setWorkingLogo(data.svg);
        setDesignRationale(data.designRationale || 'AI crafted bespoke vector emblem.');
        addToast({
          type: 'success',
          title: 'AI Logo Generated',
          message: data.status === 'success' 
            ? 'Gemini AI generated a bespoke vector emblem for your store!' 
            : 'Custom high-resolution vector emblem generated.'
        });
      }
    } catch (err: any) {
      console.warn('AI logo generation error, generating local parametric vector:', err);
      const fallbackSvg = generateParametricSvgLogo({
        storeName: storeNameInput,
        tagline: taglineInput,
        style: selectedStyle,
        palette: selectedPalette,
        symbol: selectedSymbol
      });
      setWorkingLogo(fallbackSvg);
      setDesignRationale(`Custom ${selectedStyle} emblem generated for ${storeNameInput}`);
      addToast({
        type: 'info',
        title: 'Vector Logo Created',
        message: 'Parametric vector logo created successfully.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Select Preset Template
  const handleSelectPreset = (template: typeof PRESET_PHARMACY_LOGOS[0]) => {
    const svg = template.svg(storeNameInput, taglineInput);
    setWorkingLogo(svg);
    setDesignRationale(template.description);
    addToast({
      type: 'info',
      title: 'Emblem Applied',
      message: `Selected "${template.name}" emblem.`
    });
  };

  // 3. File Upload Handlers
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    try {
      const dataUrl = await processUploadedLogoFile(file);
      setWorkingLogo(dataUrl);
      setDesignRationale(`Uploaded custom file: ${file.name}`);
      addToast({
        type: 'success',
        title: 'Logo Uploaded',
        message: 'Store logo preview updated successfully.'
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process uploaded file.');
    }
  };

  // 4. Save & Apply Logo to Store Settings
  const handleApplyLogo = async () => {
    if (!workingLogo) {
      addToast({
        type: 'warning',
        title: 'No Logo Selected',
        message: 'Please generate or upload a logo before applying.'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Ensure universal PNG data URL conversion for jsPDF & thermal printing compatibility
      let finalDataUrl = workingLogo;
      if (!workingLogo.startsWith('data:image/png') && !workingLogo.startsWith('data:image/jpeg')) {
        finalDataUrl = await convertSvgToPngDataUrl(workingLogo, 600, 600);
      }

      // Update shop settings in context (and sync with backend)
      updateShopSettings({
        logoUrl: finalDataUrl,
        shopName: storeNameInput,
        tagline: taglineInput
      });

      addToast({
        type: 'success',
        title: 'Store Logo Saved!',
        message: 'Your logo is now active on App Headers, POS Receipts, and Tax Invoices.'
      });
      onClose();
    } catch (err: any) {
      console.error('Error applying logo:', err);
      // Fallback save raw string
      updateShopSettings({
        logoUrl: workingLogo,
        shopName: storeNameInput,
        tagline: taglineInput
      });
      addToast({
        type: 'success',
        title: 'Logo Saved',
        message: 'Store logo saved.'
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Remove Logo / Reset to Default
  const handleRemoveLogo = () => {
    updateShopSettings({ logoUrl: '' });
    setWorkingLogo('');
    addToast({
      type: 'info',
      title: 'Logo Reset',
      message: 'Store logo removed. Default medical brand icon restored.'
    });
    onClose();
  };

  // 6. Download Logo Asset (PNG or SVG)
  const handleDownloadLogo = async () => {
    if (!workingLogo) return;

    try {
      const isSvg = workingLogo.includes('<svg') || workingLogo.includes('image/svg');
      let downloadUrl = workingLogo;
      let filename = `${storeNameInput.replace(/\s+/g, '_').toLowerCase()}_logo.png`;

      if (isSvg) {
        // Convert to high-res PNG for download
        downloadUrl = await convertSvgToPngDataUrl(workingLogo, 1000, 1000);
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addToast({
        type: 'success',
        title: 'Logo Downloaded',
        message: `High-resolution logo file saved as ${filename}`
      });
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  // Helper to render current working logo preview image/svg safely
  const renderPreviewImage = (extraClasses = '') => {
    if (!workingLogo) {
      return (
        <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 ${extraClasses}`}>
          <Pill className="w-8 h-8 opacity-40" />
        </div>
      );
    }

    if (workingLogo.includes('<svg')) {
      return (
        <div 
          className={`flex items-center justify-center overflow-hidden ${extraClasses}`}
          dangerouslySetInnerHTML={{ __html: workingLogo }}
        />
      );
    }

    return (
      <img
        src={workingLogo}
        alt="Store Logo Preview"
        className={`object-contain ${extraClasses}`}
        referrerPolicy="no-referrer"
      />
    );
  };

  return (
    <div 
      id="store-logo-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg leading-tight tracking-tight">
                  Store Brand & Logo Studio
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                Upload your pharmacy emblem or generate vector branding for Invoices, Receipts & Headers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative z-10"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Left Column: Generator / Upload Controls (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 flex flex-col">
            
            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('ai-studio')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ai-studio'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Logo Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Instant Emblems</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
            </div>

            {/* TAB 1: AI LOGO STUDIO */}
            {activeTab === 'ai-studio' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Store Name & Slogan Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Store / Chemist Name
                    </label>
                    <input
                      type="text"
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      placeholder="e.g. Apex Medicos & Care"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={taglineInput}
                      onChange={(e) => setTaglineInput(e.target.value)}
                      placeholder="e.g. Trusted 24x7 Family Pharmacy"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Motif / Symbol Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Dominant Pharmaceutical Symbol</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'shield-rx', label: 'Rx Shield', icon: Shield },
                      { id: 'caduceus', label: 'Caduceus', icon: Pill },
                      { id: 'mortar-pestle', label: 'Mortar & Pestle', icon: Layers },
                      { id: 'medical-cross', label: 'Hex Cross', icon: Plus },
                      { id: 'heartbeat-pulse', label: 'Heart Pulse', icon: Activity },
                      { id: 'capsule-leaf', label: 'Eco Capsule', icon: Heart }
                    ].map((s) => {
                      const IconComp = s.icon;
                      const isSelected = selectedSymbol === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSymbol(s.id as any)}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-800 dark:text-teal-300 font-bold ring-1 ring-teal-500'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                          <span className="text-[11px] truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-teal-600" />
                    <span>Color Harmony Palette</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(LOGO_PALETTES).map(([key, pal]) => {
                      const isSelected = selectedPalette === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedPalette(key as any)}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold ring-1 ring-teal-500'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex -space-x-1 shrink-0">
                            <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: pal.primary }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: pal.secondary }} />
                          </div>
                          <span className="text-[10.5px] truncate leading-tight">{pal.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pharmacy Style Archetype */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Design Archetype
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'modern-clinical', label: 'Modern Clinical' },
                      { id: 'herbal-ayurvedic', label: 'Herbal Ayurveda' },
                      { id: 'heritage-apothecary', label: 'Heritage Rx' },
                      { id: 'biotech-pulse', label: 'High-Tech Pulse' },
                      { id: 'warm-community', label: 'Community Care' },
                      { id: 'minimal-cross', label: 'Minimalist' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStyle(st.id as any)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer truncate ${
                          selectedStyle === st.id
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Custom AI Prompt Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Custom Creative Prompt (Optional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. "metallic gold serpents with green leaves"</span>
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Specific design instructions for Gemini..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Trigger AI Generator Button */}
                <button
                  type="button"
                  onClick={handleGenerateWithAi}
                  disabled={isGenerating}
                  id="generate-ai-logo-btn"
                  className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Designing Vector Logo with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-200" />
                      <span>Generate Bespoke Logo with AI</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: INSTANT EMBLEMS GALLERY */}
            {activeTab === 'presets' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select from pre-crafted vector emblems customized with your store name:
                </p>
                <div className="grid grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {PRESET_PHARMACY_LOGOS.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectPreset(tmpl)}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:border-teal-500 dark:hover:border-teal-500 text-left transition-all group cursor-pointer hover:shadow-xs flex flex-col justify-between"
                    >
                      <div className="w-full h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 overflow-hidden mb-2 shadow-2xs">
                        <div 
                          className="w-20 h-20 shrink-0 transform group-hover:scale-105 transition-transform"
                          dangerouslySetInnerHTML={{ __html: tmpl.svg(storeNameInput, taglineInput) }}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {tmpl.name}
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {tmpl.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: UPLOAD CUSTOM FILE */}
            {activeTab === 'upload' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to browse or Drag & Drop image file
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Supports PNG, JPG, SVG, WebP (Max 5MB). Auto-optimized for receipts & PDFs.
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Multi-Surface Preview & Apply Actions (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col justify-between space-y-4">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>Multi-Channel Live Preview</span>
                </label>
              </div>

              {/* Surface Switcher Buttons */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-[10.5px] font-bold text-center">
                <button
                  type="button"
                  onClick={() => setPreviewSurface('header')}
                  className={`py-1 rounded-lg transition-all cursor-pointer ${
                    previewSurface === 'header' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Header
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSurface('invoice')}
                  className={`py-1 rounded-lg transition-all cursor-pointer ${
                    previewSurface === 'invoice' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSurface('thermal')}
                  className={`py-1 rounded-lg transition-all cursor-pointer ${
                    previewSurface === 'thermal' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Thermal
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSurface('whatsapp')}
                  className={`py-1 rounded-lg transition-all cursor-pointer ${
                    previewSurface === 'whatsapp' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  WhatsApp
                </button>
              </div>

              {/* Dynamic Surface Preview Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                
                {/* 1. App Header Preview */}
                {previewSurface === 'header' && (
                  <div className="p-3.5 space-y-2 bg-slate-900 text-white">
                    <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      App Navigation Header Preview
                    </div>
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700">
                      <div className="w-9 h-9 rounded-xl bg-white/10 p-0.5 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                        {renderPreviewImage('w-8 h-8')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-white">PharmPulse</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-[11px] font-bold text-teal-300 truncate max-w-[140px]">
                            {storeNameInput}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                          DL: {activeDlNumber || 'DL-20B/3891'} • 2 Synced
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Official Tax Invoice PDF Preview */}
                {previewSurface === 'invoice' && (
                  <div className="p-3.5 bg-white text-slate-950 space-y-2 font-sans border-b border-slate-100">
                    <div className="h-1.5 w-full bg-teal-600 rounded-full mb-1" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-lg border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                          {renderPreviewImage('w-10 h-10')}
                        </div>
                        <div>
                          <h3 className="font-black text-xs uppercase text-slate-900 tracking-tight">
                            {storeNameInput}
                          </h3>
                          <p className="text-[9.5px] text-slate-600 leading-tight">
                            {taglineInput}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            DL: {activeDlNumber || 'DL-20B/3891'} • GSTIN: 07AABCP1389K1Z4
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          TAX INVOICE
                        </span>
                        <div className="text-[8.5px] font-mono text-slate-500 mt-1">#INV-8814</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Thermal Receipt Preview */}
                {previewSurface === 'thermal' && (
                  <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 text-slate-900 font-mono flex justify-center">
                    <div className="w-[200px] p-2.5 bg-white rounded-lg border border-slate-300 shadow-xs text-center space-y-1">
                      <div className="flex justify-center mb-1">
                        <div className="w-10 h-10 filter grayscale contrast-150 flex items-center justify-center">
                          {renderPreviewImage('w-9 h-9')}
                        </div>
                      </div>
                      <h4 className="font-black text-[11px] uppercase tracking-tight">{storeNameInput}</h4>
                      <p className="text-[8.5px] text-slate-600">DL: {activeDlNumber || 'DL-20B/3891'}</p>
                      <div className="border-b border-dashed border-slate-400 my-1" />
                      <div className="text-[8.5px] flex justify-between">
                        <span>INV #8814</span>
                        <span>₹420.00</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. WhatsApp Digital Share Preview */}
                {previewSurface === 'whatsapp' && (
                  <div className="p-3 bg-[#e5ddd5] dark:bg-slate-950 text-slate-900 flex justify-center">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl shadow-xs max-w-[220px] text-[10px] space-y-1.5 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-200">
                          {renderPreviewImage('w-6 h-6')}
                        </div>
                        <span className="font-bold text-[10.5px] text-emerald-800 dark:text-emerald-400 truncate">
                          {storeNameInput}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-mono leading-relaxed text-[9px]">
                        🧾 *PHARMACY TAX INVOICE*<br />
                        Bill: #INV-8814 | Total: ₹420.00<br />
                        Thank you for choosing {storeNameInput}!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rationale / Details Badge */}
              {designRationale && (
                <div className="p-2 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-300 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{designRationale}</span>
                </div>
              )}
            </div>

            {/* Action Buttons Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleApplyLogo}
                disabled={isSaving || !workingLogo}
                id="apply-store-logo-btn"
                className="w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Store Profile...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Apply &amp; Save as Store Logo</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadLogo}
                  disabled={!workingLogo}
                  className="flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Download high-resolution image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="py-1.5 px-3 rounded-xl font-bold text-xs bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Reset to default icon"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
