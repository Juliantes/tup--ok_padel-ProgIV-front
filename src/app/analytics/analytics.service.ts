import { Injectable } from '@angular/core';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  trackButtonClick(buttonName: string, buttonLocation: string): void {
    if (typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('event', 'button_click', {
      button_name: buttonName,
      button_location: buttonLocation,
    });
  }
}
