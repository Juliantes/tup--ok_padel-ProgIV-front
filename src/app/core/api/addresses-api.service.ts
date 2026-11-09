import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import { AddressAutocompleteResponse } from './address.models';

@Injectable({
  providedIn: 'root',
})
export class AddressesApiService {
  private readonly http = inject(HttpClient);

  autocomplete(query: string): Observable<AddressAutocompleteResponse> {
    const params = new HttpParams().set('q', query);
    return this.http.get<AddressAutocompleteResponse>(apiV1Url('addresses/autocomplete'), {
      params,
    });
  }
}
