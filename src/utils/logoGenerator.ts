/**
 * Utilities for Pharmacy Store Logo Management, AI Vector Generation,
 * Image Optimization, and Canvas PNG Conversion.
 */

export interface LogoGenerationOptions {
  storeName: string;
  tagline?: string;
  style: 'modern-clinical' | 'herbal-ayurvedic' | 'heritage-apothecary' | 'biotech-pulse' | 'minimal-cross' | 'warm-community' | 'custom';
  palette: 'teal-emerald' | 'blue-cyan' | 'sage-amber' | 'indigo-gold' | 'crimson-rose' | 'dark-slate';
  symbol: 'caduceus' | 'mortar-pestle' | 'medical-cross' | 'capsule-leaf' | 'heartbeat-pulse' | 'shield-rx' | 'custom';
  customPrompt?: string;
}

export interface PresetLogoTemplate {
  id: string;
  name: string;
  description: string;
  style: string;
  paletteName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  svg: (storeName: string, tagline?: string) => string;
}

// Color Palettes
export const LOGO_PALETTES = {
  'teal-emerald': {
    name: 'Teal & Emerald Health',
    primary: '#0d9488',
    secondary: '#10b981',
    accent: '#042f2e',
    light: '#f0fdfa',
    gradient: ['#0d9488', '#059669']
  },
  'blue-cyan': {
    name: 'Royal Blue & Cyan Tech',
    primary: '#2563eb',
    secondary: '#06b6d4',
    accent: '#1e3a8a',
    light: '#eff6ff',
    gradient: ['#2563eb', '#0284c7']
  },
  'sage-amber': {
    name: 'Sage Green & Herbal Amber',
    primary: '#059669',
    secondary: '#d97706',
    accent: '#064e3b',
    light: '#ecfdf5',
    gradient: ['#059669', '#b45309']
  },
  'indigo-gold': {
    name: 'Imperial Indigo & Gold Seal',
    primary: '#4f46e5',
    secondary: '#eab308',
    accent: '#312e81',
    light: '#eef2ff',
    gradient: ['#4338ca', '#ca8a04']
  },
  'crimson-rose': {
    name: 'Crimson Cross & Care Rose',
    primary: '#e11d48',
    secondary: '#f43f5e',
    accent: '#881337',
    light: '#fff1f2',
    gradient: ['#e11d48', '#be123c']
  },
  'dark-slate': {
    name: 'Obsidian Slate & Platinum',
    primary: '#334155',
    secondary: '#0ea5e9',
    accent: '#0f172a',
    light: '#f8fafc',
    gradient: ['#1e293b', '#475569']
  }
};

/**
 * Escapes XML strings for safe SVG embedding
 */
function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Extracts clean initials from a store name
 */
