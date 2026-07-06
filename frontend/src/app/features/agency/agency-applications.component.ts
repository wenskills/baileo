import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationService } from '../../core/services/application.service';

interface Row { id: string; candidateName: string; campaignId: string; campaignTitle: string; status: string; assignedTo: string | null; createdAt: string }

/**
 * Candidatures de l'agence (spec Wendy) : vue globale multi-campagnes,
 * paginée, filtrable par statut, campagne, et « mes dossiers ».
 */
@Component({
  selector: 'app-agency-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Candidatures de l'agence</h1>
      <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1rem">
        Toutes les campagnes de l'organisation, qui traite quoi, où en est chaque dossier.
      </p>

      <!-- Filtres -->
      <div class="flex flex-wrap gap-2 mb-4 items-center">
        <select [(ngModel)]="fStatus" (ngModelChange)="go(1)" class="filter-input">
          <option value="">Tous les statuts</option>
          @for (s of statusOptions; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
        </select>
        <select [(ngModel)]="fCampaign" (ngModelChange)="go(1)" class="filter-input" style="max-width:16rem">
          <option value="">Toutes les campagnes</option>
          @for (c of campaigns(); track c.id) { <option [value]="c.id">{{ c.title }}</option> }
        </select>
        <label class="flex items-center gap-1.5" style="cursor:pointer">
          <input type="checkbox" [(ngModel)]="fMine" (ngModelChange)="go(1)" style="accent-color:#2C7A5E"/>
          <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">Mes dossiers</span>
        </label>
        <span class="ml-auto" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ total() }} candidature(s)</span>
      </div>

      <!-- Tableau -->
      <div class="card overflow-hidden">
        @if (loading()) {
          <div class="p-6 animate-pulse space-y-2"><div class="h-8 bg-gray-100 rounded"></div><div class="h-8 bg-gray-100 rounded"></div></div>
        } @else if (!rows().length) {
          <div class="p-8 text-center">
            <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Aucune candidature</p>
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Ajustez les filtres ou publiez une campagne.</p>
          </div>
        } @else {
          @for (r of rows(); track r.id) {
            <a [routerLink]="['/candidatures', r.id]"
               class="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors"
               style="text-decoration:none;border-bottom:1px solid #F5F7F6">
              <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                <span style="font-size:.6875rem;font-weight:700;color:white;font-family:Inter,sans-serif">{{ r.candidateName.charAt(0) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ r.candidateName }}</p>
                <p class="truncate" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ r.campaignTitle }}</p>
              </div>
              <span class="hidden sm:block px-2 py-0.5 rounded-lg shrink-0" style="font-size:.6875rem;font-weight:600;background:#F5F7F6;color:#374151;font-family:Inter,sans-serif">
                {{ r.assignedTo ? '→ ' + r.assignedTo : 'Non assigné' }}
              </span>
              <span class="px-2 py-0.5 rounded-full shrink-0"
                    [style.background]="statusColor(r.status) + '18'" [style.color]="statusColor(r.status)"
                    style="font-size:.6875rem;font-weight:700;font-family:Inter,sans-serif">{{ statusLabel(r.status) }}</span>
            </a>
          }
        }
      </div>

      <!-- Pagination -->
      @if (pages() > 1) {
        <div class="flex items-center justify-center gap-2 mt-4">
          <button type="button" (click)="go(page() - 1)" [disabled]="page() <= 1" class="page-btn">←</button>
          <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">Page {{ page() }} / {{ pages() }}</span>
          <button type="button" (click)="go(page() + 1)" [disabled]="page() >= pages()" class="page-btn">→</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .filter-input { padding:.5rem .75rem; border:1.5px solid #E5E7EB; border-radius:.625rem; font-size:.8125rem; font-family:Inter,sans-serif; background:white; outline:none; }
    .page-btn { padding:.375rem .875rem; border:1.5px solid #E5E7EB; border-radius:.625rem; background:white; cursor:pointer; font-family:Inter,sans-serif; }
    .page-btn:disabled { opacity:.35; cursor:default; }
  `],
})
export class AgencyApplicationsComponent implements OnInit {
  rows      = signal<Row[]>([]);
  campaigns = signal<{ id: string; title: string }[]>([]);
  total     = signal(0);
  page      = signal(1);
  pages     = signal(1);
  loading   = signal(true);
  fStatus   = '';
  fCampaign = '';
  fMine     = false;

  statusOptions = ['new', 'prequalification', 'documents', 'visite', 'decision', 'signature', 'accepted', 'waitlist', 'refused', 'cancelled', 'withdrawn'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.go(1); }

  go(page: number): void {
    this.loading.set(true);
    const params = new URLSearchParams({ page: String(Math.max(1, page)), perPage: '15' });
    if (this.fStatus) params.set('status', this.fStatus);
    if (this.fCampaign) params.set('campaignId', this.fCampaign);
    if (this.fMine) params.set('mine', '1');
    this.http.get<{ data: Row[]; total: number; page: number; pages: number; campaigns: { id: string; title: string }[] }>(
      `${environment.apiUrl}/agency/applications?${params.toString()}`
    ).subscribe({
      next: (res) => {
        this.rows.set(res.data); this.total.set(res.total);
        this.page.set(res.page); this.pages.set(res.pages);
        this.campaigns.set(res.campaigns ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: string): string { return s === 'withdrawn' ? 'Retirée' : ApplicationService.statusLabel(s); }
  statusColor(s: string): string { return s === 'withdrawn' ? '#9CA3AF' : ApplicationService.statusColor(s); }
}
