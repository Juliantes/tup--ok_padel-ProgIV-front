import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiSessionService } from '../core/api/api-session.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import { AuthService } from '../login/auth.service';
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
import {
  MatchCreateDraft,
  MatchCreateSlotSelection,
  PlaceMode,
  clearMatchCreateDraft,
  consumeMatchCreateSlotSelection,
  readMatchCreateDraft,
  saveMatchCreateDraft,
  slotSelectionLabel,
} from './match-create-draft.utils';
import {
  LEVEL_REQUIRED_OPTIONS,
  levelRequiredI18nKey,
  playerInitials,
} from './matches-search.utils';

type WizardCardState = 'active' | 'complete' | 'pending';

@Component({
  selector: 'app-match-create',
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './match-create.html',
  styleUrl: './match-create.css',
})
export class MatchCreate implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly router = inject(Router);
  private readonly apiSession = inject(ApiSessionService);
  private readonly auth = inject(AuthService);

  protected readonly wizardSteps = CREATE_WIZARD_STEPS;
  protected readonly levelOptions = LEVEL_REQUIRED_OPTIONS;
  protected readonly durationOptions = DURATION_OPTIONS;
  protected readonly timeOptions = halfHourTimeOptions();
  protected readonly levelRequiredI18nKey = levelRequiredI18nKey;

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly activeStep = signal<CreateWizardStep>('place');
  protected readonly completedSteps = signal<Set<CreateWizardStep>>(new Set());
  protected readonly placeMode = signal<PlaceMode | null>(null);
  protected readonly slotSummaryLabel = signal('');

  protected readonly canPickCourtBooking = computed(() => this.auth.isPlayer());

  protected readonly hasReservedSlot = computed(
    () => this.placeMode() === 'with_court' && this.form.controls.timeSlotId.value != null,
  );

  protected readonly form = this.fb.group({
    matchDate: [todayIsoDate(), Validators.required],
    matchTime: ['', Validators.required],
    duration: [90, [Validators.required, Validators.min(30)]],
    courtId: [null as number | null],
    timeSlotId: [null as number | null],
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
    const slot = consumeMatchCreateSlotSelection();
    const draft = readMatchCreateDraft();

    if (draft) {
      this.form.patchValue({
        matchDate: draft.form.matchDate,
        matchTime: draft.form.matchTime,
        duration: draft.form.duration,
        courtId: draft.form.courtId,
        timeSlotId: draft.form.timeSlotId,
        autoJoin: draft.form.autoJoin,
        levelRequired: draft.form.levelRequired,
        rosterMode: draft.form.rosterMode,
        joinPolicy: draft.form.joinPolicy,
      });
      this.placeMode.set(draft.form.placeMode);
      if (draft.slotLabel) {
        this.slotSummaryLabel.set(draft.slotLabel);
      }
    }

    if (slot) {
      this.applySlotSelection(slot);
      const completed = new Set<CreateWizardStep>(['place', 'date']);
      this.completedSteps.set(completed);
      this.placeMode.set('with_court');
      this.activeStep.set('play');
    } else if (draft) {
      const completed = new Set(draft.completedSteps as CreateWizardStep[]);
      this.completedSteps.set(completed);
      this.activeStep.set((draft.activeStep as CreateWizardStep) ?? 'place');
    }
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

  protected selectPlaceMode(mode: PlaceMode): void {
    if (mode === 'with_court' && !this.canPickCourtBooking()) {
      return;
    }
    this.placeMode.set(mode);
    if (mode === 'without_court') {
      this.form.patchValue({ courtId: null, timeSlotId: null });
      this.slotSummaryLabel.set('');
    }
  }

  protected continue(step: CreateWizardStep): void {
    if (step === 'place' && this.placeMode() === 'with_court') {
      this.goToCourtSelection();
      return;
    }

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
    if (step === 'place' && this.placeMode() === 'with_court') {
      this.goToCourtSelection();
      return;
    }
    if (step === 'date' && this.hasReservedSlot()) {
      this.goToCourtSelection();
      return;
    }

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

  protected levelLabel(level: string | null): string {
    if (!level) {
      return '';
    }
    return levelRequiredI18nKey(level);
  }

  protected clearDraftAndCancel(): void {
    clearMatchCreateDraft();
  }

  protected submit(): void {
    if (!this.canSubmit() || this.form.invalid) {
      return;
    }

    const matchDate = this.form.controls.matchDate.value;
    const matchTime = this.form.controls.matchTime.value;
    if (!matchDate || !matchTime) {
      return;
    }

    const rawCourtId = this.form.controls.courtId.value;
    const courtId = rawCourtId === null ? null : Number(rawCourtId);
    const rawSlotId = this.form.controls.timeSlotId.value;
    const timeSlotId = rawSlotId === null ? null : Number(rawSlotId);

    if (this.placeMode() === 'with_court' && (!courtId || !timeSlotId)) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const payload = buildCreateMatchPayload({
      courtId,
      timeSlotId,
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
        clearMatchCreateDraft();
        void this.router.navigate(['/matches', response.match.id]);
      },
      error: () => {
        this.errorMessage.set('MATCHES.CREATE_ERROR');
        this.isSaving.set(false);
      },
    });
  }

  private applySlotSelection(slot: MatchCreateSlotSelection): void {
    if (!slot) {
      return;
    }
    this.form.patchValue({
      matchDate: slot.date,
      matchTime: slot.startTime,
      duration: slot.durationMinutes,
      courtId: slot.courtId,
      timeSlotId: slot.timeSlotId,
    });
    this.slotSummaryLabel.set(slotSelectionLabel(slot));
  }

  private goToCourtSelection(): void {
    const draft: MatchCreateDraft = {
      activeStep: this.activeStep(),
      completedSteps: [...this.completedSteps()],
      form: {
        matchDate: this.form.controls.matchDate.value ?? todayIsoDate(),
        matchTime: this.form.controls.matchTime.value ?? '',
        duration: this.form.controls.duration.value ?? 90,
        courtId: this.form.controls.courtId.value,
        timeSlotId: this.form.controls.timeSlotId.value,
        placeMode: this.placeMode(),
        autoJoin: this.form.controls.autoJoin.value ?? true,
        levelRequired: this.form.controls.levelRequired.value ?? 'fifth',
        rosterMode: this.form.controls.rosterMode.value ?? 'individual',
        joinPolicy: this.form.controls.joinPolicy.value ?? 'auto',
      },
      slotLabel: this.slotSummaryLabel() || undefined,
    };
    saveMatchCreateDraft(draft);
    void this.router.navigate(['/courts'], { queryParams: { intent: 'create-match' } });
  }

  private isStepValid(step: CreateWizardStep): boolean {
    switch (step) {
      case 'place':
        if (this.placeMode() === 'without_court') {
          return true;
        }
        if (this.placeMode() === 'with_court') {
          return (
            this.form.controls.courtId.value != null && this.form.controls.timeSlotId.value != null
          );
        }
        return false;
      case 'date':
        return (
          this.form.controls.matchDate.valid &&
          this.form.controls.matchTime.valid &&
          this.form.controls.duration.valid
        );
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
