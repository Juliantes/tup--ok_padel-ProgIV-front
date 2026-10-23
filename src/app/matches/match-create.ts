import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Court } from '../core/api/match.models';
import { CourtsApiService } from '../core/api/courts-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';

@Component({
  selector: 'app-match-create',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './match-create.html',
  styleUrl: './match-create.css',
})
export class MatchCreate implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly courtsApi = inject(CourtsApiService);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly router = inject(Router);

  protected readonly courts = signal<Court[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.group({
    courtId: [null as number | null, Validators.required],
    date: ['', Validators.required],
    duration: [90, [Validators.required, Validators.min(30)]],
    rosterMode: ['individual', Validators.required],
    levelRequired: [3, [Validators.required, Validators.min(1), Validators.max(7)]],
    joinPolicy: ['auto', Validators.required],
  });

  ngOnInit(): void {
    this.courtsApi.listCourts().subscribe({
      next: (response) => {
        this.courts.set(response.courts);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('MATCHES.ERROR');
        this.isLoading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.isSaving()) {
      return;
    }

    const courtId = this.form.controls.courtId.value;
    if (!courtId) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const dateValue = this.form.controls.date.value;
    if (!dateValue) {
      return;
    }

    const isoDate = dateValue.includes('T') ? dateValue : `${dateValue}T18:00:00`;

    this.matchesApi
      .createMatch({
        court_id: courtId,
        date: new Date(isoDate).toISOString(),
        duration: this.form.controls.duration.value ?? 90,
        roster_mode: this.form.controls.rosterMode.value ?? 'individual',
        level_required: this.form.controls.levelRequired.value ?? 3,
        join_policy: this.form.controls.joinPolicy.value ?? 'auto',
        auto_join: true,
      })
      .subscribe({
        next: (response) => {
          void this.router.navigate(['/matches', response.match.id]);
        },
        error: () => {
          this.errorMessage.set('MATCHES.CREATE_ERROR');
          this.isSaving.set(false);
        },
      });
  }
}
