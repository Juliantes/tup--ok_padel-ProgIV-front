import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { PlayerReview } from '../core/api/player.models';
import { playerInitials } from '../matches/matches-search.utils';

@Component({
  selector: 'app-player-review-card',
  imports: [DatePipe, MatIconModule, TranslatePipe],
  templateUrl: './player-review-card.html',
  styleUrl: './player-review-card.css',
})
export class PlayerReviewCard {
  readonly review = input.required<PlayerReview>();

  protected readonly playerInitials = playerInitials;

  protected isStarFilled(starIndex: number, review: PlayerReview): boolean {
    return starIndex <= review.stars;
  }
}
