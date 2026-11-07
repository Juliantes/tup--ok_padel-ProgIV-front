import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AnalyticsService } from '../analytics/analytics.service';
import { AuthService } from '../login/auth.service';
import { navItemsForRoles } from '../navigation/app-navigation';

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

  protected readonly navigationItems = computed(() => navItemsForRoles(this.auth.userRoles()));

  protected trackNavClick(analyticsName: string, location: 'header_nav' | 'mobile_nav'): void {
    this.analytics.trackButtonClick(analyticsName, location);
  }
}
