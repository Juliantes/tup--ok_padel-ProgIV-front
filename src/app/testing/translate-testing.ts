import { Provider } from '@angular/core';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';

class TranslateLoaderMock implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

export function provideTranslateTesting(): Provider[] {
  return provideTranslateService({
    lang: 'es',
    loader: {
      provide: TranslateLoader,
      useClass: TranslateLoaderMock,
    },
  });
}
