import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  X, 
  Flashlight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Barcode, 
  Volume2, 
  VolumeX,
  Upload,
  Keyboard,
  QrCode,
  Check,
  Package,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import jsQR from 'jsqr';
import { MedicationInventory } from '../../types/pharmacy';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: MedicationInventory[];
  onItemScanned: (item: MedicationInventory) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onItemScanned
}) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const videoElemRef = useRef<HTMLVideoElement | null>(null);
  const canvasElemRef = useRef<HTMLCanvasElement | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [camerasList, setCamerasList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorchCapability, setHasTorchCapability] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedItem, setLastScannedItem] = useState<MedicationInventory | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [recentlyScannedList, setRecentlyScannedList] = useState<Array<{ item: MedicationInventory; timestamp: number }>>([]);
  const [multiScanMode, setMultiScanMode] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState<string | null>(null);

  const lastScanTimestampRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const scanIntervalRef = useRef<any>(null);

  // Play crisp 1.2 kHz checkout beep
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio context restricted or unavailable
    }
  }, [soundEnabled]);

  // Match raw scanned string to inventory
  const matchCodeToInventory = useCallback((code: string): MedicationInventory | null => {
    if (!code) return null;
    const cleanRaw = code.trim();
    const cleanLower = cleanRaw.toLowerCase();
    const cleanAlphaNum = cleanLower.replace(/[^a-z0-9]/g, '');

    // Check if code is JSON payload (e.g. {"id":"MED-1", "batch":"DL-8821"})
    if (cleanRaw.startsWith('{') && cleanRaw.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanRaw);
        if (parsed.id) {
          const directMatch = inventory.find(i => !i.quarantined && i.id.toLowerCase() === parsed.id.toLowerCase());
          if (directMatch) return directMatch;
        }
        if (parsed.batchNumber || parsed.batch) {
          const bNum = parsed.batchNumber || parsed.batch;
          const batchMatch = inventory.find(i => !i.quarantined && i.batchNumber.toLowerCase() === bNum.toLowerCase());
          if (batchMatch) return batchMatch;
        }
        if (parsed.ndc) {
          const ndcMatch = inventory.find(i => !i.quarantined && (i.ndc || '').toLowerCase() === parsed.ndc.toLowerCase());
          if (ndcMatch) return ndcMatch;
        }
      } catch (e) {
        // Not valid JSON, continue with standard matching
      }
    }

    // Direct Exact Matches
    const exactMatch = inventory.find(item => {
      if (item.quarantined) return false;
      const batchExact = item.batchNumber.toLowerCase() === cleanLower;
      const idExact = item.id.toLowerCase() === cleanLower;
      const ndcExact = (item.ndc || '').toLowerCase() === cleanLower;
      const brandExact = item.brandName.toLowerCase() === cleanLower;
      const hsnExact = (item.hsnCode || '').toLowerCase() === cleanLower;
      const barcodeExact = (item.barcode || '').toLowerCase() === cleanLower;
      return batchExact || idExact || ndcExact || brandExact || hsnExact || barcodeExact;
    });
    if (exactMatch) return exactMatch;

    // Alphanumeric Matches (e.g., EAN13 vs NDC stripped of dashes)
    const alphaMatch = inventory.find(item => {
      if (item.quarantined) return false;
      const normNdc = (item.ndc || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBatch = item.batchNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normId = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normBarcode = (item.barcode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        (normNdc && normNdc === cleanAlphaNum) ||
        (normBatch && normBatch === cleanAlphaNum) ||
        (normId && normId === cleanAlphaNum) ||
        (normBarcode && normBarcode === cleanAlphaNum)
      );
    });
    if (alphaMatch) return alphaMatch;

    // Partial Contains Matches
    const partialMatch = inventory.find(item => {
      if (item.quarantined) return false;
      const brandContains = item.brandName.toLowerCase().includes(cleanLower);
      const saltContains = (item.saltComposition || item.genericName || '').toLowerCase().includes(cleanLower);
      const batchContains = item.batchNumber.toLowerCase().includes(cleanLower);
      return brandContains || saltContains || batchContains;
    });

    return partialMatch || null;
  }, [inventory]);

  // Main Handle Recognized Code
  const handleCodeFound = useCallback((code: string) => {
    if (!code) return;
    const now = Date.now();
    const clean = code.trim();

    // Prevent immediate double-scan of the same code within 1.2s
    if (clean === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 1200) {
      return;
    }

    lastScanTimestampRef.current = now;
    lastScannedCodeRef.current = clean;
    setLastScannedCode(clean);

    const matched = matchCodeToInventory(clean);

    if (matched) {
      playBeep();
      setLastScannedItem(matched);
      setScanCount(prev => prev + 1);
      setRecentlyScannedList(prev => [{ item: matched, timestamp: now }, ...prev.slice(0, 5)]);
      setScanFeedbackMsg(`Added: ${matched.brandName} (${matched.strength || 'Standard'})`);

      // Auto add to active POS bill
      onItemScanned(matched);

      // If single scan mode, auto close with small delay
      if (!multiScanMode) {
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } else {
      setLastScannedItem(null);
      setScanFeedbackMsg(`Unmatched Code: "${clean}". Try another barcode or pick below.`);
    }
  }, [matchCodeToInventory, multiScanMode, onItemScanned, onClose, playBeep]);

  // Start Camera with Html5Qrcode
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setCameraLoading(true);

    try {
      // 1. Get available cameras if not yet retrieved
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCamerasList(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` })));
          if (!selectedCameraId) {
            // Pick back/environment camera if available
            const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        }
      } catch (camErr) {
        // Fallback to constraints
      }

      const readerDiv = document.getElementById('camera-reader-element');
      if (!readerDiv) {
        setCameraLoading(false);
        return;
      }

      // Stop previous instance if running
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (e) {
          // cleanup
        }
      }

      const html5QrCode = new Html5Qrcode('camera-reader-element', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });

      html5QrCodeRef.current = html5QrCode;

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: cameraFacing };

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const width = Math.floor(minDim * 0.85);
          const height = Math.floor(minDim * 0.55);
          return { width: Math.max(220, width), height: Math.max(140, height) };
        },
        aspectRatio: 1.333
      };

      await html5QrCode.start(
        cameraConfig,
        qrConfig,
        (decodedText) => {
          handleCodeFound(decodedText);
        },
        () => {
          // scan frame not containing barcode (no-op)
        }
      );

      setCameraLoading(false);

      // Check torch capabilities
      try {
        const streamTracks = (html5QrCode as any)?.getRunningTrack?.() || null;
        if (streamTracks) {
          const caps = streamTracks.getCapabilities ? streamTracks.getCapabilities() : {};
          setHasTorchCapability(Boolean(caps.torch));
        }
      } catch (e) {
        // torch check
      }
    } catch (err: any) {
      console.warn('Html5Qrcode start error:', err);
      // Try Direct Canvas fallback if Html5Qrcode fails
      startDirectCanvasFallback();
    }
  }, [cameraFacing, selectedCameraId, handleCodeFound]);

  // Fallback: Direct Video + Canvas + jsQR + BarcodeDetector
  const startDirectCanvasFallback = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not available on this browser/environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoElemRef.current) {
        videoElemRef.current.srcObject = mediaStream;
        videoElemRef.current.play().catch(() => {});
      }
      setCameraLoading(false);

      // Check BarcodeDetector API
      let barcodeDetector: any = null;
      if ('BarcodeDetector' in window) {
        try {
          barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix']
          });
        } catch (e) {
          barcodeDetector = null;
        }
      }

      // Continuous loop
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(async () => {
        if (!videoElemRef.current || videoElemRef.current.readyState !== videoElemRef.current.HAVE_ENOUGH_DATA) {
          return;
        }

        // 1. Try BarcodeDetector
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(videoElemRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleCodeFound(barcodes[0].rawValue);
              return;
            }
          } catch (e) {
            // detection error
          }
        }

        // 2. Try jsQR on Canvas
        if (canvasElemRef.current && videoElemRef.current) {
          const canvas = canvasElemRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = videoElemRef.current.videoWidth || 640;
            canvas.height = videoElemRef.current.videoHeight || 480;
            ctx.drawImage(videoElemRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              handleCodeFound(code.data);
            }
          }
        }
      }, 250);

    } catch (err: any) {
      console.error('Camera fallback error:', err);
      setCameraError(err.message || 'Unable to access device camera. Please check camera permissions in browser settings.');
      setCameraLoading(false);
    }
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    try {
      if (html5QrCodeRef.current) {
        const nextState = !torchOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState } as any]
        });
        setTorchOn(nextState);
      }
    } catch (e) {
      setTorchOn(!torchOn);
    }
  };

  // Toggle Facing (Front vs Back)
  const handleToggleFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedCameraId('');
  };

  // Process Uploaded Image File (Barcode or QR code image)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingImage(true);
    setScanFeedbackMsg(null);

    try {
      // 1. Try Html5Qrcode file scan
      if (html5QrCodeRef.current) {
        try {
          const result = await html5QrCodeRef.current.scanFile(file, true);
          if (result) {
            handleCodeFound(result);
            setIsProcessingImage(false);
            return;
          }
        } catch (e) {
          // fallback to canvas/jsQR
        }
      }

      // 2. Fallback: decode via image element + jsQR
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imgData.data, imgData.width, imgData.height);
            if (qrCode && qrCode.data) {
              handleCodeFound(qrCode.data);
            } else {
              setScanFeedbackMsg('No barcode or QR code detected in this image. Try another photo.');
            }
          }
          setIsProcessingImage(false);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setScanFeedbackMsg('Failed to process image file.');
      setIsProcessingImage(false);
    }
  };

  // Manual / USB Gun input submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeFound(manualCode.trim());
    setManualCode('');
    manualInputRef.current?.focus();
  };

  // Lifecycle control
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        const timer = setTimeout(() => {
          startScanner();
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      // Cleanup scanner
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
          html5QrCodeRef.current.clear();
        } catch (e) {
          // ignore
        }
        html5QrCodeRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      setLastScannedCode(null);
      setLastScannedItem(null);
      setScanCount(0);
      setScanFeedbackMsg(null);
      setTorchOn(false);
    }
  }, [isOpen, activeTab, cameraFacing, selectedCameraId, startScanner]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
          html5QrCodeRef.current.clear();
        } catch (e) {
          // ignore
        }
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in">
      <div 
        id="camera-barcode-scanner-modal"
        className="relative bg-slate-900 text-white rounded-3xl w-full max-w-xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col max-h-[96vh]"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white truncate">
                  Camera Barcode &amp; QR Scanner
                </h3>
                {scanCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 text-xs font-mono font-bold shrink-0">
                    +{scanCount} Added to Bill
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Point camera at Medicine Barcode, EAN-13, NDC or 2D QR Code
              </p>
            </div>
          </div>

          {/* Header Controls: Sound & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled 
                  ? 'bg-teal-950/60 text-teal-300 border-teal-700/60' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={soundEnabled ? 'Mute Checkout Beep' : 'Enable Checkout Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Scanner (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Camera Live, Upload Image, Manual USB Gun) */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'camera'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Camera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                setTimeout(() => manualInputRef.current?.focus(), 100);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'manual'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Manual / USB Gun</span>
            </button>
          </div>

          {/* Continuous Multi-Scan Mode Switch */}
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 cursor-pointer select-none shrink-0 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <input
              type="checkbox"
              checked={multiScanMode}
              onChange={(e) => setMultiScanMode(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-teal-500 cursor-pointer"
            />
            <span>Multi-Scan Mode</span>
          </label>
        </div>

        {/* VIEW BODY BASED ON TAB */}
        <div className="flex-1 overflow-y-auto">
          
          {/* TAB 1: LIVE CAMERA SCANNER */}
          {activeTab === 'camera' && (
            <div className="relative bg-black flex flex-col items-center justify-center min-h-[290px] sm:min-h-[340px] overflow-hidden">
              
              {/* Html5Qrcode Render Mount Point */}
              <div 
                id="camera-reader-element" 
                className="w-full h-full max-w-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />

              {/* Direct Video and Canvas Elements for Fallback */}
              <video
                ref={videoElemRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${html5QrCodeRef.current ? 'hidden' : 'block'}`}
              />
              <canvas ref={canvasElemRef} className="hidden" />

              {/* Optical Scanning Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                
                {/* Rectangular Viewfinder Box */}
                <div className="relative w-64 sm:w-80 h-44 sm:h-52 rounded-2xl border-2 border-teal-400/80 bg-teal-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
                  
                  {/* Corner Reticles */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-teal-300" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-teal-300" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-teal-300" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-teal-300" />

                  {/* Laser Scanning Animation Line */}
                  <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_10px_#2dd4bf] animate-[scan_2s_ease-in-out_infinite]" />

                  {/* Center Guide Icon */}
                  <div className="flex flex-col items-center gap-1 opacity-70">
                    <Barcode className="w-8 h-8 text-teal-300 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-teal-300 uppercase">
                      Align Barcode Here
                    </span>
                  </div>
                </div>

                {/* Subtext info under viewfinder */}
                <p className="mt-3 text-xs text-slate-300 font-medium bg-black/70 px-3 py-1 rounded-full border border-white/10 shadow-md">
                  Hold camera 10–15 cm from medicine package barcode
                </p>
              </div>

              {/* Floating Camera Actions (Torch & Flip) */}
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`p-2.5 sm:p-3 rounded-2xl border backdrop-blur-md transition-all cursor-pointer ${
                    torchOn 
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30 font-bold' 
                      : 'bg-black/65 text-white border-white/20 hover:bg-black/85'
                  }`}
                  title="Toggle Flashlight / Torch"
                >
                  <Flashlight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleFacing}
                  className="p-2.5 sm:p-3 rounded-2xl bg-black/65 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                  title="Flip Front / Back Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Success Recognition Banner Popover */}
              {lastScannedItem && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-emerald-600/95 text-white px-4 py-2 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200 max-w-[90%]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-200">
                      ✓ Scanned &amp; Added to Bill
                    </div>
                    <div className="text-xs sm:text-sm font-black truncate">
                      {lastScannedItem.brandName} • ₹{lastScannedItem.mrp.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-100 font-mono">
                      Batch: {lastScannedItem.batchNumber} | Loc: {lastScannedItem.locationShelf || lastScannedItem.rackNumber}
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Error / Permission Notice */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-base">Camera Permission Notice</h4>
                  <p className="text-xs text-slate-300 max-w-sm">
                    {cameraError}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => startScanner()}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Use Manual Input
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE / PHOTO SCAN */}
          {activeTab === 'upload' && (
            <div className="p-6 text-center space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-3xl p-8 bg-slate-850/60 hover:bg-slate-800/80 transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    Click to select or drop medicine barcode image
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PNG, JPG, WEBP photos containing 1D Barcodes or QR Codes
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs"
                >
                  Choose Image File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </div>

              {isProcessingImage && (
                <div className="flex items-center justify-center gap-2 text-teal-400 text-xs font-bold py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Decoding barcode from photo...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL INPUT & HARDWARE USB SCANNER */}
          {activeTab === 'manual' && (
            <div className="p-6 space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Scan Barcode with Handheld USB Gun or Enter Code / Batch No:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. DL-8821, MED-1, 8901234567890..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    Add to Bill
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feedback message banner if any */}
          {scanFeedbackMsg && (
            <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-300 flex items-center justify-between">
              <span className="truncate">{scanFeedbackMsg}</span>
              <button 
                onClick={() => setScanFeedbackMsg(null)}
                className="text-slate-400 hover:text-white text-[11px] underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1-Click Fast Barcode Simulation Pills (Critical for instant sandbox testing) */}
          <div className="p-4 bg-slate-850 border-t border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                1-Click Test Barcode Simulator:
              </span>
              <span className="text-[11px] text-slate-400">
                Tap to simulate instant camera scan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {inventory.slice(0, 8).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCodeFound(item.batchNumber || item.ndc || item.brandName)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-teal-500/80 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="text-[10px] font-mono text-teal-400 font-bold truncate flex items-center justify-between">
                    <span>{item.batchNumber || item.id}</span>
                    <span className="text-[9px] text-slate-400">{item.stockQuantity} in stock</span>
                  </div>
                  <div className="text-xs font-bold text-white truncate group-hover:text-teal-300 mt-0.5">
                    {item.brandName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center justify-between mt-0.5">
                    <span>₹{item.mrp.toFixed(2)}</span>
                    <span className="text-[9px] text-emerald-400 font-mono">
                      {item.locationShelf || item.rackNumber}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recently Scanned Items In This Session */}
          {recentlyScannedList.length > 0 && (
            <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Recently Added to Bill ({recentlyScannedList.length}):
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentlyScannedList.map((entry, idx) => (
                  <div 
                    key={idx}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-white">{entry.item.brandName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">₹{entry.item.mrp.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Bar: Done & Return to Bill Button */}
        <div className="px-4 py-3 bg-slate-850 border-t border-slate-700/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-medium">
            Active Cart: <strong className="text-teal-400 font-bold">{scanCount} item(s) scanned</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-teal-600/20 flex items-center gap-1.5 active:scale-95"
          >
            <span>Done &amp; Return to Bill</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
