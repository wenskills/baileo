import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Section { key: string; title: string; priority: string; count: number; items: { label: string; link: string }[] }

/**
 * Action Center (spec) — « À traiter » : agrège ce qui demande une action.
 * Calculé serveur en temps réel. Rien à traiter = message rassurant.
 */
@Component({
  selector: 'app-action-center',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="flex items-center gap-2" style="font-size:1rem;font-weight:800;color:#0A1F1A;font-family:Inter,sans-serif">
          À traiter
          @if (total() > 0) {
            <span class="px-2 py-0.5 rounded-full" style="font-size:.6875rem;font-weight:800;background:#1B4438;color:white;font-family:Inter,sans-serif">{{ total() }}</span>
          }
        </h3>
        <button type="button" (click)="load()" title="Actualiser"
                style="background:none;border:none;cursor:pointer;color:#9CA3AF">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
        </button>
      </div>

      @if (loading()) {
        <div class="animate-pulse space-y-2"><div class="h-10 bg-gray-100 rounded-xl"></div><div class="h-10 bg-gray-100 rounded-xl"></div></div>
      } @else if (total() === 0) {
        <div class="text-center py-4">
          <p style="font-size:.9375rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">Tout est à jour ✓</p>
          <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Aucune action n'attend votre attention.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (s of activeSections(); track s.key) {
            <div class="rounded-xl overflow-hidden" style="border:1.5px solid #F0F0F0">
              <button type="button" (click)="toggle(s.key)"
                      class="w-full flex items-center justify-between p-3"
                      style="background:white;border:none;cursor:pointer">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full"
                        [style.background]="s.priority === 'high' ? '#DC2626' : (s.priority === 'medium' ? '#F97316' : '#9CA3AF')"></span>
                  <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ s.title }}</span>
                </span>
                <span class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-lg" style="font-size:.6875rem;font-weight:800;background:#F5F7F6;color:#374151;font-family:Inter,sans-serif">{{ s.count }}</span>
                  <svg class="w-3.5 h-3.5 transition-transform" [style.transform]="open() === s.key ? 'rotate(90deg)' : ''"
                       style="color:#9CA3AF" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                </span>
              </button>
              @if (open() === s.key) {
                <div style="border-top:1px solid #F5F7F6">
                  @for (it of s.items; track it.label) {
                    <a [routerLink]="linkPath(it.link)" [queryParams]="linkQuery(it.link)"
                       class="block px-3 py-2 hover:bg-green-50 transition-colors"
                       style="font-size:.75rem;color:#374151;font-family:Inter,sans-serif;text-decoration:none;border-bottom:1px solid #FAFAFA">
                      {{ it.label }} →
                    </a>
                  }
                  @if (s.count > s.items.length) {
                    <p class="px-3 py-1.5" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                      + {{ s.count - s.items.length }} autre(s)
                    </p>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ActionCenterComponent implements OnInit {
  total    = signal(0);
  sections = signal<Section[]>([]);
  loading  = signal(true);
  open     = signal('');

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<{ total: number; sections: Section[] }>(`${environment.apiUrl}/action-center`).subscribe({
      next: (res) => {
        this.total.set(res.total);
        this.sections.set(res.sections);
        this.loading.set(false);
        const first = res.sections.find(s => s.count > 0);
        if (first && !this.open()) this.open.set(first.key);
      },
      error: () => this.loading.set(false),
    });
  }

  activeSections(): Section[] { return this.sections().filter(s => s.count > 0); }
  toggle(key: string): void { this.open.set(this.open() === key ? '' : key); }

  linkPath(link: string): string { return link.split('?')[0]; }
  linkQuery(link: string): Record<string, string> {
    const q = link.split('?')[1];
    if (!q) return {};
    const out: Record<string, string> = {};
    for (const pair of q.split('&')) {
      const [k, v] = pair.split('=');
      if (k) out[k] = decodeURIComponent(v ?? '');
    }
    return out;
  }
}
