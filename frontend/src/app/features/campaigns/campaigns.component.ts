import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CampaignService, Campaign, PaginatedResponse } from '../../core/services/campaign.service';
import { PhotoService } from '../../core/services/photo.service';
import { PaginationComponent, PaginationMeta } from '../../shared/pagination.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent, FormsModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.625rem;color:#0A1F1A;letter-spacing:-.03em">
            Mes campagnes
          </h1>
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
            {{ campaigns().length }} campagne{{ campaigns().length !== 1 ? 's' : '' }} au total
          </p>
        </div>
        @if (isOwner()) {
          <a routerLink="/campagnes/creer"
             class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white"
             style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Nouvelle campagne
          </a>
        }
      </div>

      @if (loading()) {
        <!-- Recherche + filtres (candidat seulement) -->
      @if (!isOwner()) {
        <div class="flex gap-3 mb-4">
          <div class="relative flex-1">
            <input [(ngModel)]="searchQuery" placeholder="Rechercher une annonce..."
                   (ngModelChange)="onSearch()"
                   class="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white"
                   style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"/>
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
          </div>
          <select [(ngModel)]="filterType" (ngModelChange)="onSearch()"
                  class="px-3 py-2.5 rounded-xl text-sm bg-white"
                  style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;color:#374151;outline:none">
            <option value="">Tous les types</option>
            <option value="apartment">Appartement</option>
            <option value="house">Maison</option>
            <option value="colocation">Colocation</option>
            <option value="studio">Studio</option>
          </select>
          <input type="number" [(ngModel)]="filterMaxRent" placeholder="Budget max €"
                 (ngModelChange)="onSearch()"
                 class="px-3 py-2.5 rounded-xl text-sm bg-white w-32"
                 style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none" min="0"/>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="card p-4 animate-pulse">
              <div class="flex gap-4">
                <div class="w-24 h-20 rounded-xl bg-gray-100 shrink-0"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-100 rounded w-3/4"></div>
                  <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                  <div class="h-3 bg-gray-100 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (!campaigns().length) {
        <div class="card p-12 text-center">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background:#E0EDE8">
            <svg class="w-7 h-7" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
            </svg>
          </div>
          <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Aucune campagne</p>
          <p style="font-size:.875rem;color:#9CA3AF;margin-top:.25rem;font-family:Inter,sans-serif">
            @if (isOwner()) { Créez votre première annonce de location. }
            @else { Aucune annonce disponible pour le moment. }
          </p>
          @if (isOwner()) {
            <a routerLink="/campagnes/creer"
               class="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
               style="background:#1B4438;font-family:Inter,sans-serif">
              Créer ma première campagne
            </a>
          }
        </div>
      } @else {
        <!-- Recherche + filtres (candidat seulement) -->
      @if (!isOwner()) {
        <div class="flex gap-3 mb-4">
          <div class="relative flex-1">
            <input [(ngModel)]="searchQuery" placeholder="Rechercher une annonce..."
                   (ngModelChange)="onSearch()"
                   class="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white"
                   style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"/>
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
          </div>
          <select [(ngModel)]="filterType" (ngModelChange)="onSearch()"
                  class="px-3 py-2.5 rounded-xl text-sm bg-white"
                  style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;color:#374151;outline:none">
            <option value="">Tous les types</option>
            <option value="apartment">Appartement</option>
            <option value="house">Maison</option>
            <option value="colocation">Colocation</option>
            <option value="studio">Studio</option>
          </select>
          <input type="number" [(ngModel)]="filterMaxRent" placeholder="Budget max €"
                 (ngModelChange)="onSearch()"
                 class="px-3 py-2.5 rounded-xl text-sm bg-white w-32"
                 style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none" min="0"/>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (c of campaigns(); track c.id) {
            <a [routerLink]="['/campagnes', c.id]"
               class="card hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden block"
               style="text-decoration:none">
              <!-- Photo -->
              <div class="h-36 overflow-hidden" style="background:linear-gradient(135deg,#E0EDE8,#C8DDD7)">
                @if (c.photos?.length) {
                  <img [src]="resolveUrl(c.photos![0])" alt="" class="w-full h-full object-cover"/>
                } @else {
                  <div class="w-full h-full flex items-center justify-center">
                    <svg class="w-10 h-10" style="color:#8BC5B5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                    </svg>
                  </div>
                }
              </div>
              <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif" class="truncate">
                    {{ c.title }}
                  </p>
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                        [style.background]="statusBg(c.status)"
                        [style.color]="statusColor(c.status)">
                    {{ statusLabel(c.status) }}
                  </span>
                @if (c.status === 'draft') {
                  <a [routerLink]="['/campagnes/creer']" [queryParams]="{draft: c.id}"
                     (click)="$event.stopPropagation()"
                     class="px-2.5 py-1 rounded-lg text-xs font-bold"
                     style="background:#1B4438;color:white;font-family:Inter,sans-serif;text-decoration:none">
                    Reprendre
                  </a>
                }
                </div>
                <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif" class="truncate mb-2">{{ c.address }}</p>
                <div class="flex items-center gap-3">
                  <span style="font-size:.875rem;font-weight:800;color:#0A1F1A;font-family:'Playfair Display',Georgia,serif">
                    {{ c.rent }}€<span style="font-size:.75rem;font-weight:400;font-family:Inter,sans-serif;color:#9CA3AF">/mois</span>
                  </span>
                  @if (c.surface) {
                    <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ c.surface }}m²</span>
                  }
                  @if (c.rooms) {
                    <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ c.rooms }} pièces</span>
                  }
                  @if (c.applicationCount !== undefined) {
                    <span class="ml-auto" style="font-size:.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif">
                      {{ c.applicationCount }} candidatures
                    </span>
                  }
                </div>
              </div>
            </a>
          }
        </div>
      }

      <!-- Pagination -->
      @if (meta()) {
        <app-pagination [meta]="meta()!" (pageChange)="loadPage($event)"></app-pagination>
      }
    </div>
  `,
})
export class CampaignsComponent implements OnInit {
  campaigns      = signal<Campaign[]>([]);
  loading        = signal(true);
  meta           = signal<PaginationMeta | null>(null);
  searchQuery    = '';
  filterType     = '';
  filterMaxRent: number | null = null;
  private searchTimer: any;

  constructor(private svc: CampaignService, private auth: AuthService) {}

  ngOnInit(): void { this.loadPage(1); }

  loadPage(page: number): void {
    this.loading.set(true);
    this.svc.list({
      q: this.searchQuery || undefined,
      type: this.filterType || undefined,
      maxRent: this.filterMaxRent ?? undefined,
      page, limit: 12,
    }).subscribe({
      next: (res) => {
        this.campaigns.set(res.data);
        this.meta.set(res.meta as PaginationMeta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadPage(1), 400);
  }

  isOwner(): boolean {
    const r = this.auth.currentUser()?.roles ?? [];
    return r.includes('ROLE_OWNER') || r.includes('ROLE_AGENCY');
  }

  statusLabel(s: string): string { return CampaignService.statusLabel(s); }
  statusColor(s: string): string { return CampaignService.statusColor(s); }
  statusBg(s: string): string { return this.statusColor(s) + '18'; }
  resolveUrl(url: string): string { return PhotoService.resolveUrl(url); }
}
