import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CampaignService, Campaign, PaginatedResponse } from '../../core/services/campaign.service';
import { PhotoService } from '../../core/services/photo.service';
import { PaginationComponent, PaginationMeta } from '../../shared/pagination.component';

/**
 * Recherche d'annonces — côté candidat.
 * Le candidat parcourt toutes les campagnes publiées, filtre (recherche,
 * budget max, type de bien) et rejoint la page publique pour postuler.
 * RGPD : l'adresse affichée est celle que le propriétaire a choisi d'exposer.
 */
@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  styles: [`
    .filter-input { padding:.5625rem .875rem; border:1.5px solid #E5E7EB; border-radius:.625rem; font-size:.875rem; font-family:Inter,sans-serif; color:#0A1F1A; outline:none; background:white; }
    .filter-input:focus { border-color:#2C7A5E; }
  `],
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <div class="mb-5">
        <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Annonces</h1>
        <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
          Trouvez votre prochain logement et déposez votre dossier en un clic.
        </p>
      </div>

      <!-- Filtres -->
      <div class="card p-4 mb-5 flex gap-3 flex-wrap items-end">
        <div class="flex-1" style="min-width:14rem">
          <label style="font-size:.75rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Rechercher</label>
          <input [(ngModel)]="q" (keyup.enter)="search()" placeholder="Titre, ville, quartier..."
                 class="filter-input w-full"/>
        </div>
        <div>
          <label style="font-size:.75rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Budget max (CC)</label>
          <input type="number" [(ngModel)]="maxRent" min="0" placeholder="1 200 €" class="filter-input" style="width:8.5rem"/>
        </div>
        <div>
          <label style="font-size:.75rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Type de bien</label>
          <select [(ngModel)]="type" class="filter-input" style="width:10rem">
            <option value="">Tous</option>
            <option value="apartment">Appartement</option>
            <option value="house">Maison</option>
            <option value="studio">Studio</option>
            <option value="shared">Colocation</option>
          </select>
        </div>
        <button type="button" (click)="search()"
                class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
          Rechercher
        </button>
        @if (hasFilters()) {
          <button type="button" (click)="clearFilters()"
                  style="font-size:.8125rem;color:#9CA3AF;background:none;border:none;cursor:pointer;font-family:Inter,sans-serif;padding:.5rem 0">
            Réinitialiser
          </button>
        }
      </div>

      <!-- Conseil -->
      <div class="p-3 rounded-xl flex items-start gap-2 mb-5" style="background:#F0F9F5;border:1px solid #C8DDD7">
        <svg class="w-4 h-4 shrink-0 mt-0.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
        </svg>
        <p style="font-size:.75rem;color:#1B4438;font-family:Inter,sans-serif;line-height:1.5">
          <strong>Conseil :</strong> complétez votre Rental Passport avant de postuler —
          les dossiers complets ont 3x plus de chances d'être sélectionnés.
        </p>
      </div>

      <!-- Résultats -->
      @if (loading()) {
        <div class="grid grid-cols-3 gap-4">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse"><div class="h-32 bg-gray-100 rounded-xl mb-3"></div><div class="h-4 bg-gray-100 rounded w-2/3"></div></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-3 gap-4">
          @for (c of campaigns(); track c.id) {
            <a [routerLink]="['/annonces', c.slug || c.id]"
               class="card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
               style="text-decoration:none;display:block">
              <div class="h-36 relative" style="background:#E0EDE8">
                @if (c.photos?.length) {
                  <img [src]="resolveUrl(c.photos![0])" class="w-full h-full object-cover" alt=""/>
                } @else {
                  <div class="w-full h-full flex items-center justify-center">
                    <svg class="w-8 h-8" style="color:#8FBCAD" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"/>
                    </svg>
                  </div>
                }
                @if (c.myApplicationStatus) {
                  <span class="absolute top-2 right-2 px-2 py-1 rounded-lg"
                        style="font-size:.625rem;font-weight:700;background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                    ✓ Déjà postulé
                  </span>
                }
              </div>
              <div class="p-4">
                <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  {{ c.title }}
                </p>
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  {{ c.address }}
                </p>
                <div class="flex items-center justify-between mt-2">
                  <p style="font-size:1rem;font-weight:800;color:#1B4438;font-family:Inter,sans-serif">
                    {{ c.rent + c.charges | number:'1.0-0' }} €<span style="font-size:.6875rem;font-weight:500;color:#9CA3AF"> /mois CC</span>
                  </p>
                  <p style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
                    @if (c.surface) { {{ c.surface }} m² }
                    @if (c.rooms) { · {{ c.rooms }} p. }
                  </p>
                </div>
              </div>
            </a>
          } @empty {
            <div class="col-span-3 card p-10 text-center">
              <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                {{ hasFilters() ? 'Aucune annonce ne correspond à vos critères' : 'Aucune annonce disponible pour le moment' }}
              </p>
              <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.25rem">
                {{ hasFilters() ? 'Élargissez votre budget ou retirez des filtres.' : 'Revenez bientôt — de nouvelles annonces sont publiées chaque jour.' }}
              </p>
            </div>
          }
        </div>

        @if (meta()) {
          <div class="mt-5">
            <app-pagination [meta]="meta()!" (pageChange)="loadPage($event)"/>
          </div>
        }
      }
    </div>
  `,
})
export class BrowseComponent implements OnInit {
  campaigns = signal<Campaign[]>([]);
  meta      = signal<PaginationMeta | null>(null);
  loading   = signal(true);

  q = '';
  maxRent: number | null = null;
  type = '';

  constructor(private svc: CampaignService) {}

  ngOnInit(): void { this.loadPage(1); }

  hasFilters(): boolean { return !!(this.q.trim() || this.maxRent || this.type); }

  search(): void { this.loadPage(1); }

  clearFilters(): void {
    this.q = ''; this.maxRent = null; this.type = '';
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.svc.list({
      q: this.q.trim() || undefined,
      maxRent: this.maxRent || undefined,
      type: this.type || undefined,
      page, limit: 12,
    }).subscribe({
      next: (res: PaginatedResponse<Campaign>) => {
        this.campaigns.set(res.data);
        this.meta.set(res.meta as PaginationMeta);
        this.loading.set(false);
      },
      error: () => { this.campaigns.set([]); this.meta.set(null); this.loading.set(false); },
    });
  }

  resolveUrl(url: string): string { return PhotoService.resolveUrl(url); }
}
