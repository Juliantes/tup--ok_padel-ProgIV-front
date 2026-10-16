import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Match } from '../core/api/match.models';
import { MatchesApiService } from '../core/api/matches-api.service';

@Component({
  selector: 'app-matches-list',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './matches-list.html',
  styleUrl: './matches-list.css',
})
export class MatchesList implements OnInit {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly matches = signal<Match[]>([]);
  protected readonly isMine = signal(false);

  ngOnInit(): void {
    this.isMine.set(this.route.snapshot.data['mine'] === true);
    this.loadMatches();
  }

  protected loadMatches(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = this.isMine()
      ? this.matchesApi.listMyMatches()
      : this.matchesApi.listMatches();

    request$.subscribe({
      next: (response) => {
        this.matches.set(response.matches);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('MATCHES.ERROR');
        this.isLoading.set(false);
      },
    });
  }
}
