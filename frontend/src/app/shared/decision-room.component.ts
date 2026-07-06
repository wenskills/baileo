import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Checklist {
  documentsRequired: number;
  documentsMissing: string[];
  documentsUnvalidated: string[];
  documentsOk: boolean;
  visitDone: boolean;
  currentStatus: string;
}

/**
 * Decision Room (spec Phase 2) — modale de décision formelle.
 * Checklist factuelle serveur, message candidat choisi (obligatoire au refus,
 * templates neutres), raison interne privée, confirmation obligatoire.
 * Le refus est TOUJOURS neutre : aucun motif discriminatoire proposé.
 */
@Component({
  selector: 'app-decision-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 flex items-center justify-center p-4" style="background:rgba(10,31,26,.55);z-index:60"
         (click)="closed.emit()">
      <div class="w-full rounded-2xl bg-white p-6 overflow-y-auto" style="max-width:34rem;max-height:90vh" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-1">
          <h2 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.125rem;color:#0A1F1A">Salle de décision</h2>
          <button type="button" (click)="closed.emit()" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:1.125rem">✕</button>
        </div>
        <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1rem">
          Candidature de <strong>{{ candidateName }}</strong> — la décision est notifiée et tracée.
        </p>

        <!-- Checklist factuelle (serveur) -->
        @if (checklist(); as cl) {
          <div class="p-3 rounded-xl mb-4" style="background:#F8FBF9;border:1px solid #E5EFEA">
            <p style="font-size:.75rem;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-bottom:.375rem">Avant de décider</p>
            <div class="space-y-1">
              <p class="flex items-center gap-2" style="font-size:.75rem;font-family:Inter,sans-serif"
                 [style.color]="cl.documentsOk ? '#1B4438' : '#B45309'">
                <span>{{ cl.documentsOk ? '✓' : '⚠' }}</span>
                @if (cl.documentsOk) { Documents requis complets et validés }
                @else if (cl.documentsMissing.length) { {{ cl.documentsMissing.length }} document(s) manquant(s) }
                @else { {{ cl.documentsUnvalidated.length }} document(s) non encore validé(s) }
              </p>
              <p class="flex items-center gap-2" style="font-size:.75rem;font-family:Inter,sans-serif"
                 [style.color]="cl.visitDone ? '#1B4438' : '#B45309'">
                <span>{{ cl.visitDone ? '✓' : '⚠' }}</span>
                {{ cl.visitDone ? 'Visite réalisée' : 'Aucune visite réalisée à ce jour' }}
              </p>
            </div>
          </div>
        }

        <!-- Choix -->
        <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">Votre décision</p>
        <div class="grid grid-cols-2 gap-2 mb-4">
          @for (opt of options; track opt.value) {
            <button type="button" (click)="choice.set(opt.value)"
                    class="p-3 rounded-xl text-left transition-all"
                    [style.border]="choice() === opt.value ? '2px solid ' + opt.color : '1.5px solid #E5E7EB'"
                    [style.background]="choice() === opt.value ? opt.color + '10' : 'white'"
                    style="cursor:pointer">
              <p style="font-size:.8125rem;font-weight:700;font-family:Inter,sans-serif" [style.color]="opt.color">{{ opt.label }}</p>
              <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ opt.hint }}</p>
            </button>
          }
        </div>

        <!-- Message au candidat -->
        <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.25rem">
          Message au candidat
          @if (choice() === 'rejected') { <span style="color:#DC2626">(obligatoire)</span> }
          @else { <span style="font-weight:400;color:#9CA3AF">(recommandé)</span> }
        </p>
        <div class="flex flex-wrap gap-1.5 mb-2">
          @for (t of templatesFor(choice()); track t) {
            <button type="button" (click)="candidateMessage = t"
                    class="px-2 py-1 rounded-lg"
                    style="font-size:.6875rem;border:1.5px solid #C8DDD7;color:#1B4438;background:white;cursor:pointer;font-family:Inter,sans-serif">{{ t }}</button>
          }
        </div>
        <textarea [(ngModel)]="candidateMessage" rows="3" maxlength="2000"
                  placeholder="Ce message sera envoyé dans la conversation..."
                  class="w-full p-3 rounded-xl text-sm resize-none mb-3"
                  style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"></textarea>

        <!-- Raison interne (privée) -->
        <p class="flex items-center gap-2" style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.25rem">
          Raison interne
          <span class="px-1.5 py-0.5 rounded" style="font-size:.5625rem;font-weight:700;background:#F3F4F6;color:#6B7280">PRIVÉ — jamais transmis</span>
        </p>
        <textarea [(ngModel)]="internalReason" rows="2" maxlength="2000"
                  placeholder="Pour votre suivi uniquement..."
                  class="w-full p-3 rounded-xl text-sm resize-none mb-4"
                  style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"></textarea>

        @if (error()) {
          <p class="mb-3" style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p>
        }

        <div class="flex gap-2">
          <button type="button" (click)="closed.emit()"
                  class="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style="border:1.5px solid #E5E7EB;color:#374151;background:white;cursor:pointer;font-family:Inter,sans-serif">Annuler</button>
          <button type="button" (click)="confirm()" [disabled]="!choice() || sending()"
                  class="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
            {{ sending() ? 'Envoi...' : 'Confirmer la décision' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DecisionRoomComponent implements OnInit {
  @Input({ required: true }) applicationId!: string;
  @Input() candidateName = 'ce candidat';
  @Output() closed  = new EventEmitter<void>();
  @Output() decided = new EventEmitter<string>(); // nouveau statut

  checklist = signal<Checklist | null>(null);
  choice    = signal<'accepted' | 'rejected' | 'waitlisted' | 'cancelled' | ''>('');
  sending   = signal(false);
  error     = signal('');
  candidateMessage = '';
  internalReason   = '';

  options = [
    { value: 'accepted'   as const, label: 'Accepter',        color: '#2C7A5E', hint: 'Prépare le bail' },
    { value: 'waitlisted' as const, label: 'Liste d\'attente', color: '#F59E0B', hint: 'Dossier conservé' },
    { value: 'rejected'   as const, label: 'Refuser',          color: '#DC2626', hint: 'Message neutre requis' },
    { value: 'cancelled'  as const, label: 'Annuler',          color: '#9CA3AF', hint: 'Candidature sans suite' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ checklist: Checklist }>(`${environment.apiUrl}/applications/${this.applicationId}/decision`).subscribe({
      next: (res) => this.checklist.set(res.checklist),
      error: () => {},
    });
  }

  /** Templates NEUTRES uniquement — jamais de motif personnel ou discriminatoire. */
  templatesFor(choice: string): string[] {
    switch (choice) {
      case 'accepted':
        return ['Félicitations, votre candidature est retenue ! Nous revenons vers vous pour la suite (bail, état des lieux).'];
      case 'waitlisted':
        return ['Votre dossier est placé en liste d\'attente. Nous vous tiendrons informé rapidement.'];
      case 'rejected':
        return [
          'Après étude, nous ne donnons pas suite à votre candidature. Merci pour votre dossier et le temps consacré.',
          'Nous avons retenu un autre dossier pour ce logement. Merci pour votre candidature.',
        ];
      default:
        return [];
    }
  }

  confirm(): void {
    if (!this.choice()) return;
    if (this.choice() === 'rejected' && !this.candidateMessage.trim()) {
      this.error.set('Un message au candidat est requis pour un refus.');
      return;
    }
    if (!confirm('Confirmer cette décision ? Elle sera notifiée au candidat et tracée dans l\'historique.')) return;
    this.sending.set(true);
    this.error.set('');
    this.http.post<{ status: string }>(`${environment.apiUrl}/applications/${this.applicationId}/decision`, {
      decision: this.choice(),
      candidateMessage: this.candidateMessage.trim() || null,
      internalReason: this.internalReason.trim() || null,
    }).subscribe({
      next: (res) => { this.sending.set(false); this.decided.emit(res.status); },
      error: (e) => {
        this.sending.set(false);
        this.error.set(e?.error?.error?.message || e?.error?.error || 'Décision impossible.');
      },
    });
  }
}
