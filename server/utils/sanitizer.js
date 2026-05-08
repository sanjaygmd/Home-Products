let rawSanitizeHtml;
try {
  // Use dynamic import with top-level await to gracefully handle if sanitize-html is not yet installed
  const module = await import('sanitize-html');
  rawSanitizeHtml = module.default;
} catch (e) {
  rawSanitizeHtml = null;
}

const sanitizeHtml = rawSanitizeHtml;

/**
 * Basic sanitizer for general text inputs.
 * Strips all HTML tags.
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  if (typeof sanitizeHtml === 'function') {
    try {
      return sanitizeHtml(text, {
        allowedTags: [],
        allowedAttributes: {}
      }).trim();
    } catch (e) {
      console.warn("[SANITIZER] sanitize-html failed, using secure fallback:", e.message);
    }
  }

  // Fallback: Strip all HTML tags securely
  return text
    .replace(/<[^>]*>/g, '') // Strip standard HTML tags
    .replace(/&lt;[^&]*&gt;/g, '') // Strip escaped HTML tags
    .trim();
};

/**
 * Sanitizer for content that might allow some formatting (like descriptions).
 * Allows basic tags like b, i, em, strong, p, br, ul, ol, li.
 */
export const sanitizeDescription = (html) => {
  if (!html || typeof html !== 'string') return html;

  if (typeof sanitizeHtml === 'function') {
    try {
      return sanitizeHtml(html, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {}
      }).trim();
    } catch (e) {
      console.warn("[SANITIZER] sanitize-html failed, using secure fallback:", e.message);
    }
  }

  // Fallback: Strip all unsafe tags, attributes, and scripts entirely
  const allowed = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];
  
  // 1. Remove dangerous script, style, iframe, object, embed blocks and their content completely
  let clean = html.replace(/<(script|iframe|style|object|embed)[^>]*>([\s\S]*?)<\/\1>/gi, '');
  
  // 2. Strip any inline event handlers (e.g., onclick, onerror) and javascript: protocol URIs
  clean = clean.replace(/on\w+\s*=\s*(['\"][^'\"]*['\"]|[^>\s]+)/gi, '');
  clean = clean.replace(/javascript\s*:\s*[^\"\'\s>]+/gi, '');

  // 3. Normalize tags: remove attributes from all tags to prevent style or event payload execution
  clean = clean.replace(/<([a-z1-6]+)(?:\s+[^>]*)?>/gi, (match, tagName) => {
    const lowerName = tagName.toLowerCase();
    if (allowed.includes(lowerName)) {
      return `<${lowerName}>`;
    }
    return ''; // Strip non-allowed tags
  });

  // 4. Ensure closing tags are also stripped if they are not in the allowed list
  clean = clean.replace(/<\/([a-z1-6]+)>/gi, (match, tagName) => {
    const lowerName = tagName.toLowerCase();
    if (allowed.includes(lowerName)) {
      return `</${lowerName}>`;
    }
    return '';
  });

  return clean.trim();
};

/**
 * Validate image URLs to protect against SSRF and Content-Injection.
 * Enforces http/https, blocks private subnet IPs/localhost/link-local, and cleans unsafe characters.
 */
export const isValidImageUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    // Enforce basic character safety to block injection
    if (urlStr.includes('<') || urlStr.includes('>') || urlStr.includes('"') || urlStr.includes("'")) {
      return false;
    }

    const parsed = new URL(urlStr);

    // Enforce allowed protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    const cleanHost = hostname.replace(/^\[|\]$/g, '');

    // Check if hostname is loopback or local hostnames
    const isLoopback = cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '::1';

    // Check for private IPv4 subnets
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x (AWS metadata), 0.0.0.0
    const isPrivateIpv4 = /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0)$/.test(cleanHost);

    // Check for private IPv6 ranges
    const isPrivateIpv6 = cleanHost.startsWith('fe80:') || cleanHost.startsWith('fc00:') || cleanHost.startsWith('fd00:') || cleanHost === '::';

    if (isLoopback || isPrivateIpv4 || isPrivateIpv6) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
};
