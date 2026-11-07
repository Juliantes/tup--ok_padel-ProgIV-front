import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { ClubBrowseItem } from '../club-browse.models';
import { clubBadgeLabel, clubHeroTheme } from '../club-browse.utils';

@Component({
  selector: 'app-club-browse-grid',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './club-browse-grid.html',
  styleUrl: '../club-browse.css',
})
export class ClubBrowseGrid {
  readonly clubs = input.required<ClubBrowseItem[]>();
  readonly whatsappHrefFor = input.required<(club: ClubBrowseItem) => string | null>();
  readonly onlineBooking = input(true);

  readonly clubSelected = output<number>();

  protected badgeLabel(club: ClubBrowseItem): string {
    return clubBadgeLabel(club);
  }

  protected themeClass(club: ClubBrowseItem): string {
    return `club-card__hero--theme-${clubHeroTheme(club)}`;
  }

  protected selectClub(clubId: number): void {
    this.clubSelected.emit(clubId);
  }
}
