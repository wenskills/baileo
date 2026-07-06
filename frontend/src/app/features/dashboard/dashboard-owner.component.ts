import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionCenterComponent } from '../../shared/action-center.component';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CampaignService, Campaign, PaginatedResponse } from '../../core/services/campaign.service';
import { VisitService } from '../../core/services/visit.service';
import { ApplicationService, Application } from '../../core/services/application.service';
import { PhotoService } from '../../core/services/photo.service';

@Component({
  selector: 'app-dashboard-owner',
  standalone: true,
  imports: [CommonModule, RouterLink, ActionCenterComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.625rem;color:#0A1F1A;letter-spacing:-.03em">
            Bonjour {{ user()?.firstName }}
          </h1>
          <p style="font-size:.875rem;color:#6B7280;margin-top:.125rem;font-family:Inter,sans-serif">
            Voici ce qui se passe aujourd'hui.
          </p>
        </div>
        <a routerLink="/campagnes/creer"
           class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-px hover:shadow-lg"
           style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          Créer une campagne
        </a>
      </div>

      <!-- KPI Cards -->
      @if (loading()) {
        <app-action-center class="block mb-4"/>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          @for (i of [1,2,3,4]; track i) {
            <div class="card p-4 animate-pulse">
              <div class="h-3 bg-gray-100 rounded mb-3 w-2/3"></div>
              <div class="h-7 bg-gray-100 rounded mb-2 w-1/3"></div>
              <div class="h-2 bg-gray-100 rounded w-1/2"></div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          @for (kpi of kpis(); track kpi.label) {
            <div class="card p-4 hover:-translate-y-0.5 transition-transform duration-200 cursor-default">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                     [style.background]="kpi.bgColor">
                  <svg class="w-4 h-4" [style.color]="kpi.color" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="kpi.icon"/>
                  </svg>
                </div>
                <span style="font-size:.75rem;font-weight:600;color:#9CA3AF;font-family:Inter,sans-serif">{{ kpi.label }}</span>
              </div>
              <p style="font-family:'Playfair Display',Georgia,serif;font-size:1.75rem;font-weight:800;color:#0A1F1A;line-height:1">
                {{ kpi.value }}
              </p>
              @if (kpi.trend) {
                <p class="mt-1 text-xs font-medium" style="color:#2C7A5E;font-family:Inter,sans-serif">
                  {{ kpi.trend }}
                </p>
              }
              <!-- Sparkline décorative -->
              <div class="mt-2 h-8 flex items-end gap-0.5">
                @for (h of kpi.spark; track $index) {
                  <div class="flex-1 rounded-sm transition-all"
                       [style.height]="h + '%'"
                       [style.background]="kpi.color + '40'"></div>
                }
              </div>
            </div>
          }
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Campagnes actives (2/3) -->
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
              Mes campagnes actives
            </h2>
            <a routerLink="/campagnes"
               style="font-size:.8125rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif"
               class="hover:underline">
              Voir toutes
            </a>
          </div>

          <div class="space-y-3">
            @for (c of campaigns().slice(0, 4); track c.id) {
              <a [routerLink]="['/campagnes', c.id]"
                 class="card flex gap-4 p-4 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 hover:shadow-md"
                 style="text-decoration:none">
                <!-- Image placeholder -->
                <div class="w-20 h-16 rounded-xl shrink-0 overflow-hidden"
                     style="background:linear-gradient(135deg,#E0EDE8,#C8DDD7)">
                  @if (c.photos?.length) {
                    <img [src]="resolvePhotoUrl(c.photos![0])" alt="" class="w-full h-full object-cover" />
                  } @else {
                    <div class="w-full h-full flex items-center justify-center">
                      <svg class="w-7 h-7" style="color:#8BC5B5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                      </svg>
                    </div>
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif" class="truncate">
                      {{ c.title }}
                    </p>
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                          [style.background]="statusBg(c.status)"
                          [style.color]="statusColor(c.status)">
                      {{ statusLabel(c.status) }}
                    </span>
                  </div>
                  <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif" class="truncate mt-0.5">
                    {{ c.address }}
                  </p>
                  <div class="flex items-center gap-4 mt-2">
                    <span style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
                      <b style="color:#0A1F1A">{{ c.applicationCount ?? 0 }}</b> candidatures
                    </span>
                    <span style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
                      <b style="color:#0A1F1A">{{ c.rent }}€</b>/mois
                    </span>
                    @if (c.surface) {
                      <span style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
                        {{ c.surface }}m²
                      </span>
                    }
                  </div>
                </div>
              </a>
            } @empty {
              @if (!loading()) {
                <div class="card p-8 text-center">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                       style="background:#E0EDE8">
                    <svg class="w-6 h-6" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                    </svg>
                  </div>
                  <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    Créez votre première campagne
                  </p>
                  <p style="font-size:.8125rem;color:#9CA3AF;margin-top:.25rem;font-family:Inter,sans-serif">
                    Publiez votre annonce et commencez à recevoir des candidatures.
                  </p>
                  <a routerLink="/campagnes/creer"
                     class="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                     style="background:#1B4438;font-family:Inter,sans-serif">
                    Créer ma première campagne
                  </a>
                </div>
              }
            }
          </div>
        </div>

        <!-- Sidebar droite (1/3) -->
        <div class="space-y-4">

          <!-- Candidatures récentes -->
          <div class="card p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                Candidatures récentes
              </h3>
              <a routerLink="/candidatures"
                 style="font-size:.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif"
                 class="hover:underline">
                Voir tout
              </a>
            </div>
            <div class="space-y-3">
              @for (app of recentApps().slice(0, 5); track app.id) {
                <a [routerLink]="['/candidatures', app.id]"
                   class="flex items-center gap-3 group" style="text-decoration:none">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                       style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                    {{ (app.candidate?.firstName?.[0] ?? '?') + (app.candidate?.lastName?.[0] ?? '') }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif" class="truncate">
                      {{ app.candidate?.firstName }} {{ app.candidate?.lastName }}
                    </p>
                    <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif" class="truncate">
                      {{ app.campaign?.title }}
                    </p>
                  </div>
                  @if (app.score) {
                    <span class="text-xs font-bold px-1.5 py-0.5 rounded-md"
                          [style.color]="app.scoreColor"
                          [style.background]="app.scoreColor + '15'">
                      {{ app.score }}
                    </span>
                  }
                  <span class="w-2 h-2 rounded-full shrink-0"
                        [style.background]="appStatusColor(app.status)"></span>
                </a>
              } @empty {
                <p style="font-size:.8125rem;color:#9CA3AF;text-align:center;padding:.75rem 0;font-family:Inter,sans-serif">
                  Aucune candidature pour le moment.
                </p>
              }
            </div>
          </div>

          <!-- Pipeline global -->
          @if (pipeline()) {
            <div class="card p-4">
              <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
                Pipeline global
              </h3>
              <div class="space-y-2">
                @for (stage of pipeline(); track stage.status) {
                  <div class="flex items-center gap-3">
                    <div class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="stage.color"></div>
                    <span style="font-size:.8125rem;color:#374151;flex:1;font-family:Inter,sans-serif">{{ stage.label }}</span>
                    <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                      {{ stage.count }}
                    </span>
                    <div class="flex-1 max-w-16 h-1.5 rounded-full overflow-hidden" style="background:#F5F7F6">
                      <div class="h-full rounded-full transition-all"
                           [style.background]="stage.color"
                           [style.width]="stage.pct + '%'"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
        <!-- Conseil du jour (exigence : recommandations partout) -->
        <div class="card p-4 mt-4 flex items-start gap-3" style="background:#F0F9F5;border:1.5px solid #C8DDD7">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:white;border:1px solid #C8DDD7">
            <svg class="w-4.5 h-4.5" style="width:1.125rem;height:1.125rem;color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
            </svg>
          </div>
          <div>
            <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Conseil du jour</p>
            <p style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif;line-height:1.55">
              {{ dailyTip() }}
            </p>
          </div>
        </div>

    </div>
  `,
})
export class DashboardOwnerComponent implements OnInit {
  user = this.auth.currentUser;
  loading   = signal(true);
  campaigns = signal<Campaign[]>([]);
  recentApps = signal<Application[]>([]);

  kpis = signal<any[]>([]);
  pipeline = signal<any[]>([]);

  readonly spark = [30, 45, 40, 60, 55, 70, 65, 80, 75, 90, 85, 95];

  constructor(private auth: AuthService, private cSvc: CampaignService, private aSvc: ApplicationService, private vSvc: VisitService) {}

  ngOnInit(): void {
    this.loadVisits();
    this.cSvc.list({ limit: 20 }).subscribe({
      next: (res) => {
        const cs = res.data; // Extraire .data de PaginatedResponse
        this.campaigns.set(cs);
        this.buildKpis(cs);
        this.loading.set(false);

        // Charger les candidatures récentes pour la première campagne active
        const activeCampaign = cs.find(c => c.status === 'active');
        if (activeCampaign) {
          this.aSvc.byCampaign(activeCampaign.id, 1, 20).subscribe({
            next: (res) => {
              const as = res.data;
              // Trier par date décroissante + limiter à 5
              const sorted = [...as].sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              this.recentApps.set(sorted);
              this.buildPipeline(as);
            },
            error: () => this.loading.set(false),
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  buildPipeline(apps: Application[]): void {
    this.allApps = apps;
    const stages = [
      { status: 'new',              label: 'Nouveaux',        color: '#6B7280' },
      { status: 'prequalification', label: 'Préqualification', color: '#3B82F6' },
      { status: 'documents',        label: 'Documents',        color: '#F97316' },
      { status: 'visite',           label: 'Visites',          color: '#8B5CF6' },
      { status: 'decision',         label: 'Décision',         color: '#EAB308' },
      { status: 'signature',        label: 'Signature',        color: '#2C7A5E' },
    ];
    const total = apps.length || 1;
    this.pipeline.set(stages.map(s => ({
      ...s,
      count: apps.filter(a => a.status === s.status).length,
      pct:   Math.round(apps.filter(a => a.status === s.status).length / total * 100),
    })));
  }

  visitsCount = signal(0);
  nextVisit   = signal<{ startsAt: string; campaignTitle: string; candidateName?: string } | null>(null);
  private lastCampaigns: Campaign[] = [];

  loadVisits(): void {
    this.vSvc.upcoming().subscribe({
      next: (res) => {
        this.visitsCount.set(res.data.length);
        this.nextVisit.set(res.data[0] ?? null);
        this.buildKpis(this.lastCampaigns);
      },
      error: () => {},
    });
  }

  nextVisitLabel(): string {
    const v = this.nextVisit();
    if (!v) return 'Cette semaine';
    const d = new Date(v.startsAt);
    return `Prochaine : ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private allApps: { status: string }[] = [];

  successRate(): string {
    const decided = this.allApps.filter(a => a.status === 'accepted' || a.status === 'refused');
    if (!decided.length) return '—';
    const accepted = decided.filter(a => a.status === 'accepted').length;
    return Math.round(accepted / decided.length * 100) + '%';
  }

  successRateLabel(): string {
    const decided = this.allApps.filter(a => a.status === 'accepted' || a.status === 'refused').length;
    return decided > 0 ? `Sur ${decided} décision${decided > 1 ? 's' : ''}` : 'Aucune décision encore';
  }

  dailyTip(): string {
    const tips = [
      'Répondez aux candidatures sous 24h : les propriétaires réactifs signent leur bail 2x plus vite.',
      'Ajoutez des créneaux de visite dès la publication — les candidats réservent surtout dans les 48 premières heures.',
      'Complétez votre profil public (Mon profil) : une bio rassure les candidats et attire des dossiers plus complets.',
      'Précisez les documents requis dans votre annonce : vous recevrez des dossiers complets du premier coup.',
      'Utilisez le kanban pour ne perdre aucun candidat : déplacez chaque dossier dès que vous le traitez.',
    ];
    return tips[new Date().getDate() % tips.length];
  }

  buildKpis(cs: Campaign[]): void {
    this.lastCampaigns = cs;
    const active = cs.filter(c => c.status === 'active').length;
    const total  = cs.reduce((s, c) => s + (c.applicationCount ?? 0), 0);

    this.kpis.set([
      { label: 'Campagnes actives', value: active, trend: `${cs.length} au total`,
        icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
        color: '#2C7A5E', bgColor: '#E0EDE8',
        spark: this.spark },
      { label: 'Candidatures totales', value: total, trend: total > 0 ? 'Toutes campagnes confondues' : 'Aucune pour le moment',
        icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
        color: '#3B82F6', bgColor: '#EFF6FF',
        spark: this.spark.map(v => v * 0.8) },
      { label: 'Visites à venir', value: this.visitsCount(), trend: this.nextVisitLabel(),
        icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
        color: '#8B5CF6', bgColor: '#F5F3FF',
        spark: this.spark.map(v => v * 0.3) },
      { label: 'Taux de réussite', value: this.successRate(), trend: this.successRateLabel(),
        icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: '#F97316', bgColor: '#FFF7ED',
        spark: this.spark.map(v => v * 0.6) },
    ]);
  }

  statusLabel(s: string): string { return CampaignService.statusLabel(s); }
  statusColor(s: string): string { return CampaignService.statusColor(s); }
  statusBg(s: string): string {
    const c = this.statusColor(s);
    return c + '18';
  }
  appStatusColor(s: string): string { return ApplicationService.statusColor(s); }
  resolvePhotoUrl(url: string): string { return PhotoService.resolveUrl(url); }
}
