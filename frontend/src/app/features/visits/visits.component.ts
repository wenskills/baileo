import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CampaignService, Campaign } from '../../core/services/campaign.service';
import { VisitService, VisitSlot } from '../../core/services/visit.service';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  slots: VisitSlot[];
}

/**
 * Planning des visites — vrai calendrier mensuel (maquette « Visites – Planning »).
 * Navigation mois par mois, création sur le jour sélectionné, détail des
 * réservations avec accès direct au dossier du candidat (Rental Passport).
 */
@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .field-label { font-size:.75rem; font-weight:600; color:#6B7280; font-family:Inter,sans-serif; display:block; margin-bottom:.25rem; }
    .field-input { width:100%; padding:.5625rem .75rem; border:1.5px solid #E5E7EB; border-radius:.625rem; font-size:.875rem; font-family:Inter,sans-serif; color:#0A1F1A; outline:none; background:white; }
    .field-input:focus { border-color:#2C7A5E; }
    .camp-tab { padding:.5rem .875rem; border-radius:.625rem; font-size:.8125rem; font-weight:600; font-family:Inter,sans-serif; cursor:pointer; border:1.5px solid #E5E7EB; background:white; color:#6B7280; transition:all .15s; }
    .camp-tab.active { border-color:#1B4438; color:#1B4438; background:#F0F9F5; }
    .cal-day { min-height:5.5rem; border:1px solid #F0F0F0; padding:.375rem; cursor:pointer; transition:background .12s; background:white; text-align:left; width:100%; display:flex; flex-direction:column; gap:.25rem; }
    .cal-day:hover { background:#F8FBF9; }
    .cal-day.selected { outline:2px solid #2C7A5E; outline-offset:-2px; background:#F0F9F5; }
    .cal-day.out { background:#FAFAFA; }
    .cal-day.out .day-num { color:#D1D5DB; }
    .day-num { font-size:.75rem; font-weight:600; color:#374151; font-family:Inter,sans-serif; }
    .day-num.today { background:#1B4438; color:white; border-radius:9999px; width:1.375rem; height:1.375rem; display:inline-flex; align-items:center; justify-content:center; }
    .slot-chip { font-size:.625rem; font-weight:600; font-family:Inter,sans-serif; padding:.125rem .375rem; border-radius:.375rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  `],
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <div class="flex items-start justify-between mb-5">
        <div>
          <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Visites</h1>
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">Planifiez vos créneaux et suivez les réservations.</p>
        </div>
      </div>

      <!-- Sélection de campagne -->
      @if (campaigns().length) {
        <div class="flex gap-2 flex-wrap mb-4">
          @for (c of campaigns(); track c.id) {
            <button type="button" class="camp-tab" [class.active]="selectedCampaignId() === c.id"
                    (click)="selectCampaign(c.id)">{{ c.title }}</button>
          }
        </div>
      } @else if (!loading()) {
        <div class="card p-8 text-center">
          <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Aucune campagne</p>
          <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.25rem">Créez d'abord une campagne pour planifier des visites.</p>
          <a routerLink="/campagnes/creer" class="inline-block mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
             style="background:#1B4438;font-family:Inter,sans-serif">Créer une campagne</a>
        </div>
      }

      @if (error()) {
        <div class="p-3 rounded-xl mb-4" style="background:#FEF2F2;border:1px solid #FECACA">
          <p style="font-size:.8125rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p>
        </div>
      }

      @if (selectedCampaignId()) {
        <div class="grid gap-4" style="grid-template-columns: 1fr 20rem">

          <!-- ═══ CALENDRIER ═══ -->
          <div class="card p-4">
            <div class="flex items-center justify-between mb-3">
              <button type="button" (click)="changeMonth(-1)"
                      class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50"
                      style="border:1.5px solid #E5E7EB;background:white;cursor:pointer">
                <svg class="w-4 h-4" style="color:#374151" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
              </button>
              <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;text-transform:capitalize">
                {{ viewDate() | date:'MMMM yyyy' }}
              </p>
              <button type="button" (click)="changeMonth(1)"
                      class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50"
                      style="border:1.5px solid #E5E7EB;background:white;cursor:pointer">
                <svg class="w-4 h-4" style="color:#374151" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
              </button>
            </div>

            <div class="grid grid-cols-7 mb-1">
              @for (d of ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']; track d) {
                <p class="text-center" style="font-size:.6875rem;font-weight:700;color:#9CA3AF;font-family:Inter,sans-serif;text-transform:uppercase;padding:.25rem 0">{{ d }}</p>
              }
            </div>
            <div class="grid grid-cols-7 rounded-xl overflow-hidden" style="border:1px solid #F0F0F0">
              @for (day of calendarDays(); track day.date.getTime()) {
                <button type="button" class="cal-day"
                        [class.out]="!day.inMonth"
                        [class.selected]="isSelected(day.date)"
                        (click)="selectDay(day)">
                  <span class="day-num" [class.today]="day.isToday">{{ day.date.getDate() }}</span>
                  @for (s of day.slots.slice(0, 2); track s.id) {
                    <span class="slot-chip"
                          [style.background]="s.status !== 'open' ? '#FEF2F2' : (s.bookedCount >= s.capacity ? '#FFF7ED' : '#E0EDE8')"
                          [style.color]="s.status !== 'open' ? '#DC2626' : (s.bookedCount >= s.capacity ? '#F97316' : '#1B4438')">
                      {{ s.startsAt | date:'HH:mm' }} · {{ s.bookedCount }}/{{ s.capacity }}
                    </span>
                  }
                  @if (day.slots.length > 2) {
                    <span style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">+{{ day.slots.length - 2 }}</span>
                  }
                </button>
              }
            </div>

            <!-- Conseil -->
            <div class="mt-3 p-3 rounded-xl flex items-start gap-2" style="background:#F0F9F5;border:1px solid #C8DDD7">
              <svg class="w-4 h-4 shrink-0 mt-0.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
              </svg>
              <p style="font-size:.75rem;color:#1B4438;font-family:Inter,sans-serif;line-height:1.5">
                <strong>Conseil :</strong> proposez plusieurs créneaux courts (30-45 min) plutôt qu'un long —
                les candidats réservent 2x plus quand ils ont le choix.
              </p>
            </div>
          </div>

          <!-- ═══ PANNEAU JOUR SÉLECTIONNÉ ═══ -->
          <div class="space-y-3">
            <div class="card p-4">
              <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;text-transform:capitalize">
                {{ selectedDate() | date:'EEEE d MMMM' }}
              </p>

              @if (selectedDaySlots().length === 0) {
                <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.5rem">
                  Aucun créneau ce jour.
                </p>
              }
              @for (s of selectedDaySlots(); track s.id) {
                <div class="mt-3 p-3 rounded-xl" style="border:1.5px solid #E5E7EB">
                  <div class="flex items-center justify-between">
                    <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                      {{ s.startsAt | date:'HH:mm' }} – {{ s.endsAt | date:'HH:mm' }}
                    </p>
                    <div class="flex items-center gap-1.5">
                      @if (s.status === 'cancelled') {
                        <span class="px-2 py-0.5 rounded-lg" style="font-size:.625rem;font-weight:700;background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif">Annulé</span>
                      } @else if (s.bookedCount >= s.capacity) {
                        <span class="px-2 py-0.5 rounded-lg" style="font-size:.625rem;font-weight:700;background:#FFF7ED;color:#F97316;font-family:Inter,sans-serif">Complet</span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-lg" style="font-size:.625rem;font-weight:700;background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">Ouvert</span>
                      }
                      @if (s.status === 'open') {
                        <button type="button" (click)="cancelSlot(s)"
                                class="px-2 py-1 rounded-lg text-xs font-semibold hover:bg-red-50"
                                style="border:1.5px solid #FECACA;color:#DC2626;background:white;cursor:pointer;font-family:Inter,sans-serif">
                          Annuler
                        </button>
                      }
                    </div>
                  </div>
                  <p style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif;margin-top:.125rem">
                    {{ s.bookedCount }}/{{ s.capacity }} réservé{{ s.bookedCount > 1 ? 's' : '' }}
                    @if (s.location) { · {{ s.location }} }
                  </p>
                  @if (s.bookings?.length) {
                    <div class="mt-2 space-y-1.5">
                      @for (b of s.bookings; track b.id) {
                        <div class="flex items-center justify-between p-2 rounded-lg" style="background:#F8FBF9">
                          <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center"
                                  style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                              <span style="font-size:.5625rem;font-weight:700;color:white;font-family:Inter,sans-serif">{{ b.candidateName.charAt(0) }}</span>
                            </span>
                            <span style="font-size:.75rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ b.candidateName }}</span>
                          </div>
                          <div class="flex items-center gap-1.5">
                            @if (b.status === 'booked') {
                              <button type="button" (click)="bookingAction(b, 'confirm')" title="Confirmer la visite"
                                      class="px-1.5 py-0.5 rounded" style="font-size:.625rem;font-weight:700;background:#E0EDE8;color:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">Confirmer</button>
                            } @else if (b.status === 'confirmed') {
                              <span class="px-1.5 py-0.5 rounded" style="font-size:.625rem;font-weight:700;background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">Confirmée</span>
                              <button type="button" (click)="bookingAction(b, 'complete')" title="Marquer réalisée"
                                      class="px-1.5 py-0.5 rounded" style="font-size:.625rem;font-weight:700;background:#1B4438;color:white;border:none;cursor:pointer;font-family:Inter,sans-serif">Réalisée</button>
                              <button type="button" (click)="bookingAction(b, 'no-show')" title="Candidat absent"
                                      class="px-1.5 py-0.5 rounded" style="font-size:.625rem;font-weight:700;background:#FEF2F2;color:#DC2626;border:none;cursor:pointer;font-family:Inter,sans-serif">Absent</button>
                            } @else if (b.status === 'completed') {
                              <span class="px-1.5 py-0.5 rounded" style="font-size:.625rem;font-weight:700;background:#F0F9F5;color:#2C7A5E;font-family:Inter,sans-serif">Réalisée ✓</span>
                            } @else if (b.status === 'no_show') {
                              <span class="px-1.5 py-0.5 rounded" style="font-size:.625rem;font-weight:700;background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif">Absent</span>
                            }
                            <a [routerLink]="['/candidatures', b.applicationId]"
                               style="font-size:.6875rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif;white-space:nowrap;text-decoration:none">
                              Dossier →
                            </a>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Création de créneau sur le jour sélectionné -->
            <div class="card p-4" [style.opacity]="selectedIsPast() ? '.5' : '1'">
              <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
                + Nouveau créneau le {{ selectedDate() | date:'d MMM' }}
              </p>
              @if (selectedIsPast()) {
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Sélectionnez un jour futur dans le calendrier.</p>
              } @else {
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <div><label class="field-label">Début</label><input type="time" [(ngModel)]="form.startTime" class="field-input"/></div>
                  <div><label class="field-label">Fin</label><input type="time" [(ngModel)]="form.endTime" class="field-input"/></div>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <div><label class="field-label">Capacité</label><input type="number" [(ngModel)]="form.capacity" min="1" max="50" class="field-input"/></div>
                  <div><label class="field-label">Infos (après résa)</label><input [(ngModel)]="form.location" placeholder="Interphone 12B" class="field-input" maxlength="500"/></div>
                </div>
                <button type="button" (click)="createSlot()" [disabled]="creating()"
                        class="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                        style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
                  {{ creating() ? 'Création...' : 'Créer le créneau' }}
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class VisitsComponent implements OnInit {
  campaigns = signal<Campaign[]>([]);
  selectedCampaignId = signal<string>('');
  slots = signal<VisitSlot[]>([]);
  loading = signal(true);
  creating = signal(false);
  error = signal('');
  viewDate = signal(new Date());
  selectedDate = signal(new Date());

  form = { startTime: '10:00', endTime: '11:00', capacity: 3, location: '' };

  calendarDays = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    // Lundi = début de semaine (fr)
    const startOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const slotsByDay = new Map<string, VisitSlot[]>();
    for (const s of this.slots()) {
      const k = new Date(s.startsAt).toDateString();
      if (!slotsByDay.has(k)) slotsByDay.set(k, []);
      slotsByDay.get(k)!.push(s);
    }

    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const d0 = new Date(d); d0.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        inMonth: d.getMonth() === view.getMonth(),
        isToday: d0.getTime() === today.getTime(),
        isPast: d0.getTime() < today.getTime(),
        slots: (slotsByDay.get(d.toDateString()) ?? [])
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      });
    }
    return days;
  });

  selectedDaySlots = computed(() => {
    const k = this.selectedDate().toDateString();
    return this.slots()
      .filter(s => new Date(s.startsAt).toDateString() === k)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  selectedIsPast = computed(() => {
    const d = new Date(this.selectedDate()); d.setHours(23, 59, 59);
    return d < new Date();
  });

  constructor(private cSvc: CampaignService, private vSvc: VisitService, private http: HttpClient) {}

  ngOnInit(): void {
    this.cSvc.list({ limit: 50 }).subscribe({
      next: (res) => {
        this.campaigns.set(res.data);
        this.loading.set(false);
        if (res.data.length) this.selectCampaign(res.data[0].id);
      },
      error: () => this.loading.set(false),
    });
  }

  selectCampaign(id: string): void {
    this.selectedCampaignId.set(id);
    this.error.set('');
    this.loadSlots();
  }

  loadSlots(): void {
    this.vSvc.slots(this.selectedCampaignId()).subscribe({
      next: (res) => this.slots.set(res.data),
      error: () => this.slots.set([]),
    });
  }

  changeMonth(delta: number): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate.set(day.date);
    if (!day.inMonth) this.viewDate.set(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
  }

  isSelected(d: Date): boolean {
    return d.toDateString() === this.selectedDate().toDateString();
  }

  /** yyyy-MM-ddTHH:mm local — interprété Europe/Paris côté backend */
  private localDateTime(time: string): string {
    const d = this.selectedDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
  }

  createSlot(): void {
    this.error.set('');
    if (!this.form.startTime || !this.form.endTime) { this.error.set('Renseignez les heures de début et de fin.'); return; }
    if (this.form.endTime <= this.form.startTime)   { this.error.set('L\'heure de fin doit être après le début.'); return; }
    this.creating.set(true);
    this.vSvc.createSlot(this.selectedCampaignId(), {
      startsAt: this.localDateTime(this.form.startTime),
      endsAt:   this.localDateTime(this.form.endTime),
      capacity: this.form.capacity || 1,
      location: this.form.location || undefined,
    }).subscribe({
      next: () => {
        this.creating.set(false);
        this.form.location = '';
        this.loadSlots();
      },
      error: (e) => {
        this.creating.set(false);
        this.error.set(e?.error?.error || 'Erreur lors de la création du créneau.');
      },
    });
  }

  bookingAction(b: { id: string }, action: 'confirm' | 'complete' | 'no-show'): void {
    this.http.post(`${environment.apiUrl}/visit-bookings/${b.id}/${action}`, {}).subscribe({
      next: () => this.loadSlots(),
      error: (e) => this.error.set(e?.error?.error || 'Action impossible.'),
    });
  }

  cancelSlot(s: VisitSlot): void {
    if (!confirm('Annuler ce créneau ? Les candidats ayant réservé seront notifiés.')) return;
    this.vSvc.cancelSlot(s.id).subscribe({
      next: () => this.loadSlots(),
      error: (e) => this.error.set(e?.error?.error || 'Erreur lors de l\'annulation.'),
    });
  }
}