export function getStoreInitials(name: string): string {
  if (!name) return 'PH';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generates an SVG vector emblem
 */
export function generateParametricSvgLogo(options: LogoGenerationOptions): string {
  const { storeName = 'Apex Medicos', tagline = 'Trusted Pharmacy & Healthcare', palette = 'teal-emerald', symbol = 'shield-rx' } = options;
  const colors = LOGO_PALETTES[palette] || LOGO_PALETTES['teal-emerald'];
  const safeName = escapeXml(storeName.toUpperCase());
  const safeTagline = escapeXml(tagline);
  const initials = getStoreInitials(storeName);

  let symbolMarkup = '';

  switch (symbol) {
    case 'caduceus':
      symbolMarkup = `
        <g transform="translate(250, 190) scale(1.1)">
          <!-- Wings -->
          <path d="M-60,-20 C-40,-50 -10,-45 0,-25 C10,-45 40,-50 60,-20 C45,-15 30,-22 0,-15 C-30,-22 -45,-15 -60,-20 Z" fill="url(#brandGrad)" />
          <!-- Staff -->
          <line x1="0" y1="-45" x2="0" y2="70" stroke="url(#brandGrad)" stroke-width="6" stroke-linecap="round" />
          <circle cx="0" cy="-45" r="7" fill="${colors.secondary}" />
          <!-- Serpents -->
          <path d="M-25,45 C-5,35 15,25 0,10 C-15,-5 5,-15 25,-25" fill="none" stroke="${colors.secondary}" stroke-width="4.5" stroke-linecap="round" />
          <path d="M25,45 C5,35 -15,25 0,10 C15,-5 -5,-15 -25,-25" fill="none" stroke="${colors.secondary}" stroke-width="4.5" stroke-linecap="round" opacity="0.8" />
        </g>
      `;
      break;

    case 'mortar-pestle':
      symbolMarkup = `
        <g transform="translate(250, 190)">
          <!-- Mortar Bowl -->
          <path d="M-55,-5 C-50,45 50,45 55,-5 C40,-10 -40,-10 -55,-5 Z" fill="url(#brandGrad)" />
          <!-- Mortar Rim -->
          <ellipse cx="0" cy="-6" rx="55" ry="12" fill="${colors.secondary}" opacity="0.9" />
          <!-- Pestle -->
          <path d="M-20,-48 C-15,-52 -5,-48 -2,-40 L28,5 C32,12 25,18 18,15 L-12,-30 C-18,-38 -25,-44 -20,-48 Z" fill="${colors.accent}" opacity="0.95" />
          <circle cx="-16" cy="-44" r="5" fill="#ffffff" />
          <!-- Medical Cross on Mortar -->
          <path d="M-6,14 H6 V26 H-6 Z M-12,17 H12 V23 H-12 Z" fill="#ffffff" />
        </g>
      `;
      break;

    case 'medical-cross':
      symbolMarkup = `
        <g transform="translate(250, 185)">
          <!-- Bold Hexagonal Shield -->
          <polygon points="0,-75 65,-35 65,35 0,75 -65,35 -65,-35" fill="url(#brandGrad)" />
          <!-- Inner Glow Outline -->
          <polygon points="0,-68 58,-31 58,31 0,68 -58,31 -58,-31" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.4" />
          <!-- Medical Cross -->
          <path d="M-14,-32 H14 V-14 H32 V14 H14 V32 H-14 V14 H-32 V-14 H-14 Z" fill="#ffffff" />
          <circle cx="0" cy="0" r="6" fill="${colors.primary}" />
        </g>
      `;
      break;

    case 'capsule-leaf':
      symbolMarkup = `
        <g transform="translate(250, 185)">
          <!-- Capsule Left / Top -->
          <path d="M-30,-20 C-45,-35 -30,-55 -15,-40 L15,-10 C30,5 15,25 0,10 Z" fill="url(#brandGrad)" />
          <!-- Capsule Right / Bottom -->
          <path d="M15,-10 L-15,-40 C-5,-50 15,-45 25,-35 L40,-20 C55,-5 40,15 25,25 L15,-10 Z" fill="${colors.secondary}" />
          <!-- Eco Leaf Stem -->
          <path d="M-40,40 Q-10,35 15,10 Q0,-5 -25,-5 Q-45,10 -40,40 Z" fill="${colors.secondary}" opacity="0.9" />
          <path d="M-38,38 Q-15,20 15,10" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        </g>
      `;
      break;

    case 'heartbeat-pulse':
      symbolMarkup = `
        <g transform="translate(250, 185)">
          <!-- Heart Shape Background -->
          <path d="M0,50 C-70,0 -80,-50 -35,-55 C-10,-58 0,-30 0,-30 C0,-30 10,-58 35,-55 C80,-50 70,0 0,50 Z" fill="url(#brandGrad)" />
          <!-- ECG Pulse Line -->
          <polyline points="-55,-2 -25,-2 -15,-22 0,22 12,-15 22,-2 55,-2" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
      break;

    case 'shield-rx':
    default:
      symbolMarkup = `
        <g transform="translate(250, 185)">
          <!-- Modern Shield -->
          <path d="M0,-70 C45,-65 65,-45 65,0 C65,50 35,70 0,85 C-35,70 -65,50 -65,0 C-65,-45 -45,-65 0,-70 Z" fill="url(#brandGrad)" />
          <!-- Inner Shield Border -->
          <path d="M0,-62 C38,-58 56,-40 56,0 C56,42 30,60 0,73 C-30,60 -56,42 -56,0 C-56,-40 -38,-58 0,-62 Z" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.4" />
          <!-- Rx Symbol -->
          <text x="-16" y="24" font-family="'Helvetica Neue', Arial, sans-serif" font-size="52" font-weight="900" fill="#ffffff" text-anchor="middle">℞</text>
          <!-- Cross Badge -->
          <path d="M12,-8 H24 V-16 H30 V-8 H42 V-2 H30 V6 H24 V-2 H12 Z" fill="${colors.secondary}" />
        </g>
      `;
      break;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.gradient[0]}" />
      <stop offset="100%" stop-color="${colors.gradient[1]}" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.secondary}" />
      <stop offset="100%" stop-color="${colors.primary}" />
    </linearGradient>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Clean Circular Background Badge -->
  <circle cx="250" cy="250" r="235" fill="${colors.light}" stroke="#e2e8f0" stroke-width="2" />
  
  <!-- Outer Accent Rings -->
  <circle cx="250" cy="250" r="225" fill="none" stroke="url(#ringGrad)" stroke-width="4" stroke-dasharray="14 6" opacity="0.85" />
  <circle cx="250" cy="250" r="215" fill="none" stroke="${colors.primary}" stroke-width="1.5" opacity="0.3" />

  <!-- Central Symbol -->
  <g filter="url(#subtleShadow)">
    ${symbolMarkup}
  </g>

  <!-- Store Name Banner -->
  <g transform="translate(250, 360)">
    <!-- Pill Backdrop for Name -->
    <rect x="-190" y="-24" width="380" height="48" rx="24" fill="${colors.accent}" opacity="0.95" />
    <text x="0" y="7" font-family="'Helvetica Neue', -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
      ${safeName}
    </text>
  </g>

  <!-- Tagline / Slogan Subtext -->
  <g transform="translate(250, 420)">
    <text x="0" y="0" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" fill="${colors.primary}" text-anchor="middle" letter-spacing="2">
      ${safeTagline.toUpperCase()}
    </text>
    <!-- Medical Cross Mini Dots -->
    <circle cx="-140" cy="-4" r="3" fill="${colors.secondary}" />
    <circle cx="140" cy="-4" r="3" fill="${colors.secondary}" />
  </g>

  <!-- Top Pharmacy Verified Seal Arc -->
  <g transform="translate(250, 68)">
    <text x="0" y="0" font-family="'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="800" fill="${colors.primary}" text-anchor="middle" letter-spacing="3.5">
      ★ CERTIFIED DISPENSARY & PHARMACY ★
    </text>
  </g>
</svg>
  `.trim();
}

/**
 * Pre-crafted high-fidelity ready-to-use pharmaceutical emblems
 */
export const PRESET_PHARMACY_LOGOS: PresetLogoTemplate[] = [
  {
    id: 'apex-caduceus',
    name: 'Apex Caduceus Shield',
    description: 'Modern clinical teal shield with gold wings and twin serpents',
    style: 'modern-clinical',
    paletteName: 'teal-emerald',
    primaryColor: '#0d9488',
    secondaryColor: '#10b981',
    accentColor: '#042f2e',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Trusted 24x7 Retail & Clinical Care',
      style: 'modern-clinical',
      palette: 'teal-emerald',
      symbol: 'caduceus'
    })
  },
  {
    id: 'nova-pulse-cross',
    name: 'Nova BioPulse Cross',
    description: 'High-tech royal blue hex shield with vital ECG pulse line',
    style: 'biotech-pulse',
    paletteName: 'blue-cyan',
    primaryColor: '#2563eb',
    secondaryColor: '#06b6d4',
    accentColor: '#1e3a8a',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Precision Healthcare & Dispensary',
      style: 'biotech-pulse',
      palette: 'blue-cyan',
      symbol: 'heartbeat-pulse'
    })
  },
  {
    id: 'greenleaf-ayurveda',
    name: 'GreenLeaf Herb & Mortar',
    description: 'Organic emerald green mortar with healing botanicals',
    style: 'herbal-ayurvedic',
    paletteName: 'sage-amber',
    primaryColor: '#059669',
    secondaryColor: '#d97706',
    accentColor: '#064e3b',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Pure Ayurveda & Modern Generics',
      style: 'herbal-ayurvedic',
      palette: 'sage-amber',
      symbol: 'mortar-pestle'
    })
  },
  {
    id: 'apothecary-crest',
    name: 'Imperial Rx Apothecary',
    description: 'Prestigious royal indigo seal with Latin Rx typography',
    style: 'heritage-apothecary',
    paletteName: 'indigo-gold',
    primaryColor: '#4f46e5',
    secondaryColor: '#eab308',
    accentColor: '#312e81',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Compounding & Family Chemists',
      style: 'heritage-apothecary',
      palette: 'indigo-gold',
      symbol: 'shield-rx'
    })
  },
  {
    id: 'care-rose-cross',
    name: 'RedCross LifeCare',
    description: 'Friendly crimson red medical cross with emergency care badge',
    style: 'warm-community',
    paletteName: 'crimson-rose',
    primaryColor: '#e11d48',
    secondaryColor: '#f43f5e',
    accentColor: '#881337',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Caring for Your Family Everyday',
      style: 'warm-community',
      palette: 'crimson-rose',
      symbol: 'medical-cross'
    })
  },
  {
    id: 'purelife-capsule',
    name: 'PureLife Eco Capsule',
    description: 'Minimalist dual-tone pharma capsule with green leaf accent',
    style: 'modern-clinical',
    paletteName: 'teal-emerald',
    primaryColor: '#0d9488',
    secondaryColor: '#10b981',
    accentColor: '#042f2e',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Authentic Medicines & Wellness',
      style: 'modern-clinical',
      palette: 'teal-emerald',
      symbol: 'capsule-leaf'
    })
  },
  {
    id: 'obsidian-clinic',
    name: 'Obsidian Platinum Seal',
    description: 'Ultra-sleek dark slate emblem with silver & cyan accents',
    style: 'modern-clinical',
    paletteName: 'dark-slate',
    primaryColor: '#334155',
    secondaryColor: '#0ea5e9',
    accentColor: '#0f172a',
    svg: (storeName, tagline) => generateParametricSvgLogo({
      storeName,
      tagline: tagline || 'Super-Specialty Pharmacy Hub',
      style: 'modern-clinical',
      palette: 'dark-slate',
      symbol: 'shield-rx'
    })
  }
];

