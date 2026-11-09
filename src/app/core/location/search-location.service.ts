import { Injectable, signal } from '@angular/core';
import { Params } from '@angular/router';

import { AddressSuggestion } from '../api/address.models';
import {
  DEFAULT_SEARCH_RADIUS_KM,
  GPS_QUERY_NEAR,
  SearchOrigin,
  SearchRadiusKm,
} from './search-location.models';

@Injectable({
  providedIn: 'root',
})
export class SearchLocationService {
  readonly origin = signal<SearchOrigin | null>(null);
  readonly radiusKm = signal<SearchRadiusKm>(DEFAULT_SEARCH_RADIUS_KM);
  readonly addressQuery = signal('');
  readonly gpsError = signal(false);

  originIsGps(): boolean {
    return this.origin()?.source === 'gps';
  }

  setRadiusKm(value: SearchRadiusKm): void {
    this.radiusKm.set(value);
  }

  setOriginFromSuggestion(suggestion: AddressSuggestion, formattedLabel: string): void {
    if (suggestion.lat == null || suggestion.lng == null) {
      return;
    }
    this.origin.set({
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: formattedLabel,
      city: suggestion.city ?? null,
      source: 'autocomplete',
    });
    this.addressQuery.set(formattedLabel);
    this.gpsError.set(false);
  }

  setOriginFromGps(lat: number, lng: number, gpsLabel: string): void {
    this.origin.set({
      lat,
      lng,
      label: gpsLabel,
      city: null,
      source: 'gps',
    });
    this.addressQuery.set(gpsLabel);
    this.gpsError.set(false);
  }

  clearOrigin(): void {
    this.origin.set(null);
    this.addressQuery.set('');
    this.gpsError.set(false);
  }

  hydrateFromQueryParams(params: Params): void {
    const lat = parseFloat(params['lat'] ?? '');
    const lng = parseFloat(params['lng'] ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const near = params['near'];
    const radiusRaw = params['radiusKm'];
    if (radiusRaw === 'none' || radiusRaw === '') {
      this.radiusKm.set(null);
    } else if (radiusRaw === '5' || radiusRaw === '10' || radiusRaw === '25') {
      this.radiusKm.set(Number(radiusRaw) as SearchRadiusKm);
    }

    const source: SearchOrigin['source'] =
      near === GPS_QUERY_NEAR || params['source'] === 'gps' ? 'gps' : 'autocomplete';

    const label =
      source === 'gps' ? GPS_QUERY_NEAR : typeof near === 'string' && near.trim() ? near : '';

    this.origin.set({
      lat,
      lng,
      label,
      city: null,
      source,
    });
    this.addressQuery.set(source === 'gps' ? '' : label);
  }

  toQueryParams(overrides: Record<string, string | undefined> = {}): Record<string, string | null> {
    const origin = this.origin();
    const out: Record<string, string | null> = Object.fromEntries(
      Object.entries(overrides).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );

    if (origin) {
      out['lat'] = String(origin.lat);
      out['lng'] = String(origin.lng);
      if (origin.source === 'gps') {
        out['near'] = GPS_QUERY_NEAR;
        out['source'] = 'gps';
      } else if (origin.label) {
        out['near'] = origin.label;
      }
    } else {
      out['lat'] = null;
      out['lng'] = null;
      out['near'] = null;
      out['source'] = null;
    }

    const radius = this.radiusKm();
    out['radiusKm'] = radius === null ? 'none' : String(radius);

    return Object.fromEntries(
      Object.entries(out).filter(([, value]) => value !== undefined),
    ) as Record<string, string | null>;
  }
}
