import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { PlayerDetail } from '../core/api/player.models';
import { formatWinRate, winLossBarPercents } from './player-stats-chart.utils';

@Component({
  selector: 'app-player-stats-chart',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './player-stats-chart.html',
  styleUrl: './player-stats-chart.css',
})
export class PlayerStatsChart {
  readonly detail = input.required<PlayerDetail>();

  protected readonly bar = computed(() => {
    const player = this.detail();
    return winLossBarPercents(player.wins, player.losses);
  });

  protected readonly winRateLabel = computed(() => formatWinRate(this.detail().win_rate));

  protected starBarWidth(count: number, detail: PlayerDetail): number {
    const total = Object.values(detail.star_counts).reduce((sum, value) => sum + value, 0);
    if (total <= 0 || count <= 0) {
      return 0;
    }

    return (count / total) * 100;
  }

  protected starCount(detail: PlayerDetail, star: number): number {
    return detail.star_counts[String(star)] ?? 0;
  }

  protected averageStarsLabel(detail: PlayerDetail): string {
    if (detail.average_stars == null) {
      return '—';
    }

    return detail.average_stars.toFixed(1);
  }
}
