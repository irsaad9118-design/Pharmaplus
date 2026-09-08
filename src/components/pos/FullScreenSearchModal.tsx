import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  ArrowLeft, 
  X, 
  Camera, 
  MapPin, 
  Pill, 
  Plus, 
  Minus, 
  Check, 
  ShoppingCart, 
  ArrowRight,
  ArrowRightLeft,
  AlertCircle,
  AlertTriangle,
  Zap,
  Sparkles,
  Tag,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { MedicationInventory, PosBillItem } from '../../types/pharmacy';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';

interface FullScreenSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  inventory: MedicationInventory[];
  cartItems: PosBillItem[];
  onAddToCart: (item: MedicationInventory) => void;
  onUpdateQuantity: (inventoryId: string, qty: number) => void;
  onOpenSubstitute: (item: MedicationInventory) => void;
  onOpenScanner: () => void;
  onOpenCart: () => void;
  cartTotal: number;
  totalItemsCount: number;
  autoStartVoice?: boolean;
}

export const FullScreenSearchModal: React.FC<FullScreenSearchModalProps> = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  inventory,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onOpenSubstitute,
  onOpenScanner,
  onOpenCart,
  cartTotal,
  totalItemsCount,
  autoStartVoice = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const autoStartedVoiceRef = useRef<boolean>(false);

  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    toggleListening,
    clearError: clearVoiceError
  } = useVoiceSearch({
    onTranscript: (spokenText) => {
      onSearchChange(spokenText);
    }
  });

  // Auto-focus input and optionally auto-start voice whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      if (autoStartVoice && isVoiceSupported && !autoStartedVoiceRef.current) {
        autoStartedVoiceRef.current = true;
        const voiceTimer = setTimeout(() => {
          startListening();
        }, 120);
        return () => clearTimeout(voiceTimer);
      }
      // Small timeout to guarantee DOM is ready and keyboard triggers
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (!autoStartVoice) {
            inputRef.current.select();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      autoStartedVoiceRef.current = false;
      stopListening();
      clearVoiceError();
    }
  }, [isOpen, autoStartVoice, isVoiceSupported, startListening, stopListening, clearVoiceError]);

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Format Expiry as MM/YY
  const formatExpiryMonthYear = (dateStr: string) => {
    if (!dateStr) return '12/27';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const year = parts[0].slice(-2);
      const month = parts[1];
      return `${month}/${year}`;
    }
    return dateStr;
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (dateStr: string) => {
    if (!dateStr) return 999;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Filter Inventory
  const filteredResults = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    const invList = inventory || [];
    let activeList = invList.filter(item => !item?.quarantined);

    if (selectedCategory !== 'all') {
      activeList = activeList.filter(item => 
        (item?.category || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (!q) return activeList;

    return activeList.filter(item => {
      const matchBrand = (item?.brandName || '').toLowerCase().includes(q);
      const matchSalt = (item?.saltComposition || item?.genericName || '').toLowerCase().includes(q);
      const matchBatch = (item?.batchNumber || '').toLowerCase().includes(q);
      const matchRack = (item?.locationShelf || `${item?.rackNumber || ''} / ${item?.shelfRow || ''} ${item?.boxBin || ''}`).toLowerCase().includes(q);
      const matchCat = (item?.category || '').toLowerCase().includes(q);
      return matchBrand || matchSalt || matchBatch || matchRack || matchCat;
    });
  }, [inventory, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div 
      id="pos-fullscreen-search-overlay"
      className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col w-full h-full overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* 1. TOP DOCKED SEARCH HEADER */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-3 shrink-0 shadow-lg shadow-black/40">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
          
          {/* Back / Close Button */}
          <button
            type="button"
            onClick={onClose}
            id="fullscreen-search-back-btn"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700/80 shadow-xs"
            title="Exit Search Mode (Esc)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search Input Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              id="fullscreen-search-input"
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isListening ? "Listening... Speak medicine name..." : "Search medicine name, salt formula, rack, or batch..."}
              className={`w-full pl-10 sm:pl-11 pr-24 sm:pr-28 py-2.5 sm:py-3 bg-slate-950 border rounded-xl text-sm sm:text-base font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 min-h-[44px] sm:min-h-[48px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden shadow-inner transition-colors ${
                isListening 
                  ? 'border-rose-500 ring-2 ring-rose-500/30 placeholder-rose-300' 
                  : 'border-teal-500/50 focus:ring-teal-400 focus:border-teal-400'
              }`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />

            {/* Right inside input actions: Clear Button & Voice-to-Text Button */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {/* Clear Input Button */}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  title="Clear text"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}

              {/* Voice-to-Text Microphone Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleListening();
                }}
                id="fullscreen-search-voice-btn"
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer relative ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/60 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700'
                }`}
                title={isListening ? "Listening... Click to stop voice search" : "Voice search: Speak medicine name or salt formula"}
              >
                {isListening ? (
                  <>
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <Mic className="w-4 h-4 text-white" />
                  </>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Camera Scanner Trigger */}
          <button
            type="button"
            onClick={() => {
              onOpenScanner();
            }}
            id="fullscreen-search-scanner-btn"
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 flex items-center gap-1.5 font-bold text-xs sm:text-sm cursor-pointer transition-colors shrink-0 active:scale-95"
            title="Scan Barcode / QR"
          >
            <Camera className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Live Voice Listening Banner Feedback */}
        {isListening && (
          <div className="max-w-4xl mx-auto mt-2.5 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-200 flex items-center justify-between gap-2 text-xs shadow-md animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5 truncate">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="font-bold text-rose-100">
                🎙️ Listening... Speak medicine name or salt formula
              </span>
              {transcript && (
                <span className="font-mono bg-rose-900/60 text-white px-2 py-0.5 rounded border border-rose-700 truncate max-w-[200px] sm:max-w-md font-semibold">
                  "{transcript}"
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="shrink-0 px-2 py-0.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Voice Error Banner */}
        {voiceError && (
          <div className="max-w-4xl mx-auto mt-2.5 px-3 py-2 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-200 flex items-center justify-between gap-2 text-xs shadow-md">
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={clearVoiceError}
              className="shrink-0 text-amber-300 hover:text-white font-bold p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Results Summary & Quick Filters */}
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 mt-2 px-1 text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-200">
              {searchTerm ? `Results for "${searchTerm}"` : 'All Available Medicines'}
            </span>
            <span className="bg-teal-950 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
              {filteredResults.length} {filteredResults.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <span className="text-emerald-400 font-bold text-[11px] shrink-0">
            ⚡ 1-Tap to Add to Bill
          </span>
        </div>
      </header>

      {/* 2. LIVE SCROLLABLE MEDICINE RESULTS LIST */}
      <main className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-3 sm:py-4 max-w-4xl mx-auto w-full space-y-2.5 pb-28">
        {filteredResults.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 p-8 sm:p-12 rounded-3xl text-center shadow-xl my-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">No Matching Medicines Found</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              We couldn't find any drug matching "{searchTerm}". Try searching by generic salt composition or rack location.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Clear Search Query
              </button>
            </div>
          </div>
        ) : (
          filteredResults.map((item) => {
            const inCart = cartItems.find(i => i.inventoryId === item.id);
            const isOutOfStock = item.stockQuantity <= 0;
            const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= (item.minAlertLevel || 15);
            const expFormatted = formatExpiryMonthYear(item.expirationDate);
            const daysLeft = getDaysUntilExpiry(item.expirationDate);

            // Detailed Rack String
            const rackDisplay = item.locationShelf 
              ? item.locationShelf 
              : `${item.rackNumber || 'Rack A-1'} • ${item.shelfRow || 'Shelf 1'}${item.boxBin ? ` • Bin ${item.boxBin}` : ''}`;

            return (
              <div
                key={item.id}
                id={`fullscreen-med-card-${item.id}`}
                onClick={() => onAddToCart(item)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-md select-none relative ${
                  inCart 
                    ? 'bg-slate-900/90 border-teal-500 ring-2 ring-teal-500/30' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 active:scale-[0.995]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  {/* Left Column: Brand, Salt, Badges & Rack Location */}
                  <div className="flex-1 min-w-0">
                    
                    {/* Header Row: Brand Name & Dosage Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm sm:text-base text-white leading-tight">
                        {item.brandName}
                      </h4>
                      
                      {item.strength && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700/60">
                          {item.strength}
                        </span>
                      )}
                      
                      <span className="text-[10px] text-slate-400 font-semibold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {item.dosageForm || 'Tablet'}
                      </span>

                      {item.scheduleClass && item.scheduleClass !== 'OTC' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {item.scheduleClass}
                        </span>
                      )}

                      {/* Offer Pill */}
                      {item.offerType && item.offerType !== 'none' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>
                            {item.offerType === 'percentage' && `${item.offerValue}% OFF`}
                            {item.offerType === 'flat' && `₹${item.offerValue} OFF`}
                            {item.offerType === 'scheme' && `Buy ${item.schemeBuyQty}+${item.schemeFreeQty || 1} Free`}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Salt / Composition Row - Clickable for Instant Salt Substitutes */}
                    <button
                      type="button"
                      title="Click to view salt substitutes"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenSubstitute(item);
                      }}
                      className="text-xs sm:text-sm text-teal-300 font-semibold mt-1 truncate flex items-center gap-1.5 hover:underline cursor-pointer text-left w-fit max-w-full"
                    >
                      <Pill className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                      <span className="truncate">{item.saltComposition || item.genericName || 'Standard Chemical Salt Formula'}</span>
                      <span className="text-xs text-teal-400/80 font-mono">⇄</span>
                    </button>

                    {/* Meta Badges: Exact Rack Location, Batch, Expiry, Stock */}
                    <div className="flex items-center gap-2 flex-wrap mt-2.5 text-[11px]">
                      
                      {/* Prominent Exact Rack Location Badge */}
                      <span 
                        className="px-2.5 py-1 rounded-lg font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80 flex items-center gap-1.5 shadow-xs"
                        title={`Physical Pharmacy Storage Location: ${rackDisplay}`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono">{rackDisplay}</span>
                      </span>

                      {/* Batch Number */}
                      <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        B: {item.batchNumber}
                      </span>

                      {/* Expiry Date */}
                      <span className={`font-mono px-2 py-0.5 rounded-md font-bold border ${
                        daysLeft <= 90 
                          ? 'bg-rose-950 text-rose-300 border-rose-800' 
                          : daysLeft <= 180
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}>
                        Exp: {expFormatted}
                      </span>

                      {/* Live Stock Count */}
                      <span className={`font-bold px-2 py-0.5 rounded-md border ${
                        isOutOfStock 
                          ? 'bg-rose-950 text-rose-300 border-rose-800' 
                          : isLowStock 
                          ? 'bg-amber-950 text-amber-300 border-amber-800' 
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}>
                        {isOutOfStock ? '0 (Out of Stock)' : `${item.stockQuantity} in stock`}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Price & 1-Tap Add / Quantity Stepper */}
                  <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                    
                    {/* MRP / Selling Price */}
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">MRP</span>
                      <span className="text-base sm:text-lg font-black text-white font-mono">
                        ₹{(item.sellingPrice || item.mrp || 0).toFixed(2)}
                      </span>
                      {item.mrp && item.sellingPrice && item.sellingPrice < item.mrp && (
                        <span className="text-[10px] line-through text-slate-500 block">
                          ₹{item.mrp.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Substitute & Add to Cart */}
                    <div className="flex items-center gap-1.5 mt-2">
                      
                      {/* Salt Substitute Finder (⇄ Button) */}
                      <button
                        id={`search-substitute-btn-${item.id}`}
                        type="button"
                        aria-label={`Find Salt Substitutes for ${item.brandName}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onOpenSubstitute(item);
                        }}
                        className="w-9 h-9 rounded-xl bg-teal-950 hover:bg-teal-900 text-teal-300 hover:text-teal-200 border border-teal-800 transition-colors flex items-center justify-center cursor-pointer active:scale-95 shadow-xs group"
                        title="⇄ Find Salt Substitutes & In-Stock Alternatives"
                      >
                        <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                      </button>

                      {/* 1-Tap Add or Interactive Quantity Counter */}
                      {inCart ? (
                        <div 
                          className="flex items-center bg-teal-950 border border-teal-500 rounded-xl p-0.5 shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, inCart.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-800 text-teal-300 hover:bg-teal-900 flex items-center justify-center font-black transition-colors cursor-pointer active:scale-95 shadow-xs"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-black text-teal-200 min-w-[24px] text-center font-mono">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, inCart.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center font-black transition-colors cursor-pointer active:scale-95 shadow-xs"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(item);
                          }}
                          className="h-9 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-teal-950/40 active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>

                  </div>

                </div>

                {/* Salt Substitute Suggestion Banner when Stock is 0 */}
                {isOutOfStock && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2.5"
                  >
                    {/* Salt Substitute Header */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Out of Stock. Available in-stock alternatives with same salt composition:</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
                        {(() => {
                          const targetSalt = (item.saltComposition || item.genericName || '').toLowerCase().trim();
                          if (!targetSalt) return 0;
                          return inventory.filter(alt => {
                            if (alt.id === item.id || alt.quarantined || alt.stockQuantity <= 0) return false;
                            const altSalt = (alt.saltComposition || alt.genericName || '').toLowerCase().trim();
                            if (!altSalt) return false;
                            if (altSalt.includes(targetSalt) || targetSalt.includes(altSalt)) return true;
                            const keywords = targetSalt
                              .replace(/usp|bp|ip|tablets|capsules|er|sr|mg|mcg|hcl|sodium|calcium|\d+/gi, '')
                              .split(/[\s+,/]+/)
                              .map(k => k.trim())
                              .filter(k => k.length > 3);
                            return keywords.some(kw => altSalt.includes(kw));
                          }).length;
                        })()} In Stock
                      </span>
                    </div>

                    {/* Available Alternatives List */}
                    {(() => {
                      const targetSalt = (item.saltComposition || item.genericName || '').toLowerCase().trim();
                      const inStockSubstitutes = !targetSalt ? [] : inventory.filter(alt => {
                        if (alt.id === item.id || alt.quarantined || alt.stockQuantity <= 0) return false;
                        const altSalt = (alt.saltComposition || alt.genericName || '').toLowerCase().trim();
                        if (!altSalt) return false;
                        if (altSalt.includes(targetSalt) || targetSalt.includes(altSalt)) return true;
                        const keywords = targetSalt
                          .replace(/usp|bp|ip|tablets|capsules|er|sr|mg|mcg|hcl|sodium|calcium|\d+/gi, '')
                          .split(/[\s+,/]+/)
                          .map(k => k.trim())
                          .filter(k => k.length > 3);
                        return keywords.some(kw => altSalt.includes(kw));
                      });

                      if (inStockSubstitutes.length === 0) {
                        return (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                            <span>No other brand with matching chemical salt is currently in stock.</span>
                            <button
                              type="button"
                              onClick={() => onOpenSubstitute(item)}
                              className="text-xs text-teal-400 hover:underline font-semibold cursor-pointer"
                            >
                              Explore salt matrix →
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-1.5">
                          {inStockSubstitutes.slice(0, 3).map(sub => (
                            <div 
                              key={sub.id}
                              className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 hover:border-amber-400/80 flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-xs sm:text-sm text-white truncate">{sub.brandName}</span>
                                  {sub.strength && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                      {sub.strength}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                                    {sub.stockQuantity} in stock
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                                  <span className="text-teal-300 font-mono flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-teal-400" />
                                    {sub.locationShelf || sub.rackNumber || 'Rack A-1'}
                                  </span>
                                  <span>•</span>
                                  <span className="text-white font-mono font-bold">MRP: ₹{sub.mrp.toFixed(2)}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToCart(sub);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-950/40 active:scale-95 cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                                <span>1-Click Replace</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* 3. FLOATING QUICK CART SUMMARY AT BOTTOM */}
      <footer className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-40">
        <div 
          onClick={() => {
            onClose();
            onOpenCart();
          }}
          id="fullscreen-search-cart-dock"
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-teal-950/80 border border-teal-400/40 flex items-center justify-between cursor-pointer transition-all active:scale-98 select-none"
        >
          {/* Left: Cart items & Grand total */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-teal-100 uppercase tracking-wide">
                Active Bill Cart
              </div>
              <div className="text-sm sm:text-base font-black text-white font-mono">
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} • ₹{cartTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Right: Done / Back to Cart Button */}
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors">
            <span>Done / View Cart</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </footer>
    </div>
  );
};
