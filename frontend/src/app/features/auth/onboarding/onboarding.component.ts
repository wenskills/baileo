import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type Role = 'owner' | 'agency' | 'candidate';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-baileo-bg flex flex-col items-center justify-center p-4">

      <!-- Logo -->
      <div class="flex items-center gap-2 mb-10">
        <div class="w-9 h-9 bg-baileo-ink rounded-xl flex items-center justify-center shrink-0">
          <span class="text-white font-bold text-lg">B</span>
        </div>
        <span class="text-baileo-ink font-bold text-xl tracking-tight">BAILEO</span>
      </div>

      <!-- Stepper -->
      <div class="flex items-center gap-0 mb-10">
        @for (step of steps; track step.n) {
          <div class="flex items-center">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                [class]="step.n === 1
                  ? 'bg-baileo-ink text-white'
                  : 'bg-white border-2 border-gray-200 text-gray-400'">
                {{ step.n }}
              </div>
              <span class="text-xs mt-1.5 font-medium whitespace-nowrap"
                [class]="step.n === 1 ? 'text-baileo-ink' : 'text-gray-400'">
                {{ step.label }}
              </span>
            </div>
            @if (!$last) {
              <div class="w-16 h-px bg-gray-200 mb-5 mx-1"></div>
            }
          </div>
        }
      </div>

      <!-- Question -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-baileo-ink mb-2">Que souhaitez-vous faire avec Baileo ?</h1>
        <p class="text-gray-500 text-sm">Sélectionnez l'option qui vous correspond le mieux.</p>
      </div>

      <!-- Cards de rôle -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mb-8">

        <!-- Propriétaire -->
        <button type="button" (click)="selectRole('owner')" [disabled]="loading()"
          class="card p-6 text-left transition-all duration-200 cursor-pointer border-2
            hover:border-baileo-mint hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          [class]="selected() === 'owner'
            ? 'border-baileo-mint shadow-md'
            : 'border-transparent'">
          <div class="w-12 h-12 rounded-2xl bg-baileo-sage flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-baileo-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
            </svg>
          </div>
          <h2 class="text-lg font-bold text-baileo-ink mb-1">Je loue mon bien</h2>
          <p class="text-sm text-gray-500 mb-4">Je suis propriétaire ou gestionnaire et je cherche à louer un logement.</p>
          <ul class="space-y-2 mb-5">
            @for (item of ownerFeatures; track item) {
              <li class="flex items-center gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 text-baileo-mint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                {{ item }}
              </li>
            }
          </ul>
          <div class="btn-primary w-full" [class.ring-2]="selected() === 'owner'" [class.ring-baileo-mint]="selected() === 'owner'">
            @if (loading() && selected() === 'owner') {
              <div class="spinner-white"></div> Chargement…
            } @else {
              C'est moi
            }
          </div>
        </button>

        <!-- Candidat -->
        <button type="button" (click)="selectRole('candidate')" [disabled]="loading()"
          class="card p-6 text-left transition-all duration-200 cursor-pointer border-2
            hover:border-violet-500 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          [class]="selected() === 'candidate'
            ? 'border-violet-500 shadow-md'
            : 'border-transparent'">
          <div class="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
          </div>
          <h2 class="text-lg font-bold text-baileo-ink mb-1">Je cherche un logement</h2>
          <p class="text-sm text-gray-500 mb-4">Je suis à la recherche d'un logement et je souhaite déposer ma candidature.</p>
          <ul class="space-y-2 mb-5">
            @for (item of candidateFeatures; track item) {
              <li class="flex items-center gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                {{ item }}
              </li>
            }
          </ul>
          <div class="flex items-center justify-center gap-2 py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors duration-150"
            [class.ring-2]="selected() === 'candidate'" [class.ring-violet-400]="selected() === 'candidate'">
            @if (loading() && selected() === 'candidate') {
              <div class="spinner-white"></div> Chargement…
            } @else {
              C'est moi
            }
          </div>
        </button>

        <!-- Agence / professionnel -->
        <button type="button" (click)="openAgencyStep()" [disabled]="loading()"
          class="card p-6 text-left transition-all duration-200 cursor-pointer border-2
            hover:border-baileo-forest hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          [class]="selected() === 'agency'
            ? 'border-baileo-forest shadow-md'
            : 'border-transparent'">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style="background:#0A1F1A">
            <svg class="w-6 h-6" style="color:#5ECFAA" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
            </svg>
          </div>
          <h2 class="text-lg font-bold text-baileo-ink mb-1">Nous sommes une agence</h2>
          <p class="text-sm text-gray-500 mb-4">Agence, gestionnaire ou professionnel : gérez plusieurs biens en équipe.</p>
          <ul class="space-y-2 mb-5">
            @for (item of agencyFeatures; track item) {
              <li class="flex items-center gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 shrink-0" style="color:#1B4438" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                {{ item }}
              </li>
            }
          </ul>
          <div class="flex items-center justify-center gap-2 py-3 px-6 text-white font-semibold text-sm rounded-xl transition-colors duration-150"
               style="background:#0A1F1A"
               [class.ring-2]="selected() === 'agency'">
            @if (loading() && selected() === 'agency') {
              <div class="spinner-white"></div> Chargement…
            } @else {
              C'est nous
            }
          </div>
        </button>
      </div>

      <!-- Sous-étape agence : créer OU rejoindre (une agence = UNE organisation) -->
      @if (agencyStep()) {
        <div class="card p-6 w-full max-w-xl mb-8" style="border:2px solid #1B4438">
          <h2 class="text-lg font-bold text-baileo-ink mb-1">Votre agence</h2>
          <p class="text-sm text-gray-500 mb-4">Une agence n'est créée qu'une seule fois — les collaborateurs la rejoignent ensuite par invitation.</p>

          <div class="grid grid-cols-2 gap-2 mb-4">
            <button type="button" (click)="agencyMode.set('create')"
                    class="py-2.5 rounded-xl text-sm font-semibold transition-all"
                    [style.background]="agencyMode() === 'create' ? '#0A1F1A' : 'white'"
                    [style.color]="agencyMode() === 'create' ? 'white' : '#374151'"
                    style="border:1.5px solid #E5E7EB;cursor:pointer;font-family:Inter,sans-serif">
              Créer notre agence
            </button>
            <button type="button" (click)="agencyMode.set('join')"
                    class="py-2.5 rounded-xl text-sm font-semibold transition-all"
                    [style.background]="agencyMode() === 'join' ? '#0A1F1A' : 'white'"
                    [style.color]="agencyMode() === 'join' ? 'white' : '#374151'"
                    style="border:1.5px solid #E5E7EB;cursor:pointer;font-family:Inter,sans-serif">
              J'ai un lien d'invitation
            </button>
          </div>

          @if (agencyMode() === 'create') {
            <label class="block text-xs font-semibold text-gray-500 mb-1">Nom de l'agence</label>
            <input [(ngModel)]="agencyName" placeholder="Ex : Prado Immo" maxlength="120"
                   class="w-full px-3 py-2.5 rounded-xl text-sm mb-1"
                   style="border:1.5px solid #E5E7EB;outline:none;font-family:Inter,sans-serif"/>
            <p class="text-xs text-gray-400 mb-4">Vous serez administrateur. Vous inviterez ensuite vos agents depuis la page Équipe.</p>
          } @else {
            <label class="block text-xs font-semibold text-gray-500 mb-1">Lien ou code d'invitation</label>
            <input [(ngModel)]="invitationInput" placeholder="Collez le lien reçu de votre agence"
                   class="w-full px-3 py-2.5 rounded-xl text-sm mb-1"
                   style="border:1.5px solid #E5E7EB;outline:none;font-family:Inter,sans-serif"/>
            <p class="text-xs text-gray-400 mb-4">Vous rejoindrez l'agence existante avec le rôle défini par votre administrateur.</p>
          }

          <div class="flex gap-2">
            <button type="button" (click)="agencyStep.set(false)"
                    class="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style="border:1.5px solid #E5E7EB;color:#374151;background:white;cursor:pointer;font-family:Inter,sans-serif">Retour</button>
            <button type="button" (click)="submitAgency()" [disabled]="loading() || !agencyValid()"
                    class="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
              {{ loading() ? 'Chargement…' : (agencyMode() === 'create' ? 'Créer l’agence' : 'Rejoindre l’agence') }}
            </button>
          </div>
        </div>
      }

      <!-- Erreur -->
      @if (errorMsg()) {
        <p class="text-red-600 text-sm mb-4">{{ errorMsg() }}</p>
      }

      <!-- Sécurité -->
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
        </svg>
        Vos données sont sécurisées et utilisées uniquement dans le cadre de la location.
        <a href="#" class="text-baileo-mint hover:underline">En savoir plus</a>
      </div>
    </div>
  `,
})
export class OnboardingComponent {
  selected = signal<Role | null>(null);
  loading = signal(false);
  errorMsg = signal('');

  steps = [
    { n: 1, label: 'Qui êtes-vous ?' },
    { n: 2, label: 'À propos de vous' },
    { n: 3, label: 'Personnalisation' },
    { n: 4, label: 'C\'est parti !' },
  ];

  ownerFeatures = [
    'Publier une annonce',
    'Recevoir et analyser les dossiers',
    'Gérer les visites et signer le bail',
  ];

  candidateFeatures = [
    'Créer mon dossier locataire',
    'Postuler facilement',
    'Suivre mes candidatures',
  ];

  agencyFeatures = [
    'Équipe, rôles et permissions',
    'Assignation des dossiers',
    'Suivi partagé avec vos propriétaires',
  ];

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  // ── Sous-étape agence : créer OU rejoindre (spec : une agence = UNE organisation) ──
  agencyStep = signal(false);
  agencyMode = signal<'create' | 'join'>('create');
  agencyName = '';
  invitationInput = '';

  openAgencyStep(): void {
    this.selected.set('agency');
    this.errorMsg.set('');
    // Flux invité : si on vient d'un lien /invitation/{token}, présélectionner « Rejoindre »
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '';
    const m = redirect.match(/invitation\/([a-f0-9]{64})/);
    if (m) { this.agencyMode.set('join'); this.invitationInput = m[1]; }
    this.agencyStep.set(true);
  }

  agencyValid(): boolean {
    return this.agencyMode() === 'create'
      ? this.agencyName.trim().length >= 2
      : this.extractToken() !== '';
  }

  private extractToken(): string {
    const raw = this.invitationInput.trim();
    const m = raw.match(/([a-f0-9]{64})/i);
    return m ? m[1] : '';
  }

  submitAgency(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    const extra = this.agencyMode() === 'create'
      ? { mode: 'create' as const, organizationName: this.agencyName.trim() }
      : { mode: 'join' as const, invitationToken: this.extractToken() };
    this.auth.completeOnboarding('agency', extra).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/tableau-de-bord');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message || err?.error?.error || 'Une erreur est survenue. Réessayez.');
      },
    });
  }

  selectRole(role: Role): void {
    this.selected.set(role);
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.completeOnboarding(role).subscribe({
      next: () => {
        this.loading.set(false);
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        this.router.navigateByUrl(redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/tableau-de-bord');
      },
      error: (err) => {
        this.loading.set(false);
        this.selected.set(null);
        this.errorMsg.set(err?.error?.error || 'Une erreur est survenue. Réessayez.');
      },
    });
  }
}
