// Backend config. Switchable at runtime via Tweaks screen.

let _baseUrl = 'http://167.172.101.215:3001/api';

export function getBaseUrl(): string {
  return _baseUrl;
}

export function setBaseUrl(url: string) {
  _baseUrl = url.replace(/\/$/, '');
}

// Resolve a server-relative path (e.g. "/uploads/x.jpg") to an absolute URL.
// Uploads are served from the API host root, not under /api.
export function getFileUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const root = _baseUrl.replace(/\/api\/?$/, '');
  const rel = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${root}${rel}`;
}
