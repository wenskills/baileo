import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationService, Application } from '../../core/services/application.service';
import { PhotoService } from '../../core/services/photo.service';
import { PaginationComponent, PaginationMeta } from '../../shared/pagination.component';
import { VisitService, VisitSlot } from '../../core/services/visit.service';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.625rem;color:#0A1F1A;letter-spacing:-.03em">
            Mes candidatures
          </h1>
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
            {{ apps().length }} candidature{{ apps().length !== 1 ? 's' : '' }} au total
          </p>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse h-24"></div>
          }
        </div>
      } @else {
        <div class="space-y-3">
          @for (app of apps(); track app.id) {
            <div class="card p-4 hover:-translate-y-0.5 transition-all duration-200">
              <div class="flex gap-4">
                <div class="w-20 h-16 rounded-xl shrink-0 overflow-hidden"
                     style="background:linear-gradient(135deg,#E0EDE8,#C8DDD7)">
                  @if (app.campaign?.photos?.length) {
                    <img [src]="resolveUrl(app.campaign!.photos![0])" alt="" class="w-full h-full object-cover"/>
                  }
                </div>
                <div class="flex-1 min-w-0">
                  @if (app.compatibilityHint) {
                    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1"
                          style="background:#E0EDE8;color:#1B4438">{{ app.compatibilityHint }}</span>
                  }
                  <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ app.campaign?.title }}
                  </p>
                  <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ app.campaign?.address }}</p>
                  <!-- Suivi détaillé et transparent (spec Phase 2) -->
                  <p class="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                     style="font-size:.75rem;font-weight:600;background:#F0F9F5;color:#1B4438;font-family:Inter,sans-serif">
                    <span class="w-1.5 h-1.5 rounded-full" style="background:#2C7A5E"></span>
                    {{ statusPhrase(app) }}
                  </p>
                  <p style="font-size:.8125rem;color:#374151;margin-top:.25rem;font-family:Inter,sans-serif">
                    {{ app.campaign?.rent }}€/mois cc · {{ app.campaign?.surface }}m²
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                        [style.background]="statusColor(app.status) + '18'"
                        [style.color]="statusColor(app.status)">
                    {{ statusLabel(app.status) }}
                  </span>
                  <p style="font-size:.6875rem;color:#9CA3AF;margin-top:.5rem;font-family:Inter,sans-serif">
                    {{ app.createdAt | date:'dd MMM yyyy' }}
                  </p>
                  @if (app.status === 'refused') {
                    <p style="font-size:.6875rem;color:#EF4444;margin-top:.25rem;font-family:Inter,sans-serif">
                      Candidature refusée
                    </p>
                  }
                </div>
              </div>

              <!-- Visites : réserver un créneau (spec module 11) -->
              @if (app.status !== 'refused' && app.status !== 'accepted' && app.status !== 'cancelled') {
                <div class="mt-3 pt-3" style="border-top:1px solid #F0F0F0">
                  @if (openVisits() !== app.id) {
                    <a [routerLink]="['/mes-candidatures', app.id]"
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all mr-2"
                       style="background:#1B4438;font-family:Inter,sans-serif;text-decoration:none">
                      Ouvrir le suivi
                    </a>
                    <a [routerLink]="['/messages']" [queryParams]="{application: app.id}"
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-green-50 mr-2"
                       style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;font-family:Inter,sans-serif;text-decoration:none">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                      </svg>
                      Messagerie
                    </a>
                    <button type="button" (click)="toggleVisits(app)"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-green-50"
                            style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;font-family:Inter,sans-serif">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                      </svg>
                      Visites disponibles
                    </button>
                  } @else {
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Créneaux de visite</p>
                        <button type="button" (click)="openVisits.set('')"
                                style="font-size:.75rem;color:#9CA3AF;background:none;border:none;cursor:pointer;font-family:Inter,sans-serif">Fermer</button>
                      </div>
                      @if (visitError()) {
                        <p style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif;margin-bottom:.5rem">{{ visitError() }}</p>
                      }
                      @if (loadingVisits()) {
                        <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Chargement...</p>
                      } @else {
                        <div class="flex gap-2 flex-wrap">
                          @for (s of visitSlots(); track s.id) {
                            @if (s.myBookingId) {
                              <div class="px-3 py-2 rounded-xl" style="background:#F0F9F5;border:1.5px solid #2C7A5E">
                                <p class="flex items-center gap-1" style="font-size:.75rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">
                                  <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                                  </svg>
                                  {{ s.startsAt | date:'EEE d MMM à HH:mm' }}
                                </p>
                                @if (s.location) {
                                  <p style="font-size:.6875rem;color:#2C7A5E;font-family:Inter,sans-serif">{{ s.location }}</p>
                                }
                                <button type="button" (click)="cancelBooking(s)"
                                        style="font-size:.6875rem;color:#DC2626;background:none;border:none;cursor:pointer;padding:0;margin-top:.25rem;font-family:Inter,sans-serif">
                                  Annuler ma visite
                                </button>
                              </div>
                            } @else if (s.isBookable) {
                              <button type="button" (click)="book(s)"
                                      class="px-3 py-2 rounded-xl transition-all hover:border-green-700"
                                      style="border:1.5px solid #E5E7EB;background:white;cursor:pointer">
                                <p style="font-size:.75rem;font-weight:600;color:#374151;font-family:Inter,sans-serif">
                                  {{ s.startsAt | date:'EEE d MMM à HH:mm' }}
                                </p>
                                <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                                  {{ s.capacity - s.bookedCount }} place{{ (s.capacity - s.bookedCount) > 1 ? 's' : '' }}
                                </p>
                              </button>
                            }
                          } @empty {
                            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                              Aucun créneau disponible pour le moment.
                            </p>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @empty {
            <div class="card p-10 text-center">
              <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Aucune candidature</p>
              <p style="font-size:.875rem;color:#9CA3AF;margin-top:.25rem;font-family:Inter,sans-serif">
                Parcourez les annonces disponibles et déposez votre dossier.
              </p>
              <a routerLink="/campagnes"
                 class="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                 style="background:#1B4438;font-family:Inter,sans-serif">
                Voir les annonces
              </a>
            </div>
          }
        </div>
      }

      <!-- Pagination -->
      @if (meta()) {
        <app-pagination [meta]="meta()!" (pageChange)="loadPage($event)"></app-pagination>
      }
    </div>
  `,
})
export class MyApplicationsComponent implements OnInit {
  apps    = signal<Application[]>([]);
  loading = signal(true);
  meta    = signal<PaginationMeta | null>(null);
  constructor(private svc: ApplicationService, private vSvc: VisitService) {}
  ngOnInit(): void { this.loadPage(1); }

  loadPage(page: number): void {
    this.loading.set(true);
    this.svc.myApplications(page, 10).subscribe({
      next: (res) => {
        this.apps.set(res.data);
        this.meta.set(res.meta as PaginationMeta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  statusLabel(s: string): string { return ApplicationService.statusLabel(s); }

  /** Suivi détaillé transparent — phrases de la spec Phase 2. */
  statusPhrase(app: Application): string {
    const viewed = !!(app as { viewedAt?: string | null }).viewedAt;
    switch (app.status) {
      case 'new':              return viewed ? 'Le propriétaire a consulté votre dossier.' : 'Votre dossier est reçu.';
      case 'prequalification': return 'Votre dossier est en cours d\'étude.';
      case 'documents':        return 'Le propriétaire attend vos documents.';
      case 'visite':           return 'Étape visite — réservez ou préparez votre visite.';
      case 'decision':         return 'Une décision est en préparation.';
      case 'signature':        return 'Bail en préparation — signature à venir.';
      case 'accepted':         return 'Votre candidature est acceptée 🎉';
      case 'waitlist':         return 'Vous êtes sur liste d\'attente — le propriétaire conserve votre dossier.';
      case 'refused':          return 'Votre candidature n\'a pas été retenue.';
      case 'cancelled':        return 'Cette candidature a été annulée.';
      default:                 return 'Votre dossier est reçu.';
    }
  }
  statusColor(s: string): string { return ApplicationService.statusColor(s); }
  resolveUrl(url: string): string { return PhotoService.resolveUrl(url); }

  // ── Visites ────────────────────────────────────────────────────────
  openVisits    = signal<string>('');
  visitSlots    = signal<VisitSlot[]>([]);
  loadingVisits = signal(false);
  visitError    = signal('');

  toggleVisits(app: Application): void {
    this.visitError.set('');
    this.openVisits.set(app.id);
    const cid = app.campaignId ?? app.campaign?.id;
    if (!cid) { this.visitError.set('Campagne introuvable.'); return; }
    this.loadingVisits.set(true);
    this.vSvc.slots(cid).subscribe({
      next: (res) => { this.visitSlots.set(res.data); this.loadingVisits.set(false); },
      error: (e) => {
        this.loadingVisits.set(false);
        this.visitError.set(e?.error?.error || 'Impossible de charger les créneaux.');
      },
    });
  }

  book(s: VisitSlot): void {
    this.visitError.set('');
    this.vSvc.book(s.id).subscribe({
      next: () => {
        const app = this.apps().find(a => a.id === this.openVisits());
        if (app) this.toggleVisits(app);
        this.loadPage(1);
      },
      error: (e) => this.visitError.set(e?.error?.error || 'Réservation impossible.'),
    });
  }

  cancelBooking(s: VisitSlot): void {
    if (!s.myBookingId) return;
    this.vSvc.cancelBooking(s.myBookingId).subscribe({
      next: () => {
        const app = this.apps().find(a => a.id === this.openVisits());
        if (app) this.toggleVisits(app);
      },
      error: (e) => this.visitError.set(e?.error?.error || 'Annulation impossible.'),
    });
  }
}