/**
 * Converts any SVG string or SVG data URL to a high-resolution Base64 PNG Data URL
 * using an off-screen HTML5 canvas. This guarantees 100% compatibility with jsPDF,
 * thermal printer spoolers, and responsive images.
 */
export async function convertSvgToPngDataUrl(
  svgStringOrDataUrl: string,
  width = 500,
  height = 500
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      let src = svgStringOrDataUrl;
      if (!src.startsWith('data:image/')) {
        // Encode raw SVG string to base64 Data URL
        const encoded = encodeURIComponent(svgStringOrDataUrl)
          .replace(/'/g, '%27')
          .replace(/"/g, '%22');
        src = `data:image/svg+xml;charset=utf-8,${encoded}`;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          // Render clean transparent or solid canvas
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const pngDataUrl = canvas.toDataURL('image/png', 0.95);
          resolve(pngDataUrl);
        } catch (err) {
          console.warn('Canvas conversion fallback:', err);
          resolve(src);
        }
      };

      img.onerror = (err) => {
        console.warn('SVG image load error:', err);
        resolve(svgStringOrDataUrl);
      };

      img.src = src;
    } catch (e) {
      console.warn('convertSvgToPngDataUrl failed:', e);
      resolve(svgStringOrDataUrl);
    }
  });
}

/**
 * Reads an uploaded file, scales it down to max 600x600, and returns a clean PNG/JPEG data URL
 */
export async function processUploadedLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload a valid image file (PNG, JPG, SVG, WebP).'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('File size exceeds 5MB limit. Please upload a smaller image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Failed to read image file.'));
        return;
      }

      // If SVG, convert directly to crisp PNG Data URL
      if (file.type === 'image/svg+xml') {
        convertSvgToPngDataUrl(rawDataUrl, 500, 500)
          .then(resolve)
          .catch(() => resolve(rawDataUrl));
        return;
      }

      // For standard raster images (PNG, JPEG, WebP)
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 600;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92);
          resolve(optimizedDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image file preview.'));
      img.src = rawDataUrl;
    };

    reader.onerror = () => reject(new Error('Error reading uploaded image.'));
    reader.readAsDataURL(file);
  });
}
