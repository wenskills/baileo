import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-screen flex overflow-hidden">

      <!-- ══ GAUCHE : Formulaire ══ -->
      <div class="flex-1 flex flex-col justify-center items-center bg-white overflow-y-auto px-6 py-12">

        <div class="lg:hidden mb-8 flex items-center gap-3">
          <img src="assets/logo.png" alt="Baileo" style="height:3rem;width:auto;display:block">
          <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;letter-spacing:-0.04em">BAILEO</span>
        </div>

        <div class="w-full animate-scale-in" style="max-width:22rem">

          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.75rem;color:#0A1F1A;text-align:center;margin-bottom:0.25rem;letter-spacing:-0.03em">
            Créer un compte
          </h1>
          <p style="font-size:0.875rem;color:#94A3B8;text-align:center;margin-bottom:2rem;font-family:Inter,sans-serif">
            Démarrez gratuitement en quelques secondes
          </p>

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
            <div>
              <label class="auth-label" for="r-name">Nom complet</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
                <input id="r-name" type="text" name="fullName" [(ngModel)]="fullName"
                       class="auth-input" [class.error]="nameError()"
                       placeholder="Prénom Nom" autocomplete="name"
                       (input)="nameError.set('')" />
              </div>
              @if (nameError()) {
                <p class="field-error">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
                  {{ nameError() }}
                </p>
              }
            </div>

            <div>
              <label class="auth-label" for="r-email">E-mail</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
                <input id="r-email" type="email" name="email" [(ngModel)]="email"
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

            <div>
              <label class="auth-label" for="r-pwd">Mot de passe</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                <input id="r-pwd" [type]="showPwd() ? 'text' : 'password'" name="password"
                       [(ngModel)]="password" class="auth-input" [class.error]="passwordError()"
                       placeholder="8 caractères minimum" autocomplete="new-password"
                       (input)="passwordError.set('')" />
                <button type="button" (click)="showPwd.set(!showPwd())" class="auth-eye-btn">
                  <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
              </div>
              @if (password.length > 0 && !passwordError()) {
                <div style="display:flex;gap:0.25rem;margin-top:0.5rem">
                  @for (b of [0,1,2,3]; track b) {
                    <div style="height:3px;flex:1;border-radius:99px;transition:all 0.3s"
                         [style.background]="b < strengthScore() ? strengthColor() : '#E5EDE9'"></div>
                  }
                </div>
                <p style="font-size:0.6875rem;margin-top:0.25rem;font-weight:600;font-family:Inter,sans-serif" [style.color]="strengthColor()">{{ strengthLabel() }}</p>
              }
              @if (passwordError()) {
                <p class="field-error">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
                  {{ passwordError() }}
                </p>
              }
            </div>

            <label style="display:flex;align-items:flex-start;gap:0.625rem;cursor:pointer;padding-top:0.25rem">
              <input type="checkbox" name="terms" [(ngModel)]="terms"
                     style="margin-top:0.125rem;width:1rem;height:1rem;border-radius:0.25rem;border-color:#DDE8E4;accent-color:#1B4438;flex-shrink:0" />
              <span style="font-size:0.75rem;line-height:1.6;color:#6B8A80;font-family:Inter,sans-serif">
                J'accepte les
                <a href="#" style="font-weight:600;color:#0A1F1A" class="hover:underline">Conditions</a>
                et la
                <a href="#" style="font-weight:600;color:#0A1F1A" class="hover:underline">Politique de confidentialité</a>
              </span>
            </label>

            @if (serverError()) {
              <div class="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                   style="background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif;font-weight:500">
                <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>
                {{ serverError() }}
              </div>
            }

            <button type="submit" class="auth-submit-btn mt-1" [disabled]="loading() || !terms">
              @if (loading()) { <div class="spinner-white"></div> Création… }
              @else { Créer mon compte }
            </button>
          </form>

          <p style="text-align:center;font-size:0.875rem;color:#94A3B8;margin-top:1.5rem;font-family:Inter,sans-serif">
            Déjà un compte ?
            <a routerLink="/connexion" style="font-weight:700;color:#0A1F1A" class="hover:underline">Se connecter</a>
          </p>
        </div>

        <p style="margin-top:2.5rem;font-size:0.6875rem;text-align:center;color:#CBD5E1;font-family:Inter,sans-serif">
          © 2025 Baileo ·
          <a href="#" class="hover:underline">Mentions légales</a> ·
          <a href="#" class="hover:underline">Confidentialité</a>
        </p>
      </div>

      <!-- ══ DROITE : Hero (mirrored) ══ -->
      <div class="hidden lg:block lg:w-[48%] relative overflow-hidden flex-shrink-0">

        <img src="assets/hero-register.jpg" alt=""
             class="absolute inset-0 w-full h-full object-cover object-center" />

        <div class="absolute inset-0 pointer-events-none"
             style="background: linear-gradient(to bottom,
               #E8E3D8 0%,
               #E8E3D8 30%,
               rgba(232,227,216,0.96) 45%,
               rgba(232,227,216,0.8)  58%,
               rgba(232,227,216,0.42) 72%,
               rgba(232,227,216,0.1)  85%,
               transparent 100%)"></div>

        <div class="relative z-10 flex flex-col h-full">
          <div class="pt-8 px-10 flex justify-end">
            <a routerLink="/" class="flex items-center gap-3">
              <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.5rem;color:#0A1F1A;letter-spacing:-0.04em">BAILEO</span>
              <img src="assets/logo.png" alt="Baileo" style="height:3.5rem;width:auto;display:block">
            </a>
          </div>

          <div class="flex-1 flex flex-col justify-center px-10 pb-20">
            <p class="animate-fade-up"
               style="font-size:0.6875rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#2C7A5E;margin-bottom:1.25rem;font-family:Inter,sans-serif">
              Rejoignez Baileo
            </p>
            <h1 class="animate-fade-up delay-100"
                style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5vw,3.5rem);font-weight:800;line-height:1.05;color:#0A1F1A;margin-bottom:0.25rem">
              Gérez mieux.<br/>Louez plus vite.
            </h1>
            <p class="animate-fade-up delay-200"
               style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5vw,3.5rem);font-weight:800;line-height:1.05;color:#2C7A5E;font-style:italic;margin-bottom:2rem">
              Sereinement.
            </p>
            <div class="animate-fade-up delay-200"
                 style="width:2.5rem;height:2px;background:linear-gradient(to right,#2C7A5E,transparent);border-radius:2px;margin-bottom:1.75rem"></div>

            <div class="animate-fade-up delay-300 space-y-3">
              @for (f of features; track f) {
                <div class="flex items-center gap-3">
                  <div style="width:1.25rem;height:1.25rem;border-radius:50%;background:rgba(44,122,94,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <svg style="width:0.75rem;height:0.75rem" fill="none" viewBox="0 0 24 24" stroke="#2C7A5E" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  <span style="font-size:0.875rem;font-weight:500;color:#2D4A42;font-family:Inter,sans-serif">{{ f }}</span>
                </div>
              }
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
    </div>
  `,
})
export class RegisterComponent {
  fullName      = '';
  email         = '';
  password      = '';
  terms         = false;
  loading       = signal(false);
  nameError     = signal('');
  emailError    = signal('');
  passwordError = signal('');
  serverError   = signal('');
  showPwd       = signal(false);

  get googleRedirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    const base = `${environment.apiUrl}/auth/google/redirect`;
    return redirect && redirect.startsWith('/') && !redirect.startsWith('//')
      ? `${base}?redirect=${encodeURIComponent(redirect)}`
      : base;
  }

  features = [
    'Classement intelligent des candidats',
    'Dossiers vérifiés et sécurisés',
    'Workflow collaboratif intégré',
    'Signature électronique et bail en ligne',
  ];

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  strengthScore(): number {
    const p = this.password; let s = 0;
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  strengthColor(): string {
    const s = this.strengthScore();
    if (s <= 1) return '#F87171'; if (s === 2) return '#FB923C';
    if (s === 3) return '#FBBF24'; return '#2C7A5E';
  }
  strengthLabel(): string {
    return ['Très faible','Faible','Moyen','Fort','Excellent'][this.strengthScore()] ?? '';
  }

  submit(): void {
    this.nameError.set(''); this.emailError.set(''); this.passwordError.set(''); this.serverError.set('');
    const parts = this.fullName.trim().split(/\s+/);
    const firstName = parts[0] ?? ''; const lastName = parts.slice(1).join(' ');
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let ok = true;
    if (!this.fullName.trim())             { this.nameError.set('Votre nom complet est requis.'); ok=false; }
    else if (firstName.length < 2)         { this.nameError.set('Le prénom doit faire au moins 2 caractères.'); ok=false; }
    if (!this.email.trim())                { this.emailError.set('L\u2019adresse email est requise.'); ok=false; }
    else if (!re.test(this.email.trim()))  { this.emailError.set('Format invalide (exemple@domaine.com).'); ok=false; }
    if (!this.password)                    { this.passwordError.set('Le mot de passe est requis.'); ok=false; }
    else if (this.password.trim()==='')    { this.passwordError.set('Ne peut pas être uniquement des espaces.'); ok=false; }
    else if (this.password.length < 8)     { this.passwordError.set('Minimum 8 caractères.'); ok=false; }
    if (!ok) return;

    this.loading.set(true);
    this.auth.register({ email: this.email.trim().toLowerCase(), password: this.password, firstName, lastName }).subscribe({
      next: () => {
        this.auth.login(this.email.trim().toLowerCase(), this.password).subscribe({
          next: () => {
            this.loading.set(false);
            const redirect = this.route.snapshot.queryParamMap.get('redirect');
            this.router.navigate(['/onboarding'], redirect ? { queryParams: { redirect } } : {});
          },
          error: () => {
            this.loading.set(false);
            const r = this.route.snapshot.queryParamMap.get('redirect');
            this.router.navigate(['/connexion'], { queryParams: { message: 'account_created', ...(r ? { redirect: r } : {}) } });
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        if      (err?.status===409) this.serverError.set((err?.error?.error ?? 'Email déjà utilisé.') + ' Essayez de vous connecter.');
        else if (err?.status===429) this.serverError.set('Trop de tentatives. Réessayez dans une heure.');
        else if (err?.status===0)   this.serverError.set('Serveur inaccessible. Vérifiez votre connexion.');
        else                        this.serverError.set(err?.error?.error || 'Erreur lors de la création du compte.');
      },
    });
  }
}
