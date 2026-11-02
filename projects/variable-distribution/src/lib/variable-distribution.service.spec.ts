import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { DYANA_API_BASE_URL } from './tokens/dyana-api-base-url.token';
import { VariableDistributionService } from './variable-distribution.service';

describe('VariableDistributionService', () => {
  let service: VariableDistributionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DYANA_API_BASE_URL, useValue: 'http://test.local/api/' },
      ],
    });

    service = TestBed.inject(VariableDistributionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts to the existing DyAna endpoint without changing the contract', () => {
    service
      .getSummary({
        dataset_identifier: 'demo',
        variable_name: 'edad',
        variable_info: { variable_type: 'continuous' },
        plot_options: { plot_type: 'kde', hist_bins: 30 },
      })
      .subscribe();

    const request = http.expectOne('http://test.local/api/get-variable-summary');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      dataset_identifier: 'demo',
      variable_name: 'edad',
      variable_info: { variable_type: 'continuous' },
      plot_options: { plot_type: 'kde', hist_bins: 30 },
    });

    request.flush({
      plot_type: 'kde',
      plot_data: { x: [0, 1], y: [0, 1] },
    });
  });

  it('uses a same-origin path when the base URL is empty', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DYANA_API_BASE_URL, useValue: '' },
      ],
    });

    const sameOrigin = TestBed.inject(VariableDistributionService);
    sameOrigin
      .getSummary({
        dataset_identifier: 'demo',
        variable_name: 'edad',
        variable_info: { variable_type: 'continuous' },
        plot_options: { plot_type: 'histogram', hist_bins: 10 },
      })
      .subscribe();

    http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/get-variable-summary');
    expect(request.request.method).toBe('POST');
    request.flush({
      plot_type: 'histogram',
      plot_data: { labels: [0, 1], values: [1] },
    });
  });
});
