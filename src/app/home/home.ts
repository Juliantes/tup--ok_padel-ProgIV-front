import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

import { AnalyticsService } from '../analytics/analytics.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly analytics = inject(AnalyticsService);

  protected readonly backgroundImage = "url('assets/images/background-home.jpg')";

  protected trackHomeClick(section: 'partidos' | 'configuracion'): void {
    this.analytics.trackButtonClick(section, 'home');
  }
}
