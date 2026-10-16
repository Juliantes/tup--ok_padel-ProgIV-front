import { environment } from '../../../environments/environment';

export const API_PLACEHOLDER_PHONE_PATTERN = /^\+549\d{8}$/;

export function apiV1Url(path: string): string {
  const normalizedPath = path.replace(/^\//, '');
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  return `${base}/api/v1/${normalizedPath}`;
}

export function isPlaceholderApiPhone(phone: string | null | undefined): boolean {
  if (!phone) {
    return false;
  }

  return API_PLACEHOLDER_PHONE_PATTERN.test(phone);
}
