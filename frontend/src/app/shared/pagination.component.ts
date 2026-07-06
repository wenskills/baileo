import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationMeta {
  page: number; limit: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (meta && meta.totalPages > 1) {
      <div class="flex items-center justify-between py-3"
           style="border-top:1px solid #F0F0F0">
        <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
          {{ (meta.page - 1) * meta.limit + 1 }}–{{ Math.min(meta.page * meta.limit, meta.total) }}
          sur {{ meta.total }} résultat{{ meta.total > 1 ? 's' : '' }}
        </p>
        <div class="flex items-center gap-1">
          <!-- Précédent -->
          <button type="button" (click)="changePage(meta.page - 1)"
                  [disabled]="!meta.hasPrev"
                  class="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style="border:1.5px solid #E5E7EB;background:white"
                  [style.cursor]="meta.hasPrev ? 'pointer' : 'default'">
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>

          <!-- Pages -->
          @for (p of pages(); track p) {
            @if (p === -1) {
              <span style="font-size:.8125rem;color:#D1D5DB;font-family:Inter,sans-serif;padding:0 .25rem">…</span>
            } @else {
              <button type="button" (click)="changePage(p)"
                      class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-all"
                      style="font-family:Inter,sans-serif"
                      [style.background]="p === meta.page ? '#0A1F1A' : 'white'"
                      [style.color]="p === meta.page ? 'white' : '#374151'"
                      [style.border]="p === meta.page ? 'none' : '1.5px solid #E5E7EB'">
                {{ p }}
              </button>
            }
          }

          <!-- Suivant -->
          <button type="button" (click)="changePage(meta.page + 1)"
                  [disabled]="!meta.hasNext"
                  class="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style="border:1.5px solid #E5E7EB;background:white"
                  [style.cursor]="meta.hasNext ? 'pointer' : 'default'">
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </button>
        </div>
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() meta: PaginationMeta | null = null;
  @Output() pageChange = new EventEmitter<number>();

  Math = Math;

  changePage(p: number): void {
    if (!this.meta) return;
    if (p < 1 || p > this.meta.totalPages) return;
    this.pageChange.emit(p);
  }

  pages(): number[] {
    if (!this.meta) return [];
    const { page, totalPages } = this.meta;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (page > 3) pages.push(-1);
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push(-1);
    pages.push(totalPages);
    return pages;
  }
}
