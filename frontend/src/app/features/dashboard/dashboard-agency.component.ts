import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ActionCenterComponent } from '../../shared/action-center.component';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';

interface AgencyDashboardData {
  kpis: { activeCampaigns: number; totalApplications: number; upcomingVisits: number; pendingDecisions: number };
  pipeline: Record<string, number>;
  todayVisits: { time: string; title: string; candidate: string; status: string }[];
  activity: { who: string; what: string; at: string }[];
}

interface AgentDayData {
  kpis: { assignedFiles: number; todayVisits: number; urgent: number };
  files: { applicationId: string; candidateName: string; campaignTitle: string; status: string; nextAction: string; urgent: boolean }[];
  todayVisits: { time: string; candidate: string; status: string; applicationId: string }[];
}

/**
 * Dashboard AGENCE (admin/manager) — spec Wendy : « l'activité globale de
 * votre agence », pas l'activité personnelle. Pilotage : volume, équipe,
 * priorités, agenda, activité temps réel.
 */
@Component({
  selector: 'app-dashboard-agency',
  standalone: true,
  imports: [CommonModule, RouterLink, ActionCenterComponent],
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Vue d'ensemble</h1>
      <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1.25rem">
        Bonjour {{ firstName() }}, voici l'activité globale de votre agence.
      </p>

      <!-- KPI organisation -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        @for (k of kpis(); track k.label) {
          <div class="card p-4">
            <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.875rem;color:#0A1F1A">{{ k.value }}</p>
            <p style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">{{ k.label }}</p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-5">
          <!-- Pipeline organisation -->
          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 style="font-size:1rem;font-weight:800;color:#0A1F1A;font-family:Inter,sans-serif">Pipeline des candidatures</h3>
              <a routerLink="/agence/candidatures" style="font-size:.75rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif;text-decoration:none">Tout voir →</a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              @for (s of pipelineCols(); track s.key) {
                <div class="p-3 rounded-xl text-center" style="background:#F8FBF9;border:1px solid #EDF3EF">
                  <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.375rem;color:#1B4438">{{ s.count }}</p>
                  <p style="font-size:.6875rem;color:#6B7280;font-family:Inter,sans-serif">{{ s.label }}</p>
                </div>
              }
            </div>
          </div>

          <!-- Tâches prioritaires organisation -->
          <app-action-center/>
        </div>

        <div class="space-y-5">
          <!-- Agenda du jour -->
          <div class="card p-5">
            <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Agenda du jour</h3>
            @for (v of todayVisits(); track v.time + v.candidate) {
              <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid #F5F7F6">
                <span style="font-size:.8125rem;font-weight:800;color:#1B4438;font-family:Inter,sans-serif;min-width:2.75rem">{{ v.time }}</span>
                <div class="flex-1 min-w-0">
                  <p class="truncate" style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ v.title }}</p>
                  <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ v.candidate }}</p>
                </div>
                <span class="px-1.5 py-0.5 rounded shrink-0" style="font-size:.5625rem;font-weight:700;font-family:Inter,sans-serif"
                      [style.background]="v.status === 'confirmed' ? '#E0EDE8' : '#FFF7ED'"
                      [style.color]="v.status === 'confirmed' ? '#1B4438' : '#F97316'">
                  {{ v.status === 'confirmed' ? 'Confirmée' : 'À confirmer' }}
                </span>
              </div>
            } @empty {
              <p style="font-size:.75rem;color:#D1D5DB;font-family:Inter,sans-serif">Aucune visite aujourd'hui.</p>
            }
          </div>

          <!-- Activité récente équipe -->
          <div class="card p-5">
            <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Activité récente</h3>
            @for (a of activity(); track a.at) {
              <p class="py-1.5" style="font-size:.75rem;color:#374151;font-family:Inter,sans-serif;border-bottom:1px solid #FAFAFA">
                <strong>{{ a.who }}</strong> {{ a.what }}
                <span style="color:#D1D5DB"> · {{ a.at | date:'HH:mm' }}</span>
              </p>
            } @empty {
              <p style="font-size:.75rem;color:#D1D5DB;font-family:Inter,sans-serif">Aucune activité récente.</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardAgencyComponent implements OnInit {
  data = signal<AgencyDashboardData | null>(null);

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.http.get<AgencyDashboardData>(`${environment.apiUrl}/agency/dashboard`).subscribe({
      next: (d) => this.data.set(d),
      error: () => {},
    });
  }

  firstName(): string { return this.auth.currentUser()?.firstName ?? ''; }

  kpis(): { label: string; value: number }[] {
    const k = this.data()?.kpis;
    if (!k) return [{ label: 'Campagnes actives', value: 0 }, { label: 'Candidatures totales', value: 0 }, { label: 'Visites à venir', value: 0 }, { label: 'Décisions en attente', value: 0 }];
    return [
      { label: 'Campagnes actives', value: k.activeCampaigns },
      { label: 'Candidatures totales', value: k.totalApplications },
      { label: 'Visites à venir', value: k.upcomingVisits },
      { label: 'Décisions en attente', value: k.pendingDecisions },
    ];
  }

  pipelineCols(): { key: string; label: string; count: number }[] {
    const p = this.data()?.pipeline ?? {};
    return [
      { key: 'new', label: 'Nouvelles', count: p['new'] ?? 0 },
      { key: 'documents', label: 'Documents', count: (p['prequalification'] ?? 0) + (p['documents'] ?? 0) },
      { key: 'visite', label: 'Visites', count: p['visite'] ?? 0 },
      { key: 'decision', label: 'Décision', count: (p['decision'] ?? 0) + (p['signature'] ?? 0) },
    ];
  }

  todayVisits() { return this.data()?.todayVisits ?? []; }
  activity()    { return this.data()?.activity ?? []; }
}

