import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorBody {
  error?: string;
  errors?: Record<string, string[]>;
}

export function readApiFieldErrors(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const body = error.error as ApiErrorBody | null;
  if (!body?.errors || typeof body.errors !== 'object') {
    return null;
  }

  return body.errors;
}

export function readApiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorBody | null;
    if (body?.error) {
      return body.error;
    }
  }

  return 'Request failed';
}
