import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-screen flex overflow-hidden">

      <!-- ══ GAUCHE : Hero ══ -->
      <div class="hidden lg:block lg:w-[48%] relative overflow-hidden flex-shrink-0">

        <!-- Image plein fond -->
        <img src="assets/hero-login.jpg" alt=""
             class="absolute inset-0 w-full h-full object-cover object-center" />

        <!-- Gradient FORT : opaque en haut (texte lisible) → transparent en bas (image visible) -->
        <div class="absolute inset-0 pointer-events-none"
             style="background: linear-gradient(to bottom,
               #EEE9DF 0%,
               #EEE9DF 35%,
               rgba(238,233,223,0.97) 48%,
               rgba(238,233,223,0.85) 58%,
               rgba(238,233,223,0.5)  70%,
               rgba(238,233,223,0.15) 83%,
               transparent 100%)"></div>

        <div class="relative z-10 flex flex-col h-full">

          <!-- Logo -->
          <div class="pt-8 px-10">
            <a routerLink="/" class="flex items-center gap-3 group">
              <img src="assets/logo.png" alt="Baileo" style="height:3.5rem;width:auto;display:block">
              <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.5rem;color:#0A1F1A;letter-spacing:-0.04em">
                BAILEO
              </span>
            </a>
          </div>

          <!-- Contenu hero -->
          <div class="flex-1 flex flex-col justify-center px-10 pb-20">

            <p class="text-xs font-bold tracking-widest uppercase mb-5 animate-fade-up"
               style="color:#2C7A5E;letter-spacing:0.2em;font-family:Inter,sans-serif">
              Bienvenue
            </p>

            <h1 class="animate-fade-up delay-100"
                style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5vw,3.5rem);font-weight:800;line-height:1.05;color:#0A1F1A;margin-bottom:0.25rem">
              Simplifiez<br/>la location.
            </h1>
            <p class="animate-fade-up delay-200"
               style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5vw,3.5rem);font-weight:800;line-height:1.05;color:#2C7A5E;font-style:italic;margin-bottom:2rem">
              Élevez l'expérience.
            </p>

            <div class="animate-fade-up delay-200"
                 style="width:2.5rem;height:2px;background:linear-gradient(to right,#2C7A5E,transparent);border-radius:2px;margin-bottom:1.75rem"></div>

            <p class="leading-relaxed animate-fade-up delay-300"
               style="font-size:0.9375rem;color:#3D5C52;max-width:21rem;font-family:Inter,sans-serif;font-weight:400">
              Baileo centralise, qualifie et accélère toute la gestion locative.
              Moins de friction, plus de confiance.
            </p>

            <div class="flex gap-6 mt-8 animate-fade-up delay-400">
              <div class="flex items-center gap-2" style="font-size:0.75rem;color:#7A9A90;font-family:Inter,sans-serif;font-weight:500">
                <svg style="width:0.875rem;height:0.875rem;color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                </svg>
                Données sécurisées
              </div>
              <div class="flex items-center gap-2" style="font-size:0.75rem;color:#7A9A90;font-family:Inter,sans-serif;font-weight:500">
                <svg style="width:0.875rem;height:0.875rem;color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                </svg>
                100% locatif
              </div>
            </div>
          </div>
        </div>

        <div class="absolute bottom-4 left-0 right-0 text-center z-10">
          <p style="font-size:0.6875rem;color:rgba(61,92,82,0.5);font-family:Inter,sans-serif">
            © 2025 Baileo ·
            <a href="#" class="hover:underline">Mentions légales</a> ·
            <a href="#" class="hover:underline">Confidentialité</a>
          </p>
        </div>
      </div>

      <!-- ══ DROITE : Formulaire ══ -->
      <div class="flex-1 flex flex-col justify-center items-center bg-white overflow-y-auto px-6 py-12">

        <div class="lg:hidden mb-8 flex items-center gap-3">
          <img src="assets/logo.png" alt="Baileo" style="height:3rem;width:auto;display:block">
          <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;letter-spacing:-0.04em">BAILEO</span>
        </div>

        <div class="w-full animate-scale-in" style="max-width:22rem">

          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.75rem;color:#0A1F1A;text-align:center;margin-bottom:0.25rem;letter-spacing:-0.03em">
            Connexion
          </h1>
          <p style="font-size:0.875rem;color:#94A3B8;text-align:center;margin-bottom:2rem;font-family:Inter,sans-serif">
            Accédez à votre espace Baileo
          </p>

          @if (oauthError()) {
            <div class="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                 style="background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif;font-weight:500">
              <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
              </svg>{{ oauthErrorMsg() }}
            </div>
          }
          @if (successMsg()) {
            <div class="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                 style="background:#F0FDF7;color:#15803D;font-family:Inter,sans-serif;font-weight:500">
              <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
              </svg>{{ successMsg() }}
            </div>
          }

          <a [href]="googleRedirectUrl" class="auth-social-btn mb-5">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </a>

          <div class="auth-divider mb-5">
            <span style="font-size:0.75rem;font-weight:600;padding:0 0.5rem;color:#C4D5CE;font-family:Inter,sans-serif">ou</span>
          </div>

          <form (ngSubmit)="submit()" class="space-y-4">
            <!-- Email -->
            <div>
              <label class="auth-label" for="l-email">E-mail</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
                <input id="l-email" type="email" name="email" [(ngModel)]="email"
                       class="auth-input" [class.error]="emailError()"
                       placeholder="vous@exemple.com" autocomplete="email"
                       (input)="emailError.set('')" />
              </div>
              @if (emailError()) {
                <p class="field-error">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
                  {{ emailError() }}
                </p>
              }
            </div>

            <!-- Mot de passe -->
            <div>
              <div class="flex items-center justify-between" style="margin-bottom:0.375rem">
                <label class="auth-label" for="l-pwd" style="margin-bottom:0">Mot de passe</label>
                <a routerLink="/mot-de-passe-oublie"
                   style="font-size:0.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif"
                   class="hover:underline">Oublié ?</a>
              </div>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                <input id="l-pwd" [type]="showPwd() ? 'text' : 'password'" name="password"
                       [(ngModel)]="password" class="auth-input" [class.error]="passwordError()"
                       placeholder="Votre mot de passe" autocomplete="current-password"
                       (input)="passwordError.set('')" />
                <button type="button" (click)="showPwd.set(!showPwd())" class="auth-eye-btn">
                  <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    @if (showPwd()) {
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    }
                  </svg>
                </button>
              </div>
              @if (passwordError()) {
                <p class="field-error">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
                  {{ passwordError() }}
                </p>
              }
            </div>

            @if (serverError()) {
              <div class="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                   style="background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif;font-weight:500">
                <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>
                {{ serverError() }}
              </div>
            }

            <button type="submit" class="auth-submit-btn mt-1" [disabled]="loading()">
              @if (loading()) { <div class="spinner-white"></div> Connexion… }
              @else { Se connecter }
            </button>
          </form>

          <p style="text-align:center;font-size:0.875rem;color:#94A3B8;margin-top:1.5rem;font-family:Inter,sans-serif">
            Pas encore de compte ?
            <a routerLink="/inscription"
               style="font-weight:700;color:#0A1F1A" class="hover:underline">Créer un compte</a>
          </p>
        </div>

        <p style="margin-top:2.5rem;font-size:0.6875rem;text-align:center;color:#CBD5E1;font-family:Inter,sans-serif">
          © 2025 Baileo ·
          <a href="#" class="hover:underline">Mentions légales</a> ·
          <a href="#" class="hover:underline">Confidentialité</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email         = '';
  password      = '';
  loading       = signal(false);
  emailError    = signal('');
  passwordError = signal('');
  serverError   = signal('');
  showPwd       = signal(false);
  oauthError    = signal(false);
  oauthErrorMsg = signal('');
  successMsg    = signal('');

  get googleRedirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    const base = `${environment.apiUrl}/auth/google/redirect`;
    return redirect && redirect.startsWith('/') && !redirect.startsWith('//')
      ? `${base}?redirect=${encodeURIComponent(redirect)}`
      : base;
  }

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    const p = new URLSearchParams(window.location.search);
    const e = p.get('error'), m = p.get('message');
    if (e) { this.oauthError.set(true); this.oauthErrorMsg.set(this.oauthErrToFr(e)); }
    if (m) {
      const ok: Record<string,string> = {
        account_created: 'Compte créé avec succès. Connectez-vous.',
        password_reset:  'Mot de passe réinitialisé. Connectez-vous.',
      };
      if (ok[m]) this.successMsg.set(ok[m]);
    }
  }

  private oauthErrToFr(e: string): string {
    const m: Record<string,string> = {
      google_not_configured:    'Google OAuth non configuré.',
      google_cancelled:         'Connexion Google annulée.',
      google_token_failed:      'Erreur Google. Réessayez.',
      google_no_email:          'Email Google introuvable.',
      google_email_not_verified:'Email Google non vérifié.',
      invalid_state:            'Session expirée. Réessayez.',
    };
    return m[e] ?? 'Erreur de connexion Google.';
  }

  submit(): void {
    this.emailError.set(''); this.passwordError.set(''); this.serverError.set('');
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let ok = true;
    if (!this.email.trim())                { this.emailError.set('L\u2019adresse email est requise.'); ok=false; }
    else if (!re.test(this.email.trim()))   { this.emailError.set('Format invalide (exemple@domaine.com).'); ok=false; }
    if (!this.password)                    { this.passwordError.set('Le mot de passe est requis.'); ok=false; }
    if (!ok) return;

    this.loading.set(true);
    this.auth.login(this.email.trim().toLowerCase(), this.password).subscribe({
      next: () => {
        this.auth.loadMe().subscribe({
          next: (u) => {
            this.loading.set(false);
            const redirect = this.route.snapshot.queryParamMap.get('redirect');
            const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null;
            if (u.status === 'pending') {
              this.router.navigate(['/onboarding'], safe ? { queryParams: { redirect: safe } } : {});
            } else {
              this.router.navigateByUrl(safe ?? '/tableau-de-bord');
            }
          },
          error: () => { this.loading.set(false); this.serverError.set('Erreur chargement profil. Réessayez.'); },
        });
      },
      error: (err) => {
        this.loading.set(false);
        if      (err?.status===401) this.serverError.set('Email ou mot de passe incorrect.');
        else if (err?.status===429) this.serverError.set('Trop de tentatives. Attendez 15 minutes.');
        else if (err?.status===0)   this.serverError.set('Serveur inaccessible. Vérifiez votre connexion.');
        else                        this.serverError.set('Erreur de connexion. Réessayez.');
      },
    });
  }
}