/**
 * Dashboard AGENT — spec Wendy : « Qu'est-ce que je dois faire maintenant ? »
 * Opérationnel, pas analytique : mes dossiers assignés, mes visites, mes priorités.
 */
@Component({
  selector: 'app-dashboard-agent',
  standalone: true,
  imports: [CommonModule, RouterLink, ActionCenterComponent],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Mon tableau de bord</h1>
      <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1.25rem">
        Bonjour {{ firstName() }}, voici vos dossiers et tâches du jour.
      </p>

      <div class="grid grid-cols-3 gap-4 mb-5">
        @for (k of kpis(); track k.label) {
          <div class="card p-4">
            <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.875rem;color:#0A1F1A">{{ k.value }}</p>
            <p style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">{{ k.label }}</p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-5">
          <!-- Mes dossiers assignés -->
          <div class="card p-5">
            <h3 style="font-size:1rem;font-weight:800;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Mes dossiers assignés</h3>
            @for (f of files(); track f.applicationId) {
              <a [routerLink]="['/candidatures', f.applicationId]"
                 class="flex items-center gap-3 py-2.5 hover:bg-green-50 -mx-2 px-2 rounded-lg transition-colors"
                 style="text-decoration:none;border-bottom:1px solid #F5F7F6">
                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                  <span style="font-size:.6875rem;font-weight:700;color:white;font-family:Inter,sans-serif">{{ f.candidateName.charAt(0) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ f.candidateName }}</p>
                  <p class="truncate" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ f.campaignTitle }}</p>
                </div>
                <span class="px-2 py-0.5 rounded-full shrink-0"
                      [style.background]="statusColor(f.status) + '18'" [style.color]="statusColor(f.status)"
                      style="font-size:.625rem;font-weight:700;font-family:Inter,sans-serif">{{ statusLabel(f.status) }}</span>
                <span class="px-2 py-0.5 rounded-lg shrink-0"
                      [style.background]="f.urgent ? '#FEF2F2' : '#F5F7F6'" [style.color]="f.urgent ? '#DC2626' : '#374151'"
                      style="font-size:.6875rem;font-weight:700;font-family:Inter,sans-serif">{{ f.nextAction }}</span>
              </a>
            } @empty {
              <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
                Aucun dossier assigné pour le moment — votre manager peut vous en assigner depuis une fiche candidature.
              </p>
            }
          </div>

          <app-action-center/>
        </div>

        <div class="space-y-5">
          <!-- Mes visites du jour -->
          <div class="card p-5">
            <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Visites du jour</h3>
            @for (v of visits(); track v.time + v.candidate) {
              <a [routerLink]="['/candidatures', v.applicationId]"
                 class="flex items-center gap-3 py-2" style="text-decoration:none;border-bottom:1px solid #F5F7F6">
                <span style="font-size:.8125rem;font-weight:800;color:#1B4438;font-family:Inter,sans-serif;min-width:2.75rem">{{ v.time }}</span>
                <span class="flex-1" style="font-size:.8125rem;color:#0A1F1A;font-family:Inter,sans-serif">{{ v.candidate }}</span>
                <span class="px-1.5 py-0.5 rounded shrink-0" style="font-size:.5625rem;font-weight:700;font-family:Inter,sans-serif"
                      [style.background]="v.status === 'confirmed' ? '#E0EDE8' : '#FFF7ED'"
                      [style.color]="v.status === 'confirmed' ? '#1B4438' : '#F97316'">
                  {{ v.status === 'confirmed' ? 'Confirmée' : 'À confirmer' }}
                </span>
              </a>
            } @empty {
              <p style="font-size:.75rem;color:#D1D5DB;font-family:Inter,sans-serif">Aucune visite aujourd'hui.</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardAgentComponent implements OnInit {
  data = signal<AgentDayData | null>(null);

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.http.get<AgentDayData>(`${environment.apiUrl}/agency/my-day`).subscribe({
      next: (d) => this.data.set(d),
      error: () => {},
    });
  }

  firstName(): string { return this.auth.currentUser()?.firstName ?? ''; }

  kpis(): { label: string; value: number }[] {
    const k = this.data()?.kpis;
    return [
      { label: 'Dossiers assignés', value: k?.assignedFiles ?? 0 },
      { label: 'Visites aujourd\'hui', value: k?.todayVisits ?? 0 },
      { label: 'Actions urgentes', value: k?.urgent ?? 0 },
    ];
  }

  files()  { return this.data()?.files ?? []; }
  visits() { return this.data()?.todayVisits ?? []; }
  statusLabel(s: string): string { return ApplicationService.statusLabel(s); }
  statusColor(s: string): string { return ApplicationService.statusColor(s); }
}
