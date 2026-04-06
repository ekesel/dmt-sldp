/**
 * Utility to resolve media URLs from backend data.
 * Handles absolute URLs, relative paths, and provides a fallback image.
 * Also handles domain swapping for tenant-specific media subdomains.
 */

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?q=80&w=2070&auto=format&fit=crop";

export const getMediaUrl = (imagePath?: string | null): string => {
  if (!imagePath) return FALLBACK_IMAGE;

  let url = imagePath;

  // Handle absolute URLs (http, https, data:, blob:)
  if (
    imagePath.startsWith("http") || 
    imagePath.startsWith("data:") || 
    imagePath.startsWith("blob:") ||
    imagePath.startsWith("//")
  ) {
    url = imagePath;
  } else {
    // Handle relative paths
    const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").replace(/\/$/, "");
    // Ensure the relative path has a leading slash
    const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    url = `${MEDIA_BASE}${normalizedPath}`;
  }

  // --- Domain Swapping Logic ---
  // If backend returns api.elevate.samta.ai but it should be {tenant}.elevate.samta.ai
  if (typeof window !== 'undefined' && url.includes('api.elevate.samta.ai')) {
    // 1. Try to get tenant from hostname (first part)
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    const devDomains = (process.env.NEXT_PUBLIC_DEV_DOMAINS || "localhost,127.0.0.1").split(',');
    const isLocal = devDomains.includes(parts[0]);
    
    let tenant = null;
    
    if (!isLocal && parts.length > 2) {
      tenant = parts[0];
    } else {
      // 2. Fallback to localStorage for localhost/dev
      tenant = localStorage.getItem('dmt-tenant');
    }
    
    if (tenant) {
      url = url.replace('api.elevate.samta.ai', `${tenant}.elevate.samta.ai`);
    } else {
       // Optional: fallback to a default if absolutely no tenant info is found
       // For now, let's just keep it as is if no tenant is detected
    }
  }

  return url;
};

export const getFallbackImage = () => FALLBACK_IMAGE;
