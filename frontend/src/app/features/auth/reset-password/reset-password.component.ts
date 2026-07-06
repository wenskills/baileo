import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-4"
         style="background:linear-gradient(160deg,#F4F1EB 0%,#EDE8DF 100%)">

      <a routerLink="/" class="flex items-center gap-2.5 mb-10">
        <img src="assets/logo.png" alt="Baileo" class="h-9 w-auto" />
        <span class="font-bold text-xl tracking-tight" style="color:#0E2A25">BAILEO</span>
      </a>

      <div class="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100">

        @if (tokenInvalid()) {
          <div class="text-center">
            <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                 style="background:#FEF2F2">
              <svg class="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold mb-2" style="color:#0E2A25">Lien invalide ou expiré</h2>
            <p class="text-sm mb-6" style="color:#6B7280">Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.</p>
            <a routerLink="/mot-de-passe-oublie" class="auth-submit-btn inline-flex">
              Nouvelle demande
            </a>
          </div>
        } @else if (success()) {
          <div class="text-center">
            <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                 style="background:#E6F2ED">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#38B88A" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold mb-2" style="color:#0E2A25">Mot de passe mis à jour !</h2>
            <p class="text-sm mb-6" style="color:#6B7280">Votre mot de passe a été réinitialisé avec succès.</p>
            <button type="button" (click)="goToLogin()" class="auth-submit-btn inline-flex">
              Se connecter
            </button>
          </div>
        } @else {
          <div class="text-center mb-7">
            <h1 class="text-2xl font-bold mb-2" style="color:#0E2A25">Nouveau mot de passe</h1>
            <p class="text-sm" style="color:#6B7280">Choisissez un mot de passe sécurisé d'au moins 8 caractères.</p>
          </div>

          @if (errorMsg()) {
            <div class="mb-4 px-4 py-3 rounded-xl text-sm" style="background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C">
              {{ errorMsg() }}
            </div>
          }

          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="auth-label" for="rp-pwd">Nouveau mot de passe</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                <input id="rp-pwd" [type]="showPwd() ? 'text' : 'password'" name="password"
                       class="auth-input" placeholder="Minimum 8 caractères" [(ngModel)]="password" required />
                <button type="button" (click)="showPwd.set(!showPwd())" class="auth-eye-btn">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label class="auth-label" for="rp-confirm">Confirmer le mot de passe</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                <input id="rp-confirm" type="password" name="confirm"
                       class="auth-input" placeholder="Confirmez votre mot de passe" [(ngModel)]="confirm" required />
              </div>
            </div>
            <button type="submit" class="auth-submit-btn" [disabled]="loading()">
              @if (loading()) { <div class="spinner-white"></div> Mise à jour… } @else { Réinitialiser le mot de passe }
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  password    = '';
  confirm     = '';
  token       = '';
  loading     = signal(false);
  errorMsg    = signal('');
  success     = signal(false);
  tokenInvalid = signal(false);
  showPwd     = signal(false);

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.token = new URLSearchParams(window.location.search).get('token') ?? '';
    if (!this.token) { this.tokenInvalid.set(true); return; }
    // Vérifier la validité du token
    this.http.post<{valid: boolean}>(`${environment.apiUrl}/auth/verify-reset-token`, { token: this.token })
      .subscribe({
        next: (res) => { if (!res.valid) this.tokenInvalid.set(true); },
        error: ()   => this.tokenInvalid.set(true),
      });
  }

  goToLogin(): void {
    // Passe la clé whitelistée pour afficher le message de succès sur la page de connexion
    this.router.navigate(['/connexion'], { queryParams: { message: 'password_reset' } });
  }

  submit(): void {
    if (!this.password) {
      this.errorMsg.set('Veuillez saisir un nouveau mot de passe.'); return;
    }
    if (this.password.trim() === '') {
      this.errorMsg.set("Le mot de passe ne peut pas être composé uniquement d'espaces."); return;
    }
    if (this.password.length < 8) {
      this.errorMsg.set('Le mot de passe doit contenir au moins 8 caractères.'); return;
    }
    if (!this.confirm) {
      this.errorMsg.set('Veuillez confirmer votre mot de passe.'); return;
    }
    if (this.password !== this.confirm) {
      this.errorMsg.set('Les mots de passe ne correspondent pas.'); return;
    }
    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/auth/reset-password`, { token: this.token, password: this.password })
      .subscribe({
        next: () => { this.loading.set(false); this.success.set(true); },
        error: (err) => {
          this.loading.set(false);
          if (err?.status === 0) {
            this.errorMsg.set('Impossible de joindre le serveur. Vérifiez votre connexion.');
          } else if (err?.status === 422) {
            this.errorMsg.set(err?.error?.error || 'Lien invalide ou expiré. Faites une nouvelle demande.');
          } else {
            this.errorMsg.set('Une erreur est survenue. Réessayez.');
          }
        },
      });
  }
}
