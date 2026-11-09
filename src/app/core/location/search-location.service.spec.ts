import { TestBed } from '@angular/core/testing';

import { GPS_QUERY_NEAR } from './search-location.models';
import { SearchLocationService } from './search-location.service';

describe('SearchLocationService', () => {
  let service: SearchLocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchLocationService);
    service.clearOrigin();
    service.setRadiusKm(10);
  });

  it('toQueryParams clears location keys when origin is cleared', () => {
    service.setOriginFromGps(-34.9, -57.95, 'Tu ubicación');

    expect(service.toQueryParams()).toMatchObject({
      lat: '-34.9',
      lng: '-57.95',
      near: GPS_QUERY_NEAR,
      source: 'gps',
      radiusKm: '10',
    });

    service.clearOrigin();

    expect(service.toQueryParams()).toEqual({
      lat: null,
      lng: null,
      near: null,
      source: null,
      radiusKm: '10',
    });
  });
});
