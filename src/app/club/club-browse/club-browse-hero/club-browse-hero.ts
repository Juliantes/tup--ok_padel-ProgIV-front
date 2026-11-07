import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { ClubBrowseItem } from '../club-browse.models';
import { clubBadgeLabel, clubHeroTheme } from '../club-browse.utils';

@Component({
  selector: 'app-club-browse-hero',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './club-browse-hero.html',
  styleUrl: '../club-browse.css',
})
export class ClubBrowseHero {
  readonly club = input.required<ClubBrowseItem>();
  readonly onlineBooking = input(true);

  protected badgeLabel(club: ClubBrowseItem): string {
    return clubBadgeLabel(club);
  }

  protected themeClass(club: ClubBrowseItem): string {
    return `club-card__hero--theme-${clubHeroTheme(club)}`;
  }
}
