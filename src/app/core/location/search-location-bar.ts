import { Component, OnDestroy, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';

import { AddressesApiService } from '../api/addresses-api.service';
import { AddressSuggestion } from '../api/address.models';
import {
  DEFAULT_SEARCH_RADIUS_KM,
  SEARCH_RADIUS_OPTIONS,
  SearchRadiusKm,
} from './search-location.models';
import { SearchLocationService } from './search-location.service';

@Component({
  selector: 'app-search-location-bar',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './search-location-bar.html',
  styleUrl: './search-location-bar.css',
})
export class SearchLocationBar implements OnDestroy {
  readonly variant = input<'hero' | 'compact'>('hero');
  readonly locationChanged = output<void>();

  protected readonly searchLocation = inject(SearchLocationService);
  private readonly addressesApi = inject(AddressesApiService);
  private readonly translate = inject(TranslateService);

  protected readonly suggestions = signal<AddressSuggestion[]>([]);
  protected readonly autocompleteLoading = signal(false);
  protected readonly radiusOptions = SEARCH_RADIUS_OPTIONS;
  protected readonly defaultRadius = DEFAULT_SEARCH_RADIUS_KM;

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private autocompleteSub: Subscription | null = null;

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.autocompleteSub?.unsubscribe();
  }

  protected onAddressInput(value: string): void {
    this.searchLocation.addressQuery.set(value);
    this.searchLocation.gpsError.set(false);

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    const query = value.trim();
    if (query.length < 3) {
      this.suggestions.set([]);
      this.autocompleteLoading.set(false);
      return;
    }

    this.autocompleteLoading.set(true);
    this.searchDebounce = setTimeout(() => {
      void this.runAutocomplete(query);
    }, 300);
  }

  protected selectSuggestion(suggestion: AddressSuggestion): void {
    if (suggestion.lat == null || suggestion.lng == null) {
      return;
    }
    this.searchLocation.setOriginFromSuggestion(suggestion, suggestion.formatted);
    this.suggestions.set([]);
    this.locationChanged.emit();
  }

  protected onRadiusChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const value: SearchRadiusKm = raw === 'none' ? null : (Number(raw) as SearchRadiusKm);
    this.searchLocation.setRadiusKm(value);
    this.locationChanged.emit();
  }

  protected requestGps(): void {
    if (!navigator.geolocation) {
      this.searchLocation.gpsError.set(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gpsLabel = this.translate.instant('SEARCH_LOCATION.GPS_LABEL');
        this.searchLocation.setOriginFromGps(
          position.coords.latitude,
          position.coords.longitude,
          gpsLabel,
        );
        this.suggestions.set([]);
        this.locationChanged.emit();
      },
      () => {
        this.searchLocation.gpsError.set(true);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  protected clearLocation(): void {
    this.searchLocation.clearOrigin();
    this.suggestions.set([]);
    this.locationChanged.emit();
  }

  protected radiusSelectValue(): string {
    const radius = this.searchLocation.radiusKm();
    return radius === null ? 'none' : String(radius);
  }

  private async runAutocomplete(query: string): Promise<void> {
    this.autocompleteSub?.unsubscribe();
    try {
      const response = await firstValueFrom(this.addressesApi.autocomplete(query));
      this.suggestions.set(response.addresses ?? []);
    } catch {
      this.suggestions.set([]);
    } finally {
      this.autocompleteLoading.set(false);
    }
  }
}
