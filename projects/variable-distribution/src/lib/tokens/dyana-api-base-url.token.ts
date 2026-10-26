import { InjectionToken } from '@angular/core';

export const DYANA_API_BASE_URL = new InjectionToken<string>('DYANA_API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
