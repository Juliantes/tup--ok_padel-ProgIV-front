import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { PlayerDetail, PlayerSummary } from '../core/api/player.models';
import { playerInitials } from '../matches/matches-search.utils';
import { PlayerReviewCard } from './player-review-card';
import { PlayerStatsChart } from './player-stats-chart';

@Component({
  selector: 'app-player-card',
  imports: [MatIconModule, PlayerReviewCard, PlayerStatsChart, TranslatePipe],
  templateUrl: './player-card.html',
  styleUrl: './player-card.css',
})
export class PlayerCard {
  readonly player = input.required<PlayerSummary>();
  readonly expanded = input(false);
  readonly detail = input<PlayerDetail | null>(null);
  readonly detailLoading = input(false);
  readonly detailError = input('');

  readonly toggleDetail = output<void>();

  protected readonly playerInitials = playerInitials;

  protected onToggleClick(): void {
    this.toggleDetail.emit();
  }

  protected starsLabel(player: PlayerSummary): string {
    if (player.average_stars == null) {
      return '—';
    }

    return player.average_stars.toFixed(1);
  }
}
