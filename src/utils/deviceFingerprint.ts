// Unique Browser & Device Fingerprint Generator for Multi-Device Session Control

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  screenResolution: string;
  fingerprintHash: string;
}

const FP_STORAGE_KEY = 'pharmpulse_device_fingerprint_v2';

export function getDeviceFingerprint(): DeviceInfo {
  // Check if we already stored a unique persistent fingerprint for this browser instance
  let storedDeviceId = localStorage.getItem(FP_STORAGE_KEY);
  if (!storedDeviceId) {
    storedDeviceId = 'fp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(FP_STORAGE_KEY, storedDeviceId);
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  
  // Detect OS
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(userAgent)) os = 'Windows 11/10';
  else if (/Windows/i.test(userAgent)) os = 'Windows PC';
  else if (/iPhone/i.test(userAgent)) os = 'iOS (iPhone)';
  else if (/iPad/i.test(userAgent)) os = 'iPadOS';
  else if (/Android/i.test(userAgent)) os = 'Android OS';
  else if (/Macintosh|Mac OS X/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux OS';

  // Detect Browser
  let browser = 'Chrome';
  if (/Edg\//i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) browser = 'Google Chrome';
  else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/Opera|OPR\//i.test(userAgent)) browser = 'Opera Browser';

  // Detect Device Form Factor
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/iPad|Tablet/i.test(userAgent) || (typeof window !== 'undefined' && window.innerWidth >= 600 && window.innerWidth <= 1024)) {
    deviceType = 'tablet';
  } else if (/Mobi|Android|iPhone/i.test(userAgent) || (typeof window !== 'undefined' && window.innerWidth < 600)) {
    deviceType = 'mobile';
  }

  const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
  
  // Friendly default name
  const deviceName = `${deviceType === 'desktop' ? 'Counter POS PC' : (deviceType === 'tablet' ? 'Dispensary Tablet' : 'Mobile POS')} (${browser} on ${os})`;

  return {
    deviceId: storedDeviceId,
    deviceName,
    deviceType,
    browser,
    os,
    screenResolution,
    fingerprintHash: `${storedDeviceId.substring(0, 8)}...`
  };
}
