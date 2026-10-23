import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiSessionService } from '../core/api/api-session.service';
import { Court } from '../core/api/match.models';
import { CourtsApiService } from '../core/api/courts-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import {
  LEVEL_REQUIRED_OPTIONS,
  levelRequiredI18nKey,
  playerInitials,
} from './matches-search.utils';
import {
  CREATE_WIZARD_STEPS,
  CreateWizardStep,
  DURATION_OPTIONS,
  buildCreateMatchPayload,
  formatWizardDateLabel,
  halfHourTimeOptions,
  nextWizardStep,
  todayIsoDate,
  truncateCompletedFrom,
  wizardStepIndex,
} from './match-create.utils';

type WizardCardState = 'active' | 'complete' | 'pending';

@Component({
  selector: 'app-match-create',
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './match-create.html',
  styleUrl: './match-create.css',
})
export class MatchCreate implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly courtsApi = inject(CourtsApiService);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly router = inject(Router);
  private readonly apiSession = inject(ApiSessionService);

  protected readonly wizardSteps = CREATE_WIZARD_STEPS;
  protected readonly levelOptions = LEVEL_REQUIRED_OPTIONS;
  protected readonly durationOptions = DURATION_OPTIONS;
  protected readonly timeOptions = halfHourTimeOptions();
  protected readonly levelRequiredI18nKey = levelRequiredI18nKey;

  protected readonly courts = signal<Court[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly activeStep = signal<CreateWizardStep>('date');
  protected readonly completedSteps = signal<Set<CreateWizardStep>>(new Set());

  protected readonly form = this.fb.group({
    matchDate: [todayIsoDate(), Validators.required],
    matchTime: ['', Validators.required],
    duration: [90, [Validators.required, Validators.min(30)]],
    courtId: [null as number | null, Validators.required],
    autoJoin: [true, Validators.required],
    levelRequired: ['fifth', Validators.required],
    rosterMode: ['individual', Validators.required],
    joinPolicy: ['auto', Validators.required],
  });

  protected readonly rosterPreviewSlots = computed(() => {
    const autoJoin = this.form.controls.autoJoin.value ?? false;
    const user = this.apiSession.user();
    const slots: { filled: boolean; initials: string; label: string }[] = [];

    if (autoJoin && user) {
      slots.push({
        filled: true,
        initials: playerInitials(user.name),
        label: user.name,
      });
    }

    while (slots.length < 4) {
      slots.push({ filled: false, initials: '', label: '' });
    }

    return slots;
  });

  protected readonly canSubmit = computed(() => {
    const completed = this.completedSteps();
    return (
      CREATE_WIZARD_STEPS.every((step) => completed.has(step)) &&
      this.form.valid &&
      !this.isSaving()
    );
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

  protected stepState(step: CreateWizardStep): WizardCardState {
    if (this.activeStep() === step) {
      return 'active';
    }
    if (this.completedSteps().has(step)) {
      return 'complete';
    }
    return 'pending';
  }

  protected stepNumber(step: CreateWizardStep): number {
    return wizardStepIndex(step);
  }

  protected continue(step: CreateWizardStep): void {
    if (!this.isStepValid(step)) {
      this.touchStepControls(step);
      return;
    }

    const completed = new Set(this.completedSteps());
    completed.add(step);
    this.completedSteps.set(completed);

    const next = nextWizardStep(step);
    if (next) {
      this.activeStep.set(next);
    }
  }

  protected edit(step: CreateWizardStep): void {
    this.completedSteps.set(truncateCompletedFrom(this.completedSteps(), step));
    this.activeStep.set(step);
  }

  protected selectAutoJoin(value: boolean): void {
    this.form.controls.autoJoin.setValue(value);
  }

  protected selectJoinPolicy(value: string): void {
    this.form.controls.joinPolicy.setValue(value);
  }

  protected formatDateLabel(isoDate: string | null): string {
    if (!isoDate) {
      return '';
    }
    return formatWizardDateLabel(isoDate);
  }

  protected courtLabel(courtId: number | null): string {
    if (!courtId) {
      return '';
    }
    const court = this.courts().find((item) => item.id === courtId);
    if (!court) {
      return '';
    }
    return `${court.name} — ${court.club.name}`;
  }

  protected levelLabel(level: string | null): string {
    if (!level) {
      return '';
    }
    return levelRequiredI18nKey(level);
  }

  protected submit(): void {
    if (!this.canSubmit() || this.form.invalid) {
      return;
    }

    const rawCourtId = this.form.controls.courtId.value;
    const matchDate = this.form.controls.matchDate.value;
    const matchTime = this.form.controls.matchTime.value;
    const courtId = rawCourtId === null ? null : Number(rawCourtId);
    if (!courtId || Number.isNaN(courtId) || !matchDate || !matchTime) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const payload = buildCreateMatchPayload({
      courtId,
      date: matchDate,
      time: matchTime,
      duration: this.form.controls.duration.value ?? 90,
      rosterMode: this.form.controls.rosterMode.value ?? 'individual',
      levelRequired: this.form.controls.levelRequired.value ?? 'fifth',
      autoJoin: this.form.controls.autoJoin.value ?? true,
      joinPolicy: this.form.controls.joinPolicy.value ?? 'auto',
    });

    this.matchesApi.createMatch(payload).subscribe({
      next: (response) => {
        void this.router.navigate(['/matches', response.match.id]);
      },
      error: () => {
        this.errorMessage.set('MATCHES.CREATE_ERROR');
        this.isSaving.set(false);
      },
    });
  }

  private isStepValid(step: CreateWizardStep): boolean {
    switch (step) {
      case 'date':
        return (
          this.form.controls.matchDate.valid &&
          this.form.controls.matchTime.valid &&
          this.form.controls.duration.valid
        );
      case 'place':
        return this.form.controls.courtId.valid;
      case 'play':
        return this.form.controls.autoJoin.valid;
      case 'category':
        return this.form.controls.levelRequired.valid && this.form.controls.rosterMode.valid;
      case 'who':
        return true;
      case 'visibility':
        return this.form.controls.joinPolicy.valid;
      default:
        return false;
    }
  }

  private touchStepControls(step: CreateWizardStep): void {
    switch (step) {
      case 'date':
        this.form.controls.matchDate.markAsTouched();
        this.form.controls.matchTime.markAsTouched();
        this.form.controls.duration.markAsTouched();
        break;
      case 'place':
        this.form.controls.courtId.markAsTouched();
        break;
      case 'play':
        this.form.controls.autoJoin.markAsTouched();
        break;
      case 'category':
        this.form.controls.levelRequired.markAsTouched();
        this.form.controls.rosterMode.markAsTouched();
        break;
      case 'visibility':
        this.form.controls.joinPolicy.markAsTouched();
        break;
      default:
        break;
    }
  }
}
