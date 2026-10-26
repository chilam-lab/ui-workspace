import { InjectionToken } from '@angular/core';

/**
 * Base URL of the DyAna FastAPI backend.
 *
 * The legacy app uses `backendUrl + apiBasePath` (default `/api`). Hosts can
 * provide an absolute URL during development, e.g. `http://localhost:8888/api`,
 * or leave the default for a same-origin nginx proxy.
 */
export const DYANA_API_BASE_URL = new InjectionToken<string>('DYANA_API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
