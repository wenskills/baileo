import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

/**
 * Acceptation d'une invitation d'organisation (spec : membre invité →
 * accepter → créer compte si nécessaire → rejoindre).
 * Non connecté → connexion/inscription avec retour automatique ici.
 */
@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6" style="background:#F5F7F6">
      <div class="card p-8 w-full text-center" style="max-width:26rem">
        <div class="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background:#E0EDE8">
          <svg class="w-6 h-6" style="color:#1B4438" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"/>
          </svg>
        </div>
        <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.25rem;color:#0A1F1A">Invitation d'équipe</h1>

        @if (state() === 'checking') {
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-top:.5rem">Vérification...</p>
        } @else if (state() === 'login') {
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-top:.5rem">
            Connectez-vous ou créez votre compte pour rejoindre l'équipe.
          </p>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <a [routerLink]="['/connexion']" [queryParams]="{redirect: returnUrl}"
               class="py-2.5 rounded-xl text-sm font-semibold text-white" style="background:#1B4438;font-family:Inter,sans-serif;text-decoration:none">Se connecter</a>
            <a [routerLink]="['/inscription']" [queryParams]="{redirect: returnUrl}"
               class="py-2.5 rounded-xl text-sm font-semibold" style="border:1.5px solid #C8DDD7;color:#1B4438;font-family:Inter,sans-serif;text-decoration:none">Créer un compte</a>
          </div>
        } @else if (state() === 'done') {
          <p style="font-size:.875rem;color:#1B4438;font-weight:600;font-family:Inter,sans-serif;margin-top:.5rem">
            Bienvenue dans l'équipe ! Redirection...
          </p>
        } @else {
          <p style="font-size:.875rem;color:#DC2626;font-family:Inter,sans-serif;margin-top:.5rem">{{ error() }}</p>
          <a routerLink="/" class="inline-block mt-4" style="font-size:.8125rem;color:#2C7A5E;font-family:Inter,sans-serif">← Retour à l'accueil</a>
        }
      </div>
    </div>
  `,
})
export class AcceptInvitationComponent implements OnInit {
  state = signal<'checking' | 'login' | 'done' | 'error'>('checking');
  error = signal('');
  returnUrl = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.returnUrl = `/invitation/${token}`;

    const attempt = () => {
      if (!this.auth.currentUser()) { this.state.set('login'); return; }
      this.http.post<{ organizationId: string }>(
        `${environment.apiUrl}/organization-invitations/${token}/accept`, {}
      ).subscribe({
        next: () => {
          this.state.set('done');
          // Recharger la session (nouveau rôle/organisation) puis rediriger
          setTimeout(() => { window.location.href = '/tableau-de-bord'; }, 1200);
        },
        error: (e) => {
          this.state.set('error');
          this.error.set(e?.error?.error?.message || 'Invitation invalide ou expirée.');
        },
      });
    };

    if (this.auth.sessionRestored()) { attempt(); return; }
    const wait = setInterval(() => {
      if (this.auth.sessionRestored()) { clearInterval(wait); attempt(); }
    }, 100);
    setTimeout(() => clearInterval(wait), 8000);
  }
}
