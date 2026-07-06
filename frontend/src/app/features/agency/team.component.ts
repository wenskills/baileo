import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Member { id: string; userId: string; name: string; email?: string; role: string; status: string; isOwner: boolean; joinedAt?: string }
interface Invitation { id: string; email: string; role: string; expiresAt: string; expired: boolean; link: string }

/**
 * Équipe (agence) — membres, rôles, invitations (spec : Agency Operations).
 * Les permissions sont contrôlées SERVEUR ; l'UI reflète le rôle renvoyé par l'API.
 */
@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.375rem;color:#0A1F1A">Équipe</h1>
      <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1.25rem">
        Votre équipe sait exactement qui traite quoi. Chaque action est historisée.
      </p>

      <!-- Inviter (admin/manager) -->
      @if (canManage()) {
        <div class="card p-4 mb-5">
          <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Inviter un membre</p>
          <div class="flex gap-2 flex-wrap items-end">
            <div class="flex-1" style="min-width:14rem">
              <label style="font-size:.6875rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Email</label>
              <input [(ngModel)]="inviteEmail" type="email" placeholder="collegue@agence.fr"
                     class="w-full px-3 py-2 rounded-xl text-sm" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"/>
            </div>
            <div>
              <label style="font-size:.6875rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Rôle</label>
              <select [(ngModel)]="inviteRole" class="px-3 py-2 rounded-xl text-sm" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none;background:white">
                <option value="agent">Agent — traite les dossiers</option>
                <option value="manager">Manager — campagnes & décisions</option>
                <option value="viewer">Lecture seule</option>
                @if (myRole() === 'admin') { <option value="admin">Administrateur</option> }
              </select>
            </div>
            <button type="button" (click)="invite()" [disabled]="inviting()"
                    class="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                    style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
              {{ inviting() ? 'Envoi...' : 'Inviter' }}
            </button>
          </div>
          @if (inviteLink()) {
            <div class="mt-3 p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #C8DDD7">
              <p style="font-size:.75rem;color:#1B4438;font-family:Inter,sans-serif">
                Invitation créée — transmettez ce lien à votre collègue :
              </p>
              <p class="mt-1 select-all" style="font-size:.75rem;font-weight:700;color:#0A1F1A;font-family:monospace;word-break:break-all">
                {{ origin }}{{ inviteLink() }}
              </p>
            </div>
          }
          @if (error()) { <p class="mt-2" style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p> }
        </div>
      }

      <!-- Membres -->
      <div class="card p-4">
        <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">
          Membres ({{ members().length }})
        </p>
        @for (m of members(); track m.id) {
          <div class="flex items-center gap-3 py-2.5" style="border-bottom:1px solid #F5F7F6">
            <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                 style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
              <span style="font-size:.75rem;font-weight:700;color:white;font-family:Inter,sans-serif">{{ m.name.charAt(0) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                {{ m.name }} @if (m.isOwner) { <span style="font-size:.625rem;color:#9CA3AF">(créateur)</span> }
              </p>
              <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ m.email }}</p>
            </div>
            @if (m.isOwner || !canAdmin()) {
              <span class="px-2 py-1 rounded-lg" style="font-size:.6875rem;font-weight:700;background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                {{ roleLabel(m.role) }}
              </span>
            } @else {
              <select [ngModel]="m.role" (ngModelChange)="changeRole(m, $event)"
                      class="px-2 py-1 rounded-lg text-xs" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;background:white">
                <option value="admin">Administrateur</option>
                <option value="manager">Manager</option>
                <option value="agent">Agent</option>
                <option value="viewer">Lecture seule</option>
              </select>
              <button type="button" (click)="remove(m)"
                      class="px-2 py-1 rounded-lg text-xs font-semibold"
                      style="border:1.5px solid #FECACA;color:#DC2626;background:white;cursor:pointer;font-family:Inter,sans-serif">
                Retirer
              </button>
            }
          </div>
        }

        @if (invitations().length) {
          <p style="font-size:.75rem;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-top:1rem;margin-bottom:.25rem">
            Invitations en attente
          </p>
          @for (i of invitations(); track i.id) {
            <div class="flex items-center justify-between py-2" style="border-bottom:1px solid #F5F7F6">
              <div>
                <p style="font-size:.8125rem;color:#0A1F1A;font-family:Inter,sans-serif">{{ i.email }} · {{ roleLabel(i.role) }}</p>
                <p class="select-all" style="font-size:.625rem;color:#9CA3AF;font-family:monospace;word-break:break-all">{{ origin }}{{ i.link }}</p>
              </div>
              <span class="px-2 py-0.5 rounded-lg shrink-0" style="font-size:.625rem;font-weight:700;font-family:Inter,sans-serif"
                    [style.background]="i.expired ? '#FEF2F2' : '#FFF7ED'" [style.color]="i.expired ? '#DC2626' : '#F97316'">
                {{ i.expired ? 'Expirée' : 'En attente' }}
              </span>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class TeamComponent implements OnInit {
  members     = signal<Member[]>([]);
  invitations = signal<Invitation[]>([]);
  myRole      = signal<string>('');
  orgId       = signal<string>('');
  inviting    = signal(false);
  inviteLink  = signal('');
  error       = signal('');
  inviteEmail = '';
  inviteRole  = 'agent';
  origin = typeof window !== 'undefined' ? window.location.origin : '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ id: string; myRole: string }>(`${environment.apiUrl}/organizations/current`).subscribe({
      next: (org) => {
        this.orgId.set(org.id);
        this.myRole.set(org.myRole ?? '');
        this.load();
      },
      error: () => this.error.set('Aucune organisation associée à votre compte.'),
    });
  }

  load(): void {
    this.http.get<{ data: Member[]; invitations: Invitation[] }>(
      `${environment.apiUrl}/organizations/${this.orgId()}/members`
    ).subscribe({
      next: (res) => { this.members.set(res.data ?? []); this.invitations.set(res.invitations ?? []); },
      error: () => {},
    });
  }

  canManage(): boolean { return ['admin', 'manager'].includes(this.myRole()); }
  canAdmin(): boolean  { return this.myRole() === 'admin'; }

  roleLabel(r: string): string {
    return ({ admin: 'Administrateur', manager: 'Manager', agent: 'Agent', viewer: 'Lecture seule' } as Record<string, string>)[r] ?? r;
  }

  invite(): void {
    this.error.set(''); this.inviteLink.set('');
    if (!this.inviteEmail.trim()) { this.error.set('Renseignez un email.'); return; }
    this.inviting.set(true);
    this.http.post<{ link: string }>(`${environment.apiUrl}/organizations/${this.orgId()}/invitations`, {
      email: this.inviteEmail.trim(), role: this.inviteRole,
    }).subscribe({
      next: (res) => { this.inviting.set(false); this.inviteLink.set(res.link); this.inviteEmail = ''; this.load(); },
      error: (e) => { this.inviting.set(false); this.error.set(e?.error?.error?.message || 'Invitation impossible.'); },
    });
  }

  changeRole(m: Member, role: string): void {
    this.http.patch(`${environment.apiUrl}/organizations/${this.orgId()}/members/${m.id}`, { role }).subscribe({
      next: () => this.load(),
      error: (e) => { this.error.set(e?.error?.error?.message || 'Modification impossible.'); this.load(); },
    });
  }

  remove(m: Member): void {
    if (!confirm(`Retirer ${m.name} de l'équipe ? Cette personne perdra l'accès aux campagnes de l'organisation.`)) return;
    this.http.delete(`${environment.apiUrl}/organizations/${this.orgId()}/members/${m.id}`).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(e?.error?.error?.message || 'Retrait impossible.'),
    });
  }
}
