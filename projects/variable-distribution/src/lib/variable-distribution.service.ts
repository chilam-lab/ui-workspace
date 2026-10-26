import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DYANA_API_BASE_URL } from './tokens/dyana-api-base-url.token';
import { VariableSummaryRequest, VariableSummaryResponse } from './variable-distribution.types';

/**
 * Thin HTTP adapter for the existing DyAna endpoint.
 *
 * The backend is intentionally untouched: this is the same request the legacy
 * `tool-variable-distribution.js` sends through `services.getVariableSummary`.
 */
@Injectable({ providedIn: 'root' })
export class VariableDistributionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(DYANA_API_BASE_URL);

  getSummary(request: VariableSummaryRequest): Observable<VariableSummaryResponse> {
    return this.http.post<VariableSummaryResponse>(
      this.endpoint('/get-variable-summary'),
      request
    );
  }

  private endpoint(path: string): string {
    const base = (this.baseUrl ?? '').replace(/\/+$/, '');
    return base ? `${base}${path}` : path;
  }
}
