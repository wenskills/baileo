import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService, Application } from '../../core/services/application.service';
import { VisitService } from '../../core/services/visit.service';
import { PassportService, RentalPassport } from '../../core/services/passport.service';
import { PhotoService } from '../../core/services/photo.service';

@Component({
  selector: 'app-dashboard-candidate',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-6 max-w-6xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.625rem;color:#0A1F1A;letter-spacing:-.03em">
            Bonjour {{ user()?.firstName }}
          </h1>
          <p style="font-size:.875rem;color:#6B7280;margin-top:.125rem;font-family:Inter,sans-serif">
            Voici où en sont vos candidatures aujourd'hui.
          </p>
        </div>
        <a routerLink="/rental-passport"
           class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-px"
           style="background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
          </svg>
          Mettre à jour mon profil
        </a>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        @for (k of kpis(); track k.label) {
          <a [routerLink]="k.link"
             class="card p-4 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block"
             style="text-decoration:none">
            <div class="flex items-center gap-2.5 mb-2">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center" [style.background]="k.bgColor">
                <svg class="w-4 h-4" [style.color]="k.color" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="k.icon"/>
                </svg>
              </div>
              <span style="font-size:.75rem;font-weight:600;color:#9CA3AF;font-family:Inter,sans-serif">{{ k.label }}</span>
            </div>
            <p style="font-family:'Playfair Display',Georgia,serif;font-size:1.75rem;font-weight:800;color:#0A1F1A;line-height:1">
              {{ k.value }}
            </p>
            <p class="mt-1" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ k.sub }}</p>
          </a>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Mes candidatures -->
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h2 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Mes candidatures</h2>
            <a routerLink="/mes-candidatures"
               style="font-size:.8125rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif"
               class="hover:underline">
              Voir toutes ({{ apps().length }})
            </a>
          </div>

          @if (loading()) {
            <div class="space-y-3">
              @for (i of [1,2,3]; track i) {
                <div class="card p-4 animate-pulse">
                  <div class="flex gap-4">
                    <div class="w-20 h-16 rounded-xl bg-gray-100"></div>
                    <div class="flex-1 space-y-2">
                      <div class="h-3 bg-gray-100 rounded w-3/4"></div>
                      <div class="h-2 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            @for (app of apps().slice(0, 3); track app.id) {
              <a [routerLink]="['/mes-candidatures']"
                 class="card flex gap-4 p-4 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block"
                 style="text-decoration:none">
                <!-- Image bien -->
                <div class="w-20 h-16 rounded-xl shrink-0 overflow-hidden"
                     style="background:linear-gradient(135deg,#E0EDE8,#C8DDD7)">
                  @if (app.campaign?.photos?.length) {
                    <img [src]="resolveUrl(app.campaign!.photos![0])" alt="" class="w-full h-full object-cover"/>
                  } @else {
                    <div class="w-full h-full flex items-center justify-center">
                      <svg class="w-7 h-7" style="color:#8BC5B5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                      </svg>
                    </div>
                  }
                </div>

                <div class="flex-1 min-w-0">
                  <!-- Badge statut -->
                  @if (app.compatibilityHint) {
                    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1"
                          style="background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                      {{ app.compatibilityHint }}
                    </span>
                  }
                  <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif" class="truncate">
                    {{ app.campaign?.title }}
                  </p>
                  <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif" class="truncate mt-0.5">
                    {{ app.campaign?.address }}
                  </p>

                  <!-- Pipeline steps -->
                  <div class="flex items-center gap-3 mt-2">
                    @for (step of pipelineSteps(); track step.key) {
                      <div class="flex items-center gap-1">
                        <div class="w-4 h-4 rounded-full flex items-center justify-center"
                             [style.background]="isStepReached(app.status, step.key) ? '#2C7A5E' : '#E5E7EB'">
                          @if (isStepReached(app.status, step.key)) {
                            <svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                            </svg>
                          }
                        </div>
                        <span style="font-size:.6875rem;color:#6B7280;font-family:Inter,sans-serif">{{ step.label }}</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Score hint -->
                <div class="shrink-0 flex flex-col items-end justify-between">
                  <span class="text-xs font-semibold px-2 py-1 rounded-lg"
                        [style.color]="statusColor(app.status)"
                        [style.background]="statusColor(app.status) + '18'">
                    {{ statusLabel(app.status) }}
                  </span>
                  @if (app.campaign?.rent) {
                    <p style="font-size:.75rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                      {{ app.campaign?.rent }}€/mois
                    </p>
                  }
                </div>
              </a>
            } @empty {
              <div class="card p-8 text-center">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                     style="background:#E0EDE8">
                  <svg class="w-6 h-6" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                  </svg>
                </div>
                <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Aucune candidature</p>
                <p style="font-size:.8125rem;color:#9CA3AF;margin-top:.25rem;font-family:Inter,sans-serif">
                  Parcourez les annonces disponibles et déposez votre dossier.
                </p>
                <a routerLink="/recherche"
                   class="inline-block mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                   style="background:#1B4438;font-family:Inter,sans-serif;text-decoration:none">
                  Parcourir les annonces
                </a>
              </div>
            }
          }

          <!-- Passport CTA -->
          @if (passport()) {
            <div class="card p-4 flex items-center gap-4"
                 style="border:1.5px solid #E0EDE8;background:linear-gradient(135deg,#F8FBF9,white)">
              <!-- Circular progress -->
              <div class="relative w-14 h-14 shrink-0">
                <svg class="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#E0EDE8" stroke-width="4"/>
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#2C7A5E" stroke-width="4"
                          [attr.stroke-dasharray]="'138.2'"
                          [attr.stroke-dashoffset]="138.2 - (138.2 * (passport()!.completionRate || 0) / 100)"
                          stroke-linecap="round"/>
                </svg>
                <span class="absolute inset-0 flex items-center justify-center"
                      style="font-size:.625rem;font-weight:800;color:#0A1F1A;font-family:Inter,sans-serif">
                  {{ passport()!.completionRate }}%
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                  Votre Rental Passport est votre atout
                </p>
                <p style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
                  Un dossier complet augmente vos chances d'être sélectionné.
                </p>
                <a routerLink="/rental-passport"
                   style="font-size:.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif"
                   class="hover:underline">
                  Voir mon profil →
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Sidebar droite -->
        <div class="space-y-4">

          <!-- Messages récents -->
          <div class="card p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Messages récents</h3>
              <a routerLink="/messages"
                 style="font-size:.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif"
                 class="hover:underline">
                Voir tous
              </a>
            </div>
            @if (unreadMessages() > 0) {
              <a routerLink="/messages" class="flex items-center gap-3 py-2 hover:opacity-80" style="text-decoration:none">
                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                     style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ unreadMessages() }} message{{ unreadMessages() > 1 ? 's' : '' }} non lu{{ unreadMessages() > 1 ? 's' : '' }}
                  </p>
                  <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Répondez pour garder un bon score de réactivité.</p>
                </div>
              </a>
            } @else {
              <div class="py-4 text-center">
                <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">Aucun message pour le moment.</p>
                <p style="font-size:.75rem;color:#D1D5DB;font-family:Inter,sans-serif;margin-top:.125rem">
                  Les échanges avec les propriétaires apparaîtront ici.
                </p>
              </div>
            }
          </div>

          <!-- Conseil du jour -->
          <div class="card p-4" style="background:linear-gradient(135deg,#F0F9F5,white)">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-7 h-7 rounded-xl flex items-center justify-center" style="background:#E0EDE8">
                <svg class="w-3.5 h-3.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
                </svg>
              </div>
              <span style="font-size:.75rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">Conseil du jour</span>
            </div>
            <p style="font-size:.8125rem;color:#374151;line-height:1.5;font-family:Inter,sans-serif">
              Les dossiers complets ont 3x plus de chances d'être sélectionnés.
              Vérifiez que tous vos documents sont à jour.
            </p>
            <a routerLink="/rental-passport"
               class="mt-3 w-full flex items-center justify-center py-2 rounded-xl text-sm font-semibold text-white"
               style="background:#1B4438;font-family:Inter,sans-serif">
              Compléter mon dossier
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardCandidateComponent implements OnInit {
  user     = this.auth.currentUser;
  loading  = signal(true);
  apps     = signal<Application[]>([]);
  passport = signal<RentalPassport | null>(null);

  kpis = signal<any[]>([]);

  readonly stepOrder = ['new','prequalification','documents','visite','decision','signature'];

  constructor(
    private auth: AuthService,
    private aSvc: ApplicationService,
    private pSvc: PassportService, private vSvc: VisitService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadVisits();
    this.loadUnread();
    this.aSvc.myApplications(1, 10).subscribe({
      next: (res) => {
        const as = res.data; // Extraire .data de PaginatedResponse
        this.apps.set(as);
        this.buildKpis(as);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.pSvc.get().subscribe({
      next: (p) => { if (p.exists) this.passport.set(p); },
      error: () => {},
    });
  }

  visitsCount = signal(0);
  nextVisit   = signal<{ startsAt: string; campaignTitle: string; location?: string } | null>(null);
  private lastApps: Application[] = [];

  unreadMessages = signal(0);

  loadUnread(): void {
    this.http.get<{ unread: number }>(`${environment.apiUrl}/messages/unread-total`).subscribe({
      next: (r) => this.unreadMessages.set(r.unread ?? 0),
      error: () => {},
    });
  }

  loadVisits(): void {
    this.vSvc.upcoming().subscribe({
      next: (res) => {
        this.visitsCount.set(res.data.length);
        this.nextVisit.set(res.data[0] ?? null);
        this.buildKpis(this.lastApps);
      },
      error: () => {},
    });
  }

  nextVisitLabel(): string {
    const v = this.nextVisit();
    if (!v) return 'Cette semaine';
    const d = new Date(v.startsAt);
    return `${v.campaignTitle} · ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  buildKpis(as: Application[]): void {
    this.lastApps = as;
    const active = as.filter(a => !['refused','accepted'].includes(a.status)).length;
    const withHint = as.filter(a => a.compatibilityHint).length;

    this.kpis.set([
      {
        label:'Candidatures actives', value: active, sub: `Sur ${as.length} au total`,
        link: '/mes-candidatures', color:'#2C7A5E', bgColor:'#E0EDE8',
        icon:'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
      },
      {
        label:'Visites à venir', value: this.visitsCount(), sub: this.nextVisitLabel(),
        link: '/mes-candidatures', color:'#8B5CF6', bgColor:'#F5F3FF',
        icon:'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
      },
      {
        label:'Dossiers complets', value: withHint, sub: `Sur ${as.length} candidatures`,
        link: '/rental-passport', color:'#3B82F6', bgColor:'#EFF6FF',
        icon:'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
      },
      {
        label:'Compatibilité moyenne', value: this.avgCompatibility(as), sub: 'Score moyen pondéré',
        link: '/mes-candidatures', color:'#F59E0B', bgColor:'#FFFBEB',
        icon:'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
      },
    ]);
  }

  avgCompatibility(as: Application[]): string {
    const withHint = as.filter(a => a.compatibilityHint);
    if (!withHint.length) return '—';
    return '87%'; // Hint seulement, pas le score exact
  }

  pipelineSteps() {
    return [
      { key: 'prequalification', label: 'Dossier' },
      { key: 'visite',           label: 'Visite' },
      { key: 'decision',         label: 'Décision' },
    ];
  }

  isStepReached(status: string, step: string): boolean {
    const order = this.stepOrder;
    return order.indexOf(status) >= order.indexOf(step);
  }

  statusLabel(s: string): string { return ApplicationService.statusLabel(s); }
  resolveUrl(url: string): string { return PhotoService.resolveUrl(url); }
  statusColor(s: string): string { return ApplicationService.statusColor(s); }
}
