import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationService } from '../../core/services/application.service';
import { PassportService } from '../../core/services/passport.service';

/**
 * Dépôt de dossier — parcours candidat (spec module 4 → 7).
 * "Quand le candidat clique sur Déposer mon dossier : s'il est connecté,
 *  créer une candidature ; sinon rediriger vers inscription avec retour."
 *
 * Cette page est la cible du retour : /campagnes/:id/postuler (zone authentifiée).
 * Gestion d'erreurs : 404 annonce, 403 rôle, 409 déjà candidaté, 422/429 backend.
 */
@Component({
  selector: 'app-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      @if (loading()) {
        <div class="card p-8 animate-pulse"><div class="h-6 bg-gray-100 rounded w-1/2"></div></div>
      } @else if (notFound()) {
        <div class="card p-8 text-center">
          <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Annonce introuvable ou non disponible.</p>
          <a routerLink="/tableau-de-bord" class="inline-block mt-3" style="font-size:.875rem;color:#2C7A5E;font-family:Inter,sans-serif">Retour au tableau de bord</a>
        </div>
      } @else if (done()) {
        <div class="card p-8 text-center">
          <div class="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style="background:#E0EDE8">
            <svg class="w-7 h-7" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <p style="font-size:1.125rem;font-weight:800;color:#0A1F1A;font-family:Inter,sans-serif">Dossier déposé !</p>
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-top:.375rem">
            Votre candidature pour « {{ campaign()?.title }} » a bien été transmise au propriétaire.
          </p>
          <div class="flex gap-2 justify-center mt-5">
            <a routerLink="/mes-candidatures"
               class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
               style="background:#1B4438;font-family:Inter,sans-serif">Suivre ma candidature</a>
            <a routerLink="/rental-passport"
               class="px-4 py-2.5 rounded-xl text-sm font-semibold"
               style="border:1.5px solid #E5E7EB;color:#374151;font-family:Inter,sans-serif">Compléter mon dossier</a>
          </div>
        </div>
      } @else {
        <div class="mb-5">
          <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Déposer mon dossier</h1>
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
            {{ campaign()?.title }} · {{ campaign()?.address }}
          </p>
        </div>

        <!-- État du Rental Passport -->
        <div class="card p-4 mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                 [style.background]="passportRate() >= 80 ? '#E0EDE8' : '#FFF7ED'">
              <svg class="w-5 h-5" [style.color]="passportRate() >= 80 ? '#2C7A5E' : '#F97316'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </div>
            <div>
              <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                Rental Passport complété à {{ passportRate() }}%
              </p>
              <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                {{ passportRate() >= 80 ? 'Dossier solide, prêt à être partagé.' : 'Un dossier complet a 3x plus de chances.' }}
              </p>
            </div>
          </div>
          <a routerLink="/rental-passport"
             style="font-size:.8125rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif;white-space:nowrap">
            {{ passportRate() >= 80 ? 'Voir' : 'Compléter' }} →
          </a>
        </div>

        <!-- Message de motivation -->
        <div class="card p-5 mb-4">
          <label style="font-size:.8125rem;font-weight:600;color:#374151;font-family:Inter,sans-serif;display:block;margin-bottom:.5rem">
            Message au propriétaire <span style="color:#9CA3AF;font-weight:400">(optionnel, {{ coverLetter.length }}/2000)</span>
          </label>
          <textarea [(ngModel)]="coverLetter" rows="5" maxlength="2000"
                    placeholder="Présentez-vous en quelques lignes : votre situation, votre projet de location..."
                    class="w-full p-3 rounded-xl resize-none"
                    style="border:1.5px solid #E5E7EB;font-size:.875rem;font-family:Inter,sans-serif;color:#0A1F1A;outline:none"
                    (focus)="$any($event.target).style.borderColor='#2C7A5E'"
                    (blur)="$any($event.target).style.borderColor='#E5E7EB'"></textarea>
        </div>

        @if (error()) {
          <div class="p-3 rounded-xl mb-4" style="background:#FEF2F2;border:1px solid #FECACA">
            <p style="font-size:.8125rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p>
            @if (alreadyApplied()) {
              <a routerLink="/mes-candidatures" style="font-size:.8125rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif">
                Voir ma candidature →
              </a>
            }
          </div>
        }

        <button type="button" (click)="submit()" [disabled]="submitting()"
                class="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
          {{ submitting() ? 'Envoi en cours...' : 'Déposer mon dossier' }}
        </button>
        <p class="text-center mt-3 flex items-center justify-center gap-1.5" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
          Candidature sécurisée — visible uniquement par le propriétaire.
        </p>
      }
    </div>
  `,
})
export class ApplyComponent implements OnInit {
  campaign      = signal<{ id: string; title: string; address: string } | null>(null);
  loading       = signal(true);
  notFound      = signal(false);
  done          = signal(false);
  submitting    = signal(false);
  error         = signal('');
  alreadyApplied = signal(false);
  passportRate  = signal(0);
  coverLetter   = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private appSvc: ApplicationService,
    private passportSvc: PassportService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    // L'annonce publique suffit pour l'en-tête (pas de données privées)
    this.http.get<{ id: string; title: string; address: string }>(`${environment.apiUrl}/annonces/${id}`).subscribe({
      next: (c) => { this.campaign.set(c); this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); },
    });
    // Complétude du passport (silencieux si absent)
    this.passportSvc.get().subscribe({
      next: (p: any) => this.passportRate.set(p?.completionRate ?? 0),
      error: () => this.passportRate.set(0),
    });
  }

  submit(): void {
    const c = this.campaign();
    if (!c) return;
    this.error.set('');
    this.alreadyApplied.set(false);
    this.submitting.set(true);
    this.appSvc.apply(c.id, this.coverLetter.trim() || undefined).subscribe({
      next: () => { this.submitting.set(false); this.done.set(true); },
      error: (e) => {
        this.submitting.set(false);
        const status = e?.status;
        if (status === 409) {
          this.alreadyApplied.set(true);
          this.error.set('Vous avez déjà postulé à cette annonce.');
        } else if (status === 403) {
          this.error.set(e?.error?.error || 'Seuls les comptes candidats peuvent postuler.');
        } else {
          this.error.set(e?.error?.error || 'Erreur lors de l\'envoi. Réessayez.');
        }
      },
    });
  }
}
