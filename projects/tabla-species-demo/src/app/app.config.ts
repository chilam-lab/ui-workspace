import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http'; // 👈 agregar esta línea
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { API_BASE_URL } from 'taxon-shared';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(withEventReplay()),
    provideHttpClient(), // 👈 agregar este provider
    provideAnimationsAsync(),
    { provide: API_BASE_URL, useValue: 'http://localhost:8087' }
  ]
};
