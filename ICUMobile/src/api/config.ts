// Backend config. Switchable at runtime via Tweaks screen.

let _baseUrl = 'https://138-68-67-206.sslip.io/api';

export function getBaseUrl(): string {
  return _baseUrl;
}

export function setBaseUrl(url: string) {
  _baseUrl = url.replace(/\/$/, '');
}

// Read-only token for file URLs. Files need authentication, and the system
// browser (Linking.openURL) cannot send headers, so the token rides in the URL.
let _fileToken: string | null = null;
export function setFileToken(t: string | null) { _fileToken = t; }

// Resolve a server-relative path (e.g. "/uploads/x.jpg") to an absolute URL.
// Uploads are served from the API host root, not under /api.
export function getFileUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  const root = _baseUrl.replace(/\/api\/?$/, '');
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${root}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  // Only ever attach the token to our own server's URLs.
  if (!_fileToken || !url.startsWith(`${root}/`)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}ft=${encodeURIComponent(_fileToken)}`;
}
