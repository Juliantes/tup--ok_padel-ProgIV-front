import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AnalyticsService } from '../analytics/analytics.service';
import { AuthService } from '../login/auth.service';

@Component({
  selector: 'app-header',
  imports: [
    MatButtonModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isHomeRoute = signal(this.router.url === '/home');

  ngOnInit(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isHomeRoute.set(this.router.url === '/home');
    });
  }

  protected readonly navigationItems = computed(() => {
    const items = [
      { labelKey: 'NAV.HOME', path: '/home', analyticsName: 'inicio' },
      { labelKey: 'NAV.MATCHES', path: '/matches', analyticsName: 'partidos' },
    ];

    if (this.auth.isClubOwner()) {
      items.push({ labelKey: 'NAV.CLUB', path: '/club', analyticsName: 'mis-canchas' });
    }

    items.push({ labelKey: 'NAV.CONFIG', path: '/configurations', analyticsName: 'configuracion' });
    return items;
  });

  protected trackNavClick(analyticsName: string, location: 'header_nav' | 'mobile_nav'): void {
    this.analytics.trackButtonClick(analyticsName, location);
  }
}
