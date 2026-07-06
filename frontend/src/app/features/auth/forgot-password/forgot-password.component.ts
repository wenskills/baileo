import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
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
        @if (!sent()) {
          <div class="text-center mb-7">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style="background:#E6F2ED">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#1F4D44" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold mb-2" style="color:#0E2A25">Mot de passe oublié ?</h1>
            <p class="text-sm" style="color:#6B7280">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          @if (errorMsg()) {
            <div class="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
                 style="background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C">
              <svg class="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              {{ errorMsg() }}
            </div>
          }
          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="auth-label" for="fp-email">Adresse e-mail</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
                <input id="fp-email" type="email" name="email" class="auth-input"
                       placeholder="exemple@domaine.com" [(ngModel)]="email" required />
              </div>
            </div>
            <button type="submit" class="auth-submit-btn" [disabled]="loading()">
              @if (loading()) { <div class="spinner-white"></div> Envoi… } @else { Envoyer le lien }
            </button>
          </form>
        } @else {
          <!-- Confirmation -->
          <div class="text-center">
            <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                 style="background:#E6F2ED">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#38B88A" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold mb-3" style="color:#0E2A25">Email envoyé !</h2>
            <p class="text-sm mb-6" style="color:#6B7280">
              Si un compte existe avec <strong>{{ email }}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <p class="text-xs mb-4" style="color:#9CA3AF">
              Vérifiez vos spams si vous ne trouvez pas l'email.
            </p>
            @if (devLink()) {
              <div class="mb-6 px-4 py-3 rounded-xl text-left" style="background:#FFF7ED;border:1px solid #FED7AA">
                <p class="text-xs font-semibold mb-1" style="color:#F97316">Mode développement — lien direct :</p>
                <a [href]="devLink()" class="text-xs font-semibold break-all hover:underline" style="color:#1F4D44">
                  {{ devLink() }}
                </a>
              </div>
            }
            <button type="button" (click)="reset()" class="text-sm font-semibold hover:underline" style="color:#1F4D44">
              Réessayer avec un autre email
            </button>
          </div>
        }

        <p class="text-center text-sm mt-6" style="color:#6B7280">
          <a routerLink="/connexion" class="font-semibold hover:underline" style="color:#1F4D44">
            ← Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  email    = '';
  loading  = signal(false);
  sent     = signal(false);
  devLink  = signal('');  // rempli uniquement en environnement dev
  errorMsg = signal('');

  constructor(private http: HttpClient) {}

  submit(): void {
    this.errorMsg.set('');

    if (!this.email.trim()) {
      this.errorMsg.set("Veuillez entrer votre adresse email.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.errorMsg.set("Format d'email invalide (exemple@domaine.com).");
      return;
    }

    this.loading.set(true);
    this.http.post<{ message: string; devResetUrl?: string }>(`${environment.apiUrl}/auth/forgot-password`, { email: this.email.trim().toLowerCase() }).subscribe({
      next: (res) => { this.loading.set(false); this.sent.set(true); this.devLink.set(res?.devResetUrl ?? ''); },
      error: (err) => {
        this.loading.set(false);
        // Toujours afficher succès sauf erreur serveur ou réseau
        if (err?.status === 0) {
          this.errorMsg.set('Impossible de joindre le serveur. Vérifiez votre connexion.');
        } else {
          this.sent.set(true); // Anti-énumération : même réponse sur erreur 4xx
        }
      },
    });
  }

  reset(): void { this.sent.set(false); this.email = ''; this.errorMsg.set(''); }
}
