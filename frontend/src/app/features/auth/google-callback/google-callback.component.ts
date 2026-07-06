import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center" style="background:#F4F1EB">
      <div class="text-center">
        <img src="assets/logo.png" alt="Baileo" class="h-12 w-auto mx-auto mb-6" />
        <div class="w-8 h-8 border-2 border-t-baileo-mint border-gray-200 rounded-full animate-spin mx-auto mb-4"
             style="border-top-color:#38B88A"></div>
        <p class="text-sm" style="color:#6B7280">Connexion en cours…</p>
      </div>
    </div>
  `,
})
export class GoogleCallbackComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Le backend passe le token via le fragment (#) pour éviter qu'il apparaisse dans les logs serveur
    const params   = new URLSearchParams(window.location.hash.slice(1));
    const token    = params.get('token');
    const redirect = params.get('to') ?? '/tableau-de-bord';

    if (!token) { this.router.navigate(['/connexion'], { queryParams: { error: 'google_token_missing' } }); return; }

    // Stocker le token puis charger le profil utilisateur
    this.auth.storeToken(token);
    this.auth.loadMe().subscribe({
      next: (user) => {
        // Chemins internes uniquement + navigateByUrl (préserve les query params du redirect)
        const safe = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/tableau-de-bord';
        if (user.status === 'pending') {
          // Le backend encode déjà '/onboarding?redirect=...' — sinon on l'enveloppe nous-mêmes
          this.router.navigateByUrl(
            safe.startsWith('/onboarding')
              ? safe
              : '/onboarding' + (safe !== '/tableau-de-bord' ? '?redirect=' + encodeURIComponent(safe) : '')
          );
        } else {
          this.router.navigateByUrl(safe);
        }
      },
      error: () => {
        // loadMe() a échoué après storeToken — token peut-être invalide
        // On nettoie tout pour éviter un état incohérent
        this.auth.logout(); // clearSession + redirect /connexion
      },
    });
  }
}
