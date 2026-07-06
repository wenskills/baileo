import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

/**
 * Mon profil public — côté propriétaire.
 * RGPD : le propriétaire choisit ce qu'il montre. Les candidats verront sur
 * ses annonces : prénom + initiale, ancienneté, nombre d'annonces actives,
 * et cette bio s'il la remplit. Rien d'autre.
 */
@Component({
  selector: 'app-owner-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Mon profil public</h1>
      <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1.25rem">
        Rassurez vos candidats : c'est ce qu'ils verront sur vos annonces.
      </p>

      <!-- Aperçu exact de ce que voit un candidat -->
      <div class="card p-5 mb-4" style="border:1.5px solid #C8DDD7;background:#F8FBF9">
        <p style="font-size:.6875rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem">
          Aperçu — ce que voient les candidats
        </p>
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
               style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
            <span style="font-size:1rem;font-weight:700;color:white;font-family:Inter,sans-serif">{{ initials() }}</span>
          </div>
          <div>
            <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ publicName() }}</p>
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Propriétaire sur Baileo</p>
            @if (bio.trim()) {
              <p style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif;margin-top:.5rem;line-height:1.6">{{ bio }}</p>
            } @else {
              <p style="font-size:.8125rem;color:#D1D5DB;font-family:Inter,sans-serif;margin-top:.5rem;font-style:italic">
                Votre bio apparaîtra ici.
              </p>
            }
          </div>
        </div>
      </div>

      <div class="card p-5">
        <label style="font-size:.8125rem;font-weight:600;color:#374151;font-family:Inter,sans-serif;display:block;margin-bottom:.5rem">
          Votre bio publique <span style="color:#9CA3AF;font-weight:400">({{ bio.length }}/600)</span>
        </label>
        <textarea [(ngModel)]="bio" rows="5" maxlength="600"
                  placeholder="Ex : Propriétaire à Marseille depuis 10 ans, je privilégie les échanges simples et réactifs. Réponse sous 24h."
                  class="w-full p-3 rounded-xl resize-none"
                  style="border:1.5px solid #E5E7EB;font-size:.875rem;font-family:Inter,sans-serif;color:#0A1F1A;outline:none"
                  (focus)="$any($event.target).style.borderColor='#2C7A5E'"
                  (blur)="$any($event.target).style.borderColor='#E5E7EB'"></textarea>

        <div class="mt-2 p-3 rounded-xl flex items-start gap-2" style="background:#F0F9F5;border:1px solid #C8DDD7">
          <svg class="w-4 h-4 shrink-0 mt-0.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p style="font-size:.75rem;color:#1B4438;font-family:Inter,sans-serif;line-height:1.5">
            <strong>Conseil :</strong> les annonces avec une bio propriétaire reçoivent plus de candidatures complètes.
            Mentionnez votre réactivité et votre façon de gérer la location — jamais de coordonnées directes
            (les échanges passent par la messagerie sécurisée).
          </p>
        </div>

        @if (message()) {
          <p class="mt-3" style="font-size:.8125rem;font-weight:600;font-family:Inter,sans-serif"
             [style.color]="isError() ? '#DC2626' : '#2C7A5E'">{{ message() }}</p>
        }

        <button type="button" (click)="save()" [disabled]="saving()"
                class="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
          {{ saving() ? 'Enregistrement...' : 'Enregistrer mon profil' }}
        </button>
      </div>

      <!-- RGPD : portabilité des données (article 20) -->
      <div class="card p-4 mt-4 flex items-center justify-between">
        <div>
          <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Vos données vous appartiennent</p>
          <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Téléchargez une copie complète de vos données (RGPD).</p>
        </div>
        <button type="button" (click)="exportData()" [disabled]="exporting()"
                class="px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;cursor:pointer;font-family:Inter,sans-serif">
          {{ exporting() ? 'Préparation...' : 'Télécharger mes données' }}
        </button>
      </div>
    </div>
  `,
})
export class OwnerProfileComponent implements OnInit {
  bio = '';
  saving  = signal(false);
  message = signal('');
  isError = signal(false);

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    const u = this.auth.currentUser() as { publicBio?: string | null } | null;
    this.bio = u?.publicBio ?? '';
    // Rafraîchir depuis l'API (la session restaurée peut être antérieure)
    this.http.get<{ publicBio?: string | null }>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (me) => { if (me?.publicBio != null) this.bio = me.publicBio; },
      error: () => {},
    });
  }

  publicName(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.firstName} ${(u.lastName || '').charAt(0)}${u.lastName ? '.' : ''}`;
  }

  initials(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName.charAt(0)}${(u.lastName || '').charAt(0)}` : '';
  }

  exporting = signal(false);

  exportData(): void {
    this.exporting.set(true);
    this.http.get(`${environment.apiUrl}/auth/export`).subscribe({
      next: (data) => {
        this.exporting.set(false);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `baileo-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => this.exporting.set(false),
    });
  }

  save(): void {
    this.message.set('');
    this.saving.set(true);
    this.http.patch(`${environment.apiUrl}/auth/profile`, { publicBio: this.bio.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.isError.set(false);
        this.message.set('Profil enregistré — visible sur vos annonces publiées.');
      },
      error: (e) => {
        this.saving.set(false);
        this.isError.set(true);
        this.message.set(e?.error?.error || `Enregistrement impossible (HTTP ${e?.status ?? '?'}).`);
      },
    });
  }
}
