import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

interface FollowData {
  ownerName: string;
  campaignTitle: string;
  campaignStatus: string;
  milestone: string;
  stats: {
    applicationsTotal: number; applicationsActive: number; documentsStage: number;
    visitsUpcoming: number; visitsDone: number; decisionStage: number; accepted: number;
  };
  updatedAt: string;
}

/**
 * Suivi propriétaire (public, via token) — l'agence donne au propriétaire
 * réel du bien une vue transparente de l'avancement : jalons + compteurs,
 * JAMAIS l'identité des candidats.
 */
@Component({
  selector: 'app-campaign-follow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen p-6" style="background:#F5F7F6">
      <div class="max-w-2xl mx-auto">
        @if (data(); as d) {
          <div class="text-center mb-6 pt-6">
            <p style="font-size:.6875rem;font-weight:800;letter-spacing:.1em;color:#2C7A5E;font-family:Inter,sans-serif">SUIVI DE MISE EN LOCATION</p>
            <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.75rem;color:#0A1F1A">{{ d.campaignTitle }}</h1>
            <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">
              Bonjour {{ d.ownerName }} — votre agence partage avec vous l'avancement en toute transparence.
            </p>
          </div>

          <!-- Jalon actuel -->
          <div class="card p-5 mb-4 text-center" style="border:1.5px solid #C8DDD7;background:white">
            <p style="font-size:.6875rem;font-weight:700;color:#9CA3AF;font-family:Inter,sans-serif;text-transform:uppercase;letter-spacing:.05em">Où en est-on</p>
            <p style="font-size:1.125rem;font-weight:800;color:#1B4438;font-family:Inter,sans-serif">{{ d.milestone }}</p>
          </div>

          <!-- Compteurs -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            @for (kpi of kpis(); track kpi.label) {
              <div class="card p-4 text-center">
                <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.75rem;color:#0A1F1A">{{ kpi.value }}</p>
                <p style="font-size:.6875rem;color:#6B7280;font-family:Inter,sans-serif">{{ kpi.label }}</p>
              </div>
            }
          </div>

          <div class="card p-4">
            <p class="flex items-center gap-2" style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
              <svg class="w-3.5 h-3.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
              Confidentialité : cette page présente des compteurs et jalons uniquement.
              L'identité des candidats et le contenu des dossiers ne sont jamais exposés (RGPD).
            </p>
            <p class="mt-1.5" style="font-size:.6875rem;color:#D1D5DB;font-family:Inter,sans-serif">
              Actualisé le {{ d.updatedAt | date:'d MMMM à HH:mm' }} · Propulsé par Baileo
            </p>
          </div>
        } @else if (error()) {
          <div class="card p-8 text-center mt-16">
            <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Lien de suivi indisponible</p>
            <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">{{ error() }}</p>
          </div>
        } @else {
          <div class="card p-8 animate-pulse mt-16"><div class="h-5 bg-gray-100 rounded w-2/3 mx-auto"></div></div>
        }
      </div>
    </div>
  `,
})
export class CampaignFollowComponent implements OnInit {
  data  = signal<FollowData | null>(null);
  error = signal('');

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.http.get<FollowData>(`${environment.apiUrl}/follow/${token}`).subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(e?.error?.error?.message || 'Ce lien est invalide ou a été révoqué par l\'agence.'),
    });
  }

  kpis(): { label: string; value: number }[] {
    const s = this.data()?.stats;
    if (!s) return [];
    return [
      { label: 'Candidatures reçues', value: s.applicationsTotal },
      { label: 'Dossiers actifs', value: s.applicationsActive },
      { label: 'Visites à venir', value: s.visitsUpcoming },
      { label: 'Visites réalisées', value: s.visitsDone },
      { label: 'En décision', value: s.decisionStage },
      { label: 'Locataire retenu', value: s.accepted },
    ];
  }
}
