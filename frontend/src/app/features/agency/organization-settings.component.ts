import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Paramètres de l'organisation (agence) — nom, SIRET, adresse, facturation.
 * Modification réservée aux administrateurs (contrôlé serveur).
 */
@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Organisation</h1>
      <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1.25rem">
        Les informations de votre agence.
      </p>

      <div class="card p-5">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="olabel">Nom de l'organisation</label>
            <input [(ngModel)]="form.name" [disabled]="!isAdmin()" class="oinput" maxlength="120"/>
          </div>
          <div>
            <label class="olabel">SIRET</label>
            <input [(ngModel)]="form.siret" [disabled]="!isAdmin()" class="oinput" maxlength="14" placeholder="14 chiffres"/>
          </div>
          <div>
            <label class="olabel">Email de facturation</label>
            <input [(ngModel)]="form.billingEmail" [disabled]="!isAdmin()" class="oinput" type="email"/>
          </div>
          <div class="col-span-2">
            <label class="olabel">Adresse</label>
            <input [(ngModel)]="form.address" [disabled]="!isAdmin()" class="oinput" maxlength="200"/>
          </div>
          <div>
            <label class="olabel">Ville</label>
            <input [(ngModel)]="form.city" [disabled]="!isAdmin()" class="oinput" maxlength="100"/>
          </div>
          <div>
            <label class="olabel">Code postal</label>
            <input [(ngModel)]="form.postalCode" [disabled]="!isAdmin()" class="oinput" maxlength="10"/>
          </div>
        </div>

        @if (message()) {
          <p class="mt-3" style="font-size:.8125rem;font-weight:600;font-family:Inter,sans-serif"
             [style.color]="isError() ? '#DC2626' : '#2C7A5E'">{{ message() }}</p>
        }
        @if (isAdmin()) {
          <button type="button" (click)="save()" [disabled]="saving()"
                  class="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
            {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        } @else {
          <p class="mt-3" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
            Seul un administrateur peut modifier ces informations.
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .olabel { font-size:.6875rem; font-weight:600; color:#6B7280; font-family:Inter,sans-serif; display:block; margin-bottom:.25rem; }
    .oinput { width:100%; padding:.5625rem .75rem; border:1.5px solid #E5E7EB; border-radius:.625rem; font-size:.875rem; font-family:Inter,sans-serif; color:#0A1F1A; outline:none; background:white; }
    .oinput:disabled { background:#FAFAFA; color:#9CA3AF; }
    .oinput:focus { border-color:#2C7A5E; }
  `],
})
export class OrganizationSettingsComponent implements OnInit {
  form = { name: '', siret: '', address: '', city: '', postalCode: '', billingEmail: '' };
  orgId   = signal('');
  myRole  = signal('');
  saving  = signal(false);
  message = signal('');
  isError = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ id: string; name: string; siret: string | null; address: string | null; city: string | null; postalCode: string | null; billingEmail: string | null; myRole: string }>(
      `${environment.apiUrl}/organizations/current`
    ).subscribe({
      next: (o) => {
        this.orgId.set(o.id);
        this.myRole.set(o.myRole ?? '');
        this.form = {
          name: o.name ?? '', siret: o.siret ?? '', address: o.address ?? '',
          city: o.city ?? '', postalCode: o.postalCode ?? '', billingEmail: o.billingEmail ?? '',
        };
      },
      error: () => { this.isError.set(true); this.message.set('Aucune organisation associée à votre compte.'); },
    });
  }

  isAdmin(): boolean { return this.myRole() === 'admin'; }

  save(): void {
    this.saving.set(true); this.message.set('');
    this.http.patch(`${environment.apiUrl}/organizations/${this.orgId()}`, {
      name: this.form.name, siret: this.form.siret || null, address: this.form.address || null,
      city: this.form.city || null, postalCode: this.form.postalCode || null,
      billingEmail: this.form.billingEmail || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.isError.set(false); this.message.set('Organisation enregistrée.'); },
      error: (e) => { this.saving.set(false); this.isError.set(true); this.message.set(e?.error?.error?.message || 'Enregistrement impossible.'); },
    });
  }
}
