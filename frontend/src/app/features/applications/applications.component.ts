import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApplicationService, Application, PipelineColumn } from '../../core/services/application.service';
import { CampaignService, Campaign, PaginatedResponse } from '../../core/services/campaign.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .kanban-col { min-height: 400px; }
    .kanban-card {
      background: white; border-radius: .75rem; padding: .875rem;
      border: 1.5px solid #F0F0F0; cursor: pointer;
      transition: all .15s; margin-bottom: .625rem;
    }
    .kanban-card:hover { border-color: #E0EDE8; box-shadow: 0 4px 12px rgba(0,0,0,.06); transform: translateY(-1px); }
    .kanban-card.selected { border-color: #2C7A5E; box-shadow: 0 4px 16px rgba(44,122,94,.15); }
    .score-ring { position:relative;display:inline-flex;align-items:center;justify-content:center; }
    .btn-status {
      padding: .25rem .625rem; border-radius: .375rem; font-size: .6875rem; font-weight: 700;
      font-family: Inter, sans-serif; border: none; cursor: pointer; transition: all .15s;
    }
  `],
  template: `
    <div class="flex flex-col h-full">

      <!-- Header -->
      <div class="px-6 py-4 bg-white shrink-0" style="border-bottom:1px solid #F0F0F0">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1" style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
              <a routerLink="/campagnes" class="hover:text-gray-700">Campagnes</a>
              <span>›</span>
              <span style="color:#374151">{{ campaign()?.title ?? 'Toutes les campagnes' }}</span>
            </div>
            <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.25rem;color:#0A1F1A">
              Candidatures
              @if (campaign()) {
                <span class="ml-2 px-2 py-0.5 rounded-full text-sm font-semibold"
                      style="background:#E0EDE8;color:#1B4438">
                  Actif
                </span>
              }
            </h1>
            <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
              {{ apps().length }} candidats au total
            </p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input [(ngModel)]="search" placeholder="Rechercher un candidat..."
                     class="pl-8 pr-3 py-2 rounded-xl border text-sm bg-white"
                     style="border-color:#E5E7EB;font-family:Inter,sans-serif;outline:none;width:200px"/>
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mt-3">
          @for (tab of tabs; track tab) {
            <button type="button"
                    (click)="activeTab = tab"
                    class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style="font-family:Inter,sans-serif"
                    [style.background]="activeTab === tab ? '#0A1F1A' : 'transparent'"
                    [style.color]="activeTab === tab ? 'white' : '#6B7280'">
              {{ tab }}
            </button>
          }
        </div>
      </div>

      <!-- Kanban body -->
      <div class="flex-1 overflow-x-auto">

        @if (activeTab === 'Liste') {
          <div class="p-5 space-y-3 max-w-4xl">
            @for (app of apps(); track app.id) {
              <div class="bg-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 transition-all"
                   style="border:1.5px solid #F0F0F0"
                   (click)="selectApp(app)">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                     style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">{{ initials(app) }}</div>
                <div class="flex-1 min-w-0">
                  <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif" class="truncate">
                    {{ app.candidate?.firstName }} {{ app.candidate?.lastName }}</p>
                  <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ app.campaign?.title }}</p>
                </div>
                @if (app.score !== null && app.score !== undefined) {
                  <span class="text-xs font-bold px-2 py-1 rounded-lg" [style.color]="app.scoreColor" [style.background]="app.scoreColor + '18'">
                    {{ app.score }}/100
                  </span>
                }
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                      [style.background]="statusColor(app.status) + '18'"
                      [style.color]="statusColor(app.status)">{{ statusLabel(app.status) }}</span>
              </div>
            } @empty {
              <p style="text-align:center;color:#9CA3AF;padding:3rem;font-family:Inter,sans-serif">Aucune candidature.</p>
            }
          </div>
        }

        @if (activeTab === 'Analyse') {
          <div class="p-5 max-w-2xl">
            <div class="bg-white rounded-xl p-5" style="border:1.5px solid #F0F0F0">
              <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:1rem">Répartition par statut</h3>
              @for (col of pipeline(); track col.status) {
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-3 h-3 rounded-full shrink-0" [style.background]="col.color"></div>
                  <span style="font-size:.875rem;color:#374151;flex:1;font-family:Inter,sans-serif">{{ col.label }}</span>
                  <span style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ col.applications.length }}</span>
                  <div class="w-32 h-2 rounded-full overflow-hidden" style="background:#F5F7F6">
                    <div class="h-full rounded-full" [style.background]="col.color"
                         [style.width]="apps().length ? (col.applications.length / apps().length * 100) + '%' : '0%'"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (activeTab === 'Pipeline') {
        <div class="flex gap-3 p-5" style="min-width:900px;height:100%">

          @for (col of pipeline(); track col.status) {
            <div class="shrink-0 kanban-col"
                 style="width:175px">
              <!-- Col header -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full" [style.background]="col.color"></div>
                  <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ col.label }}
                  </span>
                </div>
                <span class="px-1.5 py-0.5 rounded text-xs font-bold"
                      [style.background]="col.color + '18'"
                      [style.color]="col.color">
                  {{ col.applications.length }}
                </span>
              </div>

              <!-- Cards -->
              <div>
                @for (app of filteredApps(col.applications); track app.id) {
                  <div class="kanban-card"
                       [class.selected]="selectedApp()?.id === app.id"
                       (click)="selectApp(app)">
                    <!-- Avatar + nom -->
                    <div class="flex items-center gap-2 mb-2">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                           style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                        {{ initials(app) }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <p style="font-size:.75rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ app.candidate?.firstName }} {{ app.candidate?.lastName }}
                        </p>
                        <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ app.campaign?.title }}
                        </p>
                      </div>
                    </div>

                    <!-- Score badge -->
                    @if (app.score !== null && app.score !== undefined) {
                      <div class="flex items-center gap-1.5">
                        <span class="score-badge px-1.5 py-0.5 rounded text-xs font-bold"
                              [style.color]="app.scoreColor"
                              [style.background]="app.scoreColor + '18'">
                          {{ app.score }}/100
                        </span>
                        <span style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">
                          {{ app.scoreLabel }}
                        </span>
                      </div>
                    } @else {
                      <span class="text-xs" style="color:#D1D5DB;font-family:Inter,sans-serif">Sans score</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Sidebar detail -->
          @if (selectedApp()) {
            <div class="shrink-0 overflow-y-auto"
                 style="width:280px;background:white;border-radius:.875rem;border:1.5px solid #E5E7EB;padding:1rem;height:fit-content;max-height:calc(100vh - 200px);position:sticky;top:0">
              <!-- Close -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                       style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                    {{ initials(selectedApp()!) }}
                  </div>
                  <div>
                    <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                      {{ selectedApp()!.candidate?.firstName }} {{ selectedApp()!.candidate?.lastName }}
                    </p>
                    @if (selectedApp()!.score !== null && selectedApp()!.score !== undefined) {
                      <span class="text-xs font-bold"
                            [style.color]="selectedApp()!.scoreColor">
                        {{ selectedApp()!.score }}/100 · {{ selectedApp()!.scoreLabel }}
                      </span>
                    }
                  </div>
                </div>
                <button type="button" (click)="selectedApp.set(null)"
                        class="w-6 h-6 rounded-full flex items-center justify-center"
                        style="background:#F5F7F6">
                  <svg class="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.75rem">
                {{ selectedApp()!.campaign?.title }}
              </p>

              <!-- Passport info -->
              @if (selectedApp()!.passport) {
                <div class="space-y-2 mb-4 pb-4" style="border-bottom:1px solid #F5F7F6">
                  <p style="font-size:.75rem;font-weight:700;color:#374151;font-family:Inter,sans-serif">Informations clés</p>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div>
                      <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">Revenus</p>
                      <p style="font-size:.75rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                        {{ selectedApp()!.passport!.monthlyIncome ?? '—' }} €
                      </p>
                    </div>
                    <div>
                      <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">Contrat</p>
                      <p style="font-size:.75rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                        {{ (selectedApp()!.passport!.contractType || '—').toUpperCase() }}
                      </p>
                    </div>
                    <div>
                      <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">Garant</p>
                      <p style="font-size:.75rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                        {{ selectedApp()!.passport!.guarantorRelation !== 'none' ? 'Oui' : 'Non' }}
                      </p>
                    </div>
                    <div>
                      <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">Documents</p>
                      <p style="font-size:.75rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                        {{ selectedApp()!.passport!.documentsCount }} pièces
                      </p>
                    </div>
                    <div>
                      <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">Dossier</p>
                      <p style="font-size:.75rem;font-weight:600;font-family:Inter,sans-serif"
                         [style.color]="(selectedApp()!.passport!.completionRate || 0) >= 80 ? '#2C7A5E' : '#F97316'">
                        {{ selectedApp()!.passport!.completionRate }}%
                      </p>
                    </div>
                  </div>
                </div>
              }

              <!-- Pipeline moves -->
              <p style="font-size:.75rem;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-bottom:.5rem">
                Déplacer dans le pipeline
              </p>
              <div class="flex flex-wrap gap-1.5 mb-4">
                @for (s of statuses; track s.value) {
                  <button type="button" class="btn-status"
                          [style.background]="selectedApp()!.status === s.value ? s.color + '25' : '#F5F7F6'"
                          [style.color]="selectedApp()!.status === s.value ? s.color : '#6B7280'"
                          [style.borderColor]="selectedApp()!.status === s.value ? s.color : 'transparent'"
                          style="border:1.5px solid transparent"
                          (click)="moveApp(selectedApp()!, s.value)">
                    {{ s.label }}
                  </button>
                }
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                <a [routerLink]="['/candidatures', selectedApp()!.id]"
                   class="flex-1 py-2 rounded-xl text-xs font-bold text-center"
                   style="background:#0A1F1A;color:white;font-family:Inter,sans-serif;text-decoration:none">
                  Voir le dossier complet
                </a>
              </div>
            </div>
          }
        </div>
        } <!-- end Pipeline tab -->

        <!-- Archives (spec : une candidature terminée n'est jamais supprimée) -->
        @if (archivedApps().length) {
          <div class="mt-6">
            <button type="button" (click)="showArchived.set(!showArchived())"
                    class="flex items-center gap-2 mb-3"
                    style="background:none;border:none;cursor:pointer;font-family:Inter,sans-serif">
              <svg class="w-4 h-4 transition-transform" [style.transform]="showArchived() ? 'rotate(90deg)' : ''"
                   style="color:#6B7280" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
              <span style="font-size:.875rem;font-weight:700;color:#374151">
                Archives ({{ archivedApps().length }})
              </span>
              <span style="font-size:.75rem;color:#9CA3AF">— acceptées, refusées, liste d'attente, annulées</span>
            </button>
            @if (showArchived()) {
              <div class="grid grid-cols-3 gap-3">
                @for (a of archivedApps(); track a.id) {
                  <a [routerLink]="['/candidatures', a.id]" class="card p-4 transition-all hover:-translate-y-0.5"
                     style="text-decoration:none">
                    <div class="flex items-center justify-between">
                      <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                        {{ a.candidate?.firstName }} {{ a.candidate?.lastName }}
                      </p>
                      <span class="px-2 py-0.5 rounded-full"
                            [style.background]="statusColor(a.status) + '18'" [style.color]="statusColor(a.status)"
                            style="font-size:.625rem;font-weight:700;font-family:Inter,sans-serif">
                        {{ statusLabel(a.status) }}
                      </span>
                    </div>
                    <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.25rem">
                      Historique, messages et documents consultables
                    </p>
                  </a>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ApplicationsComponent implements OnInit {
  showArchived = signal(false);

  archivedApps(): Application[] {
    return this.apps().filter(a => ['accepted', 'waitlist', 'refused', 'cancelled'].includes(a.status));
  }

  apps       = signal<Application[]>([]);
  pipeline   = signal<PipelineColumn[]>([]);
  campaign   = signal<Campaign | null>(null);
  selectedApp = signal<Application | null>(null);
  loading    = signal(true);
  search     = '';
  activeTab  = 'Pipeline';
  tabs       = ['Pipeline', 'Liste', 'Analyse'];

  statuses = [
    { value: 'new',             label: 'Nouveau',         color: '#6B7280' },
    { value: 'prequalification', label: 'Préqualif.',     color: '#3B82F6' },
    { value: 'documents',       label: 'Documents',       color: '#F97316' },
    { value: 'visite',          label: 'Visite',          color: '#8B5CF6' },
    { value: 'decision',        label: 'Décision',        color: '#EAB308' },
    { value: 'signature',       label: 'Signature',       color: '#2C7A5E' },
    { value: 'accepted',        label: 'Accepté',         color: '#2C7A5E' },
    { value: 'refused',         label: 'Refusé',          color: '#EF4444' },
  ];

  constructor(private aSvc: ApplicationService, private cSvc: CampaignService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const campaignId = this.route.snapshot.queryParamMap.get('campaign');

    if (campaignId) {
      // Vue Kanban pour une campagne spécifique
      this.cSvc.get(campaignId).subscribe(c => this.campaign.set(c));
      this.aSvc.byCampaign(campaignId, 1, 100).subscribe({
        next: (res) => {
          const as = res.data;
          this.apps.set(as);
          this.pipeline.set(ApplicationService.toPipeline(as));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      // Vue globale : charger les campagnes puis agréger les candidatures
      this.cSvc.list({ limit: 50 }).subscribe({
        next: (res) => {
          const campaigns = res.data; // Extraire .data de PaginatedResponse
          if (!campaigns.length) { this.loading.set(false); this.pipeline.set(ApplicationService.toPipeline([])); return; }

          const activeCampaigns = campaigns.filter(c => c.status === 'active');
          if (!activeCampaigns.length) { this.loading.set(false); this.pipeline.set(ApplicationService.toPipeline([])); return; }

          // Charger les candidatures de la première campagne active (MVP)
          // En production : endpoint /api/owner/all-applications
          const first = activeCampaigns[0];
          this.aSvc.byCampaign(first.id, 1, 100).subscribe({
            next: (res) => {
              const as = res.data;
              this.apps.set(as);
              this.pipeline.set(ApplicationService.toPipeline(as));
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        },
        error: () => { this.loading.set(false); this.pipeline.set(ApplicationService.toPipeline([])); },
      });
    }
  }

  filteredApps(apps: Application[]): Application[] {
    if (!this.search.trim()) return apps;
    const q = this.search.toLowerCase();
    return apps.filter(a =>
      (a.candidate?.firstName + ' ' + a.candidate?.lastName).toLowerCase().includes(q)
    );
  }

  selectApp(app: Application): void {
    this.selectedApp.set(this.selectedApp()?.id === app.id ? null : app);
  }

  moveApp(app: Application, status: string): void {
    const previousStatus = app.status;
    this.aSvc.updateStatus(app.id, status).subscribe({
      next: () => {
        app.status = status;
        this.pipeline.set(ApplicationService.toPipeline(this.apps()));
      },
      error: () => {
        // Rollback visuel : restaurer le statut précédent
        app.status = previousStatus;
        this.pipeline.set(ApplicationService.toPipeline(this.apps()));
      },
    });
  }

  statusLabel(s: string): string { return ApplicationService.statusLabel(s); }
  statusColor(s: string): string { return ApplicationService.statusColor(s); }

  initials(app: Application): string {
    const f = app.candidate?.firstName?.[0] ?? '?';
    const l = app.candidate?.lastName?.[0] ?? '';
    return (f + l).toUpperCase();
  }
}
