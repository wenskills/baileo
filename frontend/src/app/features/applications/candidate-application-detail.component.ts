import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApplicationService, Application } from '../../core/services/application.service';
import { VisitService, TimelineEvent } from '../../core/services/visit.service';

interface ShareInfo { id: string; applicationId: string; status: string; sharedAt: string }
type CandidateApplicationDetail = Application & {
  documentsRequired?: string[];
  myDocuments?: { type: string; status: string; reviewComment?: string | null }[];
};

/**
 * Suivi de candidature — côté CANDIDAT (spec : Candidate Journey Tracker).
 * « Le candidat ne doit jamais avoir l'impression d'avoir envoyé son dossier
 * dans le vide. » Journey visuel, checklist documents, timeline visible,
 * sécurité du dossier, retrait de candidature.
 */
@Component({
  selector: 'app-candidate-application-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="p-6 max-w-3xl mx-auto"><div class="card p-8 animate-pulse"><div class="h-5 bg-gray-100 rounded w-1/2"></div></div></div>
    } @else if (app()) {
      <div class="p-6 max-w-3xl mx-auto space-y-4">

        <!-- Hero logement -->
        <div class="card p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <a routerLink="/mes-candidatures" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;text-decoration:none">← Mes candidatures</a>
              <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-top:.25rem">
                {{ app()!.campaign?.title || 'Candidature' }}
              </h1>
              <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">
                {{ app()!.campaign?.address }}
                @if (ownerName()) { · Propriétaire : {{ ownerName() }} }
              </p>
            </div>
            <span class="px-3 py-1.5 rounded-xl shrink-0"
                  [style.background]="statusColor(app()!.status) + '18'" [style.color]="statusColor(app()!.status)"
                  style="font-size:.75rem;font-weight:700;font-family:Inter,sans-serif">
              {{ statusLabel(app()!.status) }}
            </span>
          </div>
          <!-- Phrase de suivi humaine (spec : réduire le stress du silence) -->
          <div class="mt-3 p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #C8DDD7">
            <p style="font-size:.875rem;font-weight:600;color:#1B4438;font-family:Inter,sans-serif">{{ statusPhrase() }}</p>
          </div>
        </div>

        <!-- Journey : les étapes du parcours (jamais le pipeline interne) -->
        <div class="card p-5">
          <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:1rem">Votre parcours</h3>
          <div class="flex items-start">
            @for (step of journey(); track step.key; let i = $index) {
              <div class="flex-1 flex flex-col items-center" style="position:relative">
                @if (i > 0) {
                  <div style="position:absolute;left:-50%;top:.8rem;width:100%;height:2px"
                       [style.background]="step.state !== 'todo' ? '#2C7A5E' : '#E5E7EB'"></div>
                }
                <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style="position:relative;z-index:1"
                     [style.background]="step.state === 'done' ? '#2C7A5E' : (step.state === 'current' ? 'white' : '#F3F4F6')"
                     [style.border]="step.state === 'current' ? '2px solid #2C7A5E' : 'none'">
                  @if (step.state === 'done') {
                    <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  } @else {
                    <span style="font-size:.625rem;font-weight:700;font-family:Inter,sans-serif"
                          [style.color]="step.state === 'current' ? '#1B4438' : '#9CA3AF'">{{ i + 1 }}</span>
                  }
                </div>
                <p class="text-center mt-1.5 px-1" style="font-size:.625rem;font-weight:600;font-family:Inter,sans-serif;line-height:1.3"
                   [style.color]="step.state === 'todo' ? '#9CA3AF' : '#0A1F1A'">{{ step.label }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Checklist documents (requis par l'annonce vs votre dossier) -->
        @if (checklist().length) {
          <div class="card p-5">
            <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
              Documents demandés
            </h3>
            <div class="space-y-2">
              @for (d of checklist(); track d.type) {
                <div class="flex items-center justify-between p-2.5 rounded-xl" style="border:1px solid #F0F0F0">
                  <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">{{ docLabel(d.type) }}</span>
                  @if (d.state === 'validated') {
                    <span class="px-2 py-0.5 rounded-lg" style="font-size:.6875rem;font-weight:700;background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">Validé ✓</span>
                  } @else if (d.state === 'rejected') {
                    <a routerLink="/rental-passport" class="px-2 py-0.5 rounded-lg" style="font-size:.6875rem;font-weight:700;background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif;text-decoration:none">À remplacer →</a>
                  } @else if (d.state === 'uploaded') {
                    <span class="px-2 py-0.5 rounded-lg" style="font-size:.6875rem;font-weight:700;background:#F3F4F6;color:#6B7280;font-family:Inter,sans-serif">En vérification</span>
                  } @else {
                    <a routerLink="/rental-passport" class="px-2 py-0.5 rounded-lg" style="font-size:.6875rem;font-weight:700;background:#FFF7ED;color:#F97316;font-family:Inter,sans-serif;text-decoration:none">Manquant — ajouter →</a>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Actions : messagerie + visites -->
        <div class="grid grid-cols-2 gap-3">
          <a [routerLink]="['/messages']" [queryParams]="{application: app()!.id}"
             class="card p-4 text-center transition-all hover:-translate-y-0.5" style="text-decoration:none">
            <p style="font-size:.875rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">Messagerie</p>
            <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Échanger avec le propriétaire</p>
          </a>
          <a routerLink="/mes-candidatures" class="card p-4 text-center transition-all hover:-translate-y-0.5" style="text-decoration:none">
            <p style="font-size:.875rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">Visites</p>
            <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Créneaux et réservations</p>
          </a>
        </div>

        <!-- Timeline visible (filtrée serveur : jamais l'interne) -->
        <div class="card p-5">
          <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Historique</h3>
          @if (timeline().length) {
            <div class="space-y-3">
              @for (e of timeline(); track e.id) {
                <div class="flex gap-3">
                  <div class="flex flex-col items-center">
                    <span class="w-2 h-2 rounded-full mt-1.5" style="background:#2C7A5E"></span>
                    @if (!$last) { <span class="flex-1 w-px" style="background:#E5E7EB;min-height:1rem"></span> }
                  </div>
                  <div class="pb-1">
                    <p style="font-size:.8125rem;color:#0A1F1A;font-family:Inter,sans-serif">{{ e.message }}</p>
                    <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ e.createdAt | date:'d MMM à HH:mm' }}</p>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">Votre dossier vient d'être déposé.</p>
          }
        </div>

        <!-- Sécurité du dossier (Privacy & Trust UX) -->
        <div class="card p-5" style="border:1.5px solid #C8DDD7">
          <h3 class="flex items-center gap-2" style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">
            <svg class="w-4 h-4" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            Sécurité de votre dossier
          </h3>
          <ul class="space-y-1.5" style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif;list-style:none;padding:0">
            <li>· Votre dossier est partagé <strong>uniquement</strong> avec ce propriétaire ({{ shareStatus() }}).</li>
            @if (app()!.viewedAt) { <li>· Dossier consulté le {{ app()!.viewedAt | date:'d MMMM à HH:mm' }}.</li> }
            <li>· Chaque consultation de vos documents est <strong>journalisée</strong>.</li>
            <li>· Les notes internes du propriétaire ne vous concernent jamais nominativement et ne vous sont pas opposables.</li>
          </ul>
          @if (canWithdraw()) {
            <button type="button" (click)="withdraw()" [disabled]="withdrawing()"
                    class="mt-3 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                    style="border:1.5px solid #FECACA;color:#DC2626;background:white;cursor:pointer;font-family:Inter,sans-serif">
              {{ withdrawing() ? 'Retrait...' : 'Retirer ma candidature' }}
            </button>
            <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.375rem">
              Le retrait révoque immédiatement le partage de votre dossier. L'historique est conservé.
            </p>
          }
          @if (error()) { <p class="mt-2" style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p> }
        </div>
      </div>
    } @else {
      <div class="p-6 max-w-3xl mx-auto card p-8 text-center">
        <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Candidature introuvable</p>
        <a routerLink="/mes-candidatures" style="font-size:.8125rem;color:#2C7A5E;font-family:Inter,sans-serif">← Retour à mes candidatures</a>
      </div>
    }
  `,
})
export class CandidateApplicationDetailComponent implements OnInit {
  app      = signal<CandidateApplicationDetail | null>(null);
  timeline = signal<TimelineEvent[]>([]);
  shares   = signal<ShareInfo[]>([]);
  loading  = signal(true);
  withdrawing = signal(false);
  error    = signal('');

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private vSvc: VisitService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<CandidateApplicationDetail>(`${environment.apiUrl}/applications/${id}`).subscribe({
      next: (a) => { this.app.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.vSvc.timeline(id).subscribe({
      next: (res) => this.timeline.set(res.data),
      error: () => {},
    });
    this.http.get<{ data: ShareInfo[] }>(`${environment.apiUrl}/passport/shares`).subscribe({
      next: (res) => this.shares.set(res.data ?? []),
      error: () => {},
    });
  }

  ownerName(): string {
    return (this.app()?.campaign as { ownerName?: string } | undefined)?.ownerName ?? '';
  }

  statusLabel(s: string): string {
    if (s === 'withdrawn') return 'Retirée';
    return ApplicationService.statusLabel(s);
  }
  statusColor(s: string): string {
    if (s === 'withdrawn') return '#9CA3AF';
    return ApplicationService.statusColor(s);
  }

  statusPhrase(): string {
    const a = this.app(); if (!a) return '';
    switch (a.status) {
      case 'new':              return a.viewedAt ? 'Le propriétaire a consulté votre dossier. Vous serez notifié de la suite.' : 'Votre dossier est bien reçu. Le propriétaire va en prendre connaissance.';
      case 'prequalification': return 'Votre dossier est en cours d\'étude. Vous serez notifié dès qu\'une visite ou une décision sera proposée.';
      case 'documents':        return 'Le propriétaire attend des documents — consultez la checklist ci-dessous.';
      case 'visite':           return 'Étape visite : réservez ou préparez votre visite du logement.';
      case 'decision':         return 'Une décision est en préparation. Vous serez notifié dès qu\'elle sera prise.';
      case 'signature':        return 'Votre dossier est retenu — le bail est en préparation.';
      case 'accepted':         return 'Félicitations, votre candidature est acceptée 🎉';
      case 'waitlist':         return 'Vous êtes sur liste d\'attente — le propriétaire conserve votre dossier.';
      case 'refused':          return 'Votre candidature n\'a pas été retenue cette fois.';
      case 'withdrawn':        return 'Vous avez retiré cette candidature. Le partage de votre dossier est révoqué.';
      case 'cancelled':        return 'Cette candidature a été annulée.';
      default:                 return 'Votre dossier est bien reçu.';
    }
  }

  /** Étapes du parcours candidat (jamais le pipeline interne) */
  journey = computed(() => {
    const s = this.app()?.status ?? 'new';
    const order = ['new', 'prequalification', 'documents', 'visite', 'decision', 'signature'];
    const closed = ['accepted', 'waitlist', 'refused', 'cancelled', 'withdrawn'].includes(s);
    const idx = closed ? order.length : Math.max(order.indexOf(s), 0);
    const steps = [
      { key: 'received', label: 'Dossier reçu' },
      { key: 'review',   label: 'Étude du dossier' },
      { key: 'docs',     label: 'Documents' },
      { key: 'visit',    label: 'Visite' },
      { key: 'decision', label: 'Décision' },
      { key: 'answer',   label: 'Réponse' },
    ];
    return steps.map((st, i) => ({
      ...st,
      state: closed ? 'done' : (i < idx ? 'done' : i === idx ? 'current' : 'todo'),
    }));
  });

  /** Checklist : documents requis par l'annonce croisés avec le dossier */
  checklist = computed(() => {
    const a = this.app(); if (!a) return [];
    const mine = new Map((a.myDocuments ?? []).map(d => [d.type, d]));
    return (a.documentsRequired ?? []).map(type => {
      const d = mine.get(type);
      return { type, state: d ? (d.status === 'validated' ? 'validated' : d.status === 'rejected' ? 'rejected' : 'uploaded') : 'missing' };
    });
  });

  docLabel(type: string): string {
    const map: Record<string, string> = {
      identity: 'Pièce d\'identité', domicile: 'Justificatif de domicile',
      contract: 'Contrat de travail', payslips: 'Fiches de paie',
      tax: 'Avis d\'imposition', rib: 'RIB', insurance: 'Attestation d\'assurance',
      guarantor_id: 'Pièce d\'identité du garant', guarantor_income: 'Revenus du garant',
    };
    return map[type] ?? type;
  }

  shareStatus(): string {
    const share = this.shares().find(sh => sh.applicationId === this.app()?.id);
    return share?.status === 'revoked' ? 'partage révoqué' : 'partage actif';
  }

  canWithdraw(): boolean {
    const s = this.app()?.status ?? '';
    return !['withdrawn', 'accepted', 'refused', 'cancelled'].includes(s);
  }

  withdraw(): void {
    const a = this.app(); if (!a) return;
    if (!confirm('Retirer votre candidature ? Le propriétaire sera notifié et le partage de votre dossier sera révoqué. Cette action est définitive.')) return;
    this.withdrawing.set(true);
    this.error.set('');
    this.http.post<{ status: string }>(`${environment.apiUrl}/applications/${a.id}/withdraw`, {}).subscribe({
      next: () => {
        this.withdrawing.set(false);
        this.app.update(x => x ? { ...x, status: 'withdrawn' } : x);
      },
      error: (e) => {
        this.withdrawing.set(false);
        this.error.set(e?.error?.error || 'Retrait impossible.');
      },
    });
  }
}
