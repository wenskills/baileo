import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CampaignService, Campaign } from '../../core/services/campaign.service';
import { PhotoGalleryComponent } from './photo-gallery.component';
import { PhotoService } from '../../core/services/photo.service';

@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PhotoGalleryComponent],
  styles: [`
    .edit-label { font-size: .75rem; font-weight: 600; color: #6B7280; font-family: Inter, sans-serif; display: block; margin-bottom: .25rem; }
    .edit-input { width: 100%; padding: .5625rem .75rem; border: 1.5px solid #E5E7EB; border-radius: .625rem; font-size: .875rem; font-family: Inter, sans-serif; color: #0A1F1A; outline: none; background: white; }
    .edit-input:focus { border-color: #2C7A5E; }
  `],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      @if (loading()) {
        <div class="card p-8 animate-pulse"><div class="h-6 bg-gray-100 rounded w-1/3 mb-4"></div><div class="h-4 bg-gray-100 rounded w-1/2"></div></div>
      } @else if (!campaign()) {
        <div class="card p-8 text-center">
          <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Campagne introuvable.</p>
          <a routerLink="/campagnes" class="text-sm text-green-700 mt-2 block">Retour aux campagnes</a>
        </div>
      } @else {
        <div class="flex items-center gap-2 mb-4" style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
          <a routerLink="/campagnes" class="hover:text-gray-700">Campagnes</a>
          <span>›</span>
          <span style="color:#374151">{{ campaign()!.title }}</span>
        </div>
        <div class="flex items-start justify-between mb-5">
          <div>
            <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.5rem;color:#0A1F1A">{{ campaign()!.title }}</h1>
            <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">{{ campaign()!.address }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                  [style.background]="statusColor(campaign()!.status) + '18'"
                  [style.color]="statusColor(campaign()!.status)">
              {{ statusLabel(campaign()!.status) }}
            </span>
            <button type="button" (click)="toggleEdit()"
                    class="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style="border:1.5px solid #E5E7EB;color:#374151;background:white;font-family:Inter,sans-serif;cursor:pointer">
              {{ editing() ? 'Fermer' : 'Modifier' }}
            </button>
            @if (campaign()!.status !== 'closed' && campaign()!.status !== 'draft') {
              <button type="button" (click)="closeCampaign()" [disabled]="acting()"
                      class="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                      style="border:1.5px solid #E5E7EB;color:#374151;background:white;font-family:Inter,sans-serif;cursor:pointer">
                Clôturer
              </button>
            }
            @if (isAgency()) {
              <button type="button" (click)="followPanel.set(!followPanel()); loadFollowLinks()"
                      class="px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;font-family:Inter,sans-serif;cursor:pointer">
                Suivi propriétaire
              </button>
            }
            @if (campaign()!.status !== 'active') {
              <button type="button" (click)="publish()" [disabled]="acting()"
                      class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style="background:#2C7A5E;font-family:Inter,sans-serif;border:none;cursor:pointer">
                Publier
              </button>
            } @else {
              <button type="button" (click)="pause()" [disabled]="acting()"
                      class="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                      style="border:1.5px solid #E5E7EB;color:#6B7280;background:white;font-family:Inter,sans-serif;cursor:pointer">
                Mettre en pause
              </button>
            }
            <a [routerLink]="['/candidatures']" [queryParams]="{campaign: campaign()!.id}"
               class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
               style="background:#1B4438;font-family:Inter,sans-serif">
              Voir les candidatures ({{ campaign()!.applicationCount ?? 0 }})
            </a>
          </div>
        </div>
        @if (actionError()) {
          <div class="p-3 rounded-xl mb-4" style="background:#FEF2F2;border:1px solid #FECACA">
            <p style="font-size:.8125rem;color:#DC2626;font-family:Inter,sans-serif">{{ actionError() }}</p>
          </div>
        }

        <!-- Édition — possible même publiée ; les candidats actifs sont notifiés -->
        @if (editing()) {
          <div class="card p-5 mb-5" style="border:1.5px solid #C8DDD7">
            <div class="flex items-center justify-between mb-4">
              <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Modifier l'annonce</h3>
              @if (campaign()!.status === 'active') {
                <span class="px-2.5 py-1 rounded-lg" style="font-size:.6875rem;font-weight:600;background:#FFF7ED;color:#F97316;font-family:Inter,sans-serif">
                  Les candidats en cours seront notifiés
                </span>
              }
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="col-span-2">
                <label class="edit-label">Titre</label>
                <input [(ngModel)]="editForm.title" maxlength="255" class="edit-input"/>
              </div>
              <div class="col-span-2">
                <label class="edit-label">Sous-titre</label>
                <input [(ngModel)]="editForm.subtitle" maxlength="255" class="edit-input"/>
              </div>
              <div>
                <label class="edit-label">Loyer (€/mois)</label>
                <input type="number" [(ngModel)]="editForm.rent" min="0" class="edit-input"/>
              </div>
              <div>
                <label class="edit-label">Charges (€/mois)</label>
                <input type="number" [(ngModel)]="editForm.charges" min="0" class="edit-input"/>
              </div>
              <div>
                <label class="edit-label">Dépôt de garantie (€)</label>
                <input type="number" [(ngModel)]="editForm.deposit" min="0" class="edit-input"/>
              </div>
              <div>
                <label class="edit-label">Disponible à partir du</label>
                <input type="date" [(ngModel)]="editForm.availableAt" class="edit-input"/>
              </div>
              <div class="col-span-2">
                <label class="edit-label">Description</label>
                <textarea [(ngModel)]="editForm.description" rows="4" maxlength="10000" class="edit-input" style="resize:vertical"></textarea>
              </div>
              <div>
                <label class="edit-label">DPE</label>
                <select [(ngModel)]="editForm.dpe" class="edit-input">
                  <option value="">Non renseigné</option>
                  @for (l of ['A','B','C','D','E','F','G']; track l) { <option [value]="l">{{ l }}</option> }
                </select>
              </div>
              <div>
                <label class="edit-label">GES</label>
                <select [(ngModel)]="editForm.ges" class="edit-input">
                  <option value="">Non renseigné</option>
                  @for (l of ['A','B','C','D','E','F','G']; track l) { <option [value]="l">{{ l }}</option> }
                </select>
              </div>
              <div>
                <label class="edit-label">Étage</label>
                <input type="number" [(ngModel)]="editForm.floor" min="-3" max="60" class="edit-input"/>
              </div>
              <div>
                <label class="edit-label">Chauffage</label>
                <select [(ngModel)]="editForm.heatingType" class="edit-input">
                  <option value="">Non renseigné</option>
                  <option value="individuel_gaz">Individuel gaz</option>
                  <option value="individuel_electrique">Individuel électrique</option>
                  <option value="collectif">Collectif</option>
                  <option value="pompe_chaleur">Pompe à chaleur</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <label class="flex items-center gap-2" style="cursor:pointer">
                <input type="checkbox" [(ngModel)]="editForm.hasElevator" style="accent-color:#2C7A5E;width:1rem;height:1rem"/>
                <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">Ascenseur</span>
              </label>
              <label class="col-span-2 flex items-center gap-2" style="cursor:pointer">
                <input type="checkbox" [(ngModel)]="editForm.preciseAddressVisible" style="accent-color:#2C7A5E;width:1rem;height:1rem"/>
                <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">
                  Afficher l'adresse exacte sur la page publique <span style="color:#9CA3AF">(sinon : ville seule — RGPD)</span>
                </span>
              </label>
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="editing.set(false)"
                      class="px-4 py-2 rounded-xl text-sm font-semibold"
                      style="border:1.5px solid #E5E7EB;color:#6B7280;background:white;font-family:Inter,sans-serif;cursor:pointer">Annuler</button>
              <button type="button" (click)="saveEdit()" [disabled]="acting()"
                      class="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style="background:#1B4438;font-family:Inter,sans-serif;border:none;cursor:pointer">
                {{ acting() ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        }

        <!-- Transparence agence → propriétaire du bien (spec Wendy) -->
        @if (followPanel()) {
          <div class="card p-5 mb-4" style="border:1.5px solid #C8DDD7">
            <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.25rem">
              Suivi propriétaire
            </h3>
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.75rem">
              Donnez au propriétaire du bien un accès de suivi en lecture seule : jalons et compteurs
              uniquement, jamais l'identité des candidats (RGPD).
            </p>
            <div class="flex gap-2 mb-3">
              <input [(ngModel)]="followName" placeholder="Nom du propriétaire (ex : M. Bernard)" maxlength="120"
                     class="flex-1 px-3 py-2 rounded-xl text-sm" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"/>
              <button type="button" (click)="createFollowLink()" [disabled]="!followName.trim() || followCreating()"
                      class="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
                {{ followCreating() ? 'Création...' : 'Générer le lien' }}
              </button>
            </div>
            @for (l of followLinks(); track l.id) {
              <div class="flex items-center justify-between py-2" style="border-bottom:1px solid #F5F7F6">
                <div class="min-w-0">
                  <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ l.ownerName }}</p>
                  <p class="select-all" style="font-size:.625rem;color:#9CA3AF;font-family:monospace;word-break:break-all">{{ origin }}{{ l.link }}</p>
                </div>
                @if (l.status === 'active') {
                  <button type="button" (click)="revokeFollowLink(l.id)"
                          class="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
                          style="border:1.5px solid #FECACA;color:#DC2626;background:white;cursor:pointer;font-family:Inter,sans-serif">Révoquer</button>
                } @else {
                  <span class="px-2 py-0.5 rounded-lg shrink-0" style="font-size:.625rem;font-weight:700;background:#F3F4F6;color:#9CA3AF;font-family:Inter,sans-serif">Révoqué</span>
                }
              </div>
            } @empty {
              <p style="font-size:.75rem;color:#D1D5DB;font-family:Inter,sans-serif">Aucun lien de suivi.</p>
            }
          </div>
        }

        <!-- Lien public — parcours : publier → copier lien -->
        @if (campaign()!.status === 'active') {
          <div class="card p-4 mb-5 flex items-center justify-between gap-4"
               style="border:1.5px solid #C8DDD7;background:#F8FBF9">
            <div class="min-w-0">
              <p class="flex items-center gap-1.5" style="font-size:.8125rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/>
                </svg>
                Page publique de l'annonce
              </p>
              <p style="font-size:.8125rem;color:#2C7A5E;font-family:Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                {{ publicUrl() }}
              </p>
            </div>
            <div class="flex gap-2 shrink-0">
              <a [routerLink]="['/annonces', campaign()!.slug || campaign()!.id]" target="_blank"
                 class="px-3 py-2 rounded-lg text-xs font-semibold"
                 style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;font-family:Inter,sans-serif">
                Voir
              </a>
              <button type="button" (click)="copyLink()"
                      class="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                      style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
                {{ copied() ? 'Copié !' : 'Copier le lien' }}
              </button>
            </div>
          </div>
        }

        <div class="grid grid-cols-3 gap-4 mb-5">
          <div class="card p-4">
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.25rem">Loyer</p>
            <p style="font-size:1.5rem;font-weight:800;color:#0A1F1A;font-family:'Playfair Display',Georgia,serif">{{ campaign()!.rent }}€</p>
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">+ {{ campaign()!.charges }}€ charges</p>
          </div>
          <div class="card p-4">
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.25rem">Surface</p>
            <p style="font-size:1.5rem;font-weight:800;color:#0A1F1A;font-family:'Playfair Display',Georgia,serif">{{ campaign()!.surface ?? '—' }}m²</p>
          </div>
          <div class="card p-4">
            <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.25rem">Candidatures</p>
            <p style="font-size:1.5rem;font-weight:800;color:#2C7A5E;font-family:'Playfair Display',Georgia,serif">{{ campaign()!.applicationCount ?? 0 }}</p>
          </div>
        </div>
        <!-- Galerie photos (éditable par le propriétaire) -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
              Photos
            </h3>
            <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
              {{ campaign()!.photos?.length ?? 0 }}/10
            </span>
          </div>
          <app-photo-gallery
            [campaignId]="campaign()!.id"
            [initialPhotos]="campaign()!.photos ?? []"
            [maxPhotos]="10"
            (photosChange)="onPhotosChange($event)">
          </app-photo-gallery>
        </div>

        @if (campaign()!.description) {
          <div class="card p-5">
            <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Description</h3>
            <p style="font-size:.875rem;color:#374151;line-height:1.7;font-family:Inter,sans-serif;white-space:pre-wrap">{{ campaign()!.description }}</p>
          </div>
        }
      }
    </div>
  `,
})
export class CampaignDetailComponent implements OnInit {
  campaign = signal<Campaign | null>(null);
  loading  = signal(true);
  constructor(private svc: CampaignService, private route: ActivatedRoute, private http: HttpClient, private auth: AuthService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(id).subscribe({ next: (c) => { this.campaign.set(c); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  onPhotosChange(urls: string[]): void {
    const c = this.campaign();
    if (c) this.campaign.set({ ...c, photos: urls });
  }

  acting      = signal(false);
  copied      = signal(false);
  actionError = signal('');

  publicUrl(): string {
    const c = this.campaign();
    if (!c) return '';
    return `${window.location.origin}/annonces/${c.slug || c.id}`;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.publicUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }).catch(() => this.actionError.set('Impossible de copier — sélectionnez le lien manuellement.'));
  }

  // ── Suivi propriétaire (agence → propriétaire réel du bien) ──
  followLinks   = signal<{ id: string; ownerName: string; status: string; link: string }[]>([]);
  followName    = '';
  origin = typeof window !== 'undefined' ? window.location.origin : '';
  followCreating = signal(false);
  followPanel   = signal(false);

  isAgency(): boolean { return (this.auth.currentUser()?.roles ?? []).includes('ROLE_AGENCY'); }

  loadFollowLinks(): void {
    const camp = this.campaign(); if (!camp || !this.isAgency()) return;
    this.http.get<{ data: { id: string; ownerName: string; status: string; link: string }[] }>(
      `${environment.apiUrl}/campaigns/${camp.id}/follow-links`
    ).subscribe({ next: (res) => this.followLinks.set(res.data ?? []), error: () => {} });
  }

  createFollowLink(): void {
    const camp = this.campaign(); const name = this.followName.trim();
    if (!camp || !name) return;
    this.followCreating.set(true);
    this.http.post<{ link: string }>(`${environment.apiUrl}/campaigns/${camp.id}/follow-link`, { ownerName: name }).subscribe({
      next: () => { this.followCreating.set(false); this.followName = ''; this.loadFollowLinks(); },
      error: (e) => { this.followCreating.set(false); this.actionError.set(e?.error?.error?.message || 'Création impossible.'); },
    });
  }

  revokeFollowLink(id: string): void {
    if (!confirm('Révoquer ce lien de suivi ? Le propriétaire ne pourra plus consulter l\'avancement.')) return;
    this.http.post(`${environment.apiUrl}/follow-links/${id}/revoke`, {}).subscribe({
      next: () => this.loadFollowLinks(), error: () => {},
    });
  }

  /** Clôture (spec Campaign Closing) : candidatures restantes annulées avec message neutre. */
  closeCampaign(): void {
    const camp = this.campaign(); if (!camp) return;
    if (!confirm('Clôturer cette campagne ?\n\nToutes les candidatures encore ouvertes seront annulées et chaque candidat recevra un message neutre. L\'historique est conservé. Cette action est définitive.')) return;
    this.acting.set(true);
    this.http.post<{ cancelledApplications: number }>(`${environment.apiUrl}/campaigns/${camp.id}/close`, {}).subscribe({
      next: (res) => {
        this.acting.set(false);
        camp.status = 'closed';
        this.campaign.set({ ...camp });
        this.actionError.set('');
        alert(`Campagne clôturée. ${res.cancelledApplications} candidature(s) informée(s) avec un message neutre.`);
      },
      error: (e) => {
        this.acting.set(false);
        this.actionError.set(e?.error?.error || `Clôture impossible (HTTP ${e?.status ?? '?'}).`);
      },
    });
  }

  publish(): void {
    const c = this.campaign(); if (!c) return;
    this.acting.set(true); this.actionError.set('');
    this.svc.publish(c.id).subscribe({
      next: (updated) => { this.campaign.set(updated); this.acting.set(false); },
      error: (e) => { this.acting.set(false); this.actionError.set(e?.error?.error || 'Publication impossible.'); },
    });
  }

  pause(): void {
    const c = this.campaign(); if (!c) return;
    this.acting.set(true); this.actionError.set('');
    this.svc.pause(c.id).subscribe({
      next: () => { this.campaign.set({ ...c, status: 'paused' }); this.acting.set(false); },
      error: (e) => { this.acting.set(false); this.actionError.set(e?.error?.error || 'Action impossible.'); },
    });
  }

  statusLabel(s: string): string { return CampaignService.statusLabel(s); }
  statusColor(s: string): string { return CampaignService.statusColor(s); }

  // ── Édition (autorisée même publiée — le backend notifie les candidats) ──
  editing = signal(false);
  editForm: { title: string; subtitle: string; rent: number; charges: number;
              deposit: number; availableAt: string; description: string;
              preciseAddressVisible: boolean; dpe: string; ges: string;
              floor: number | null; hasElevator: boolean; heatingType: string } =
    { title: '', subtitle: '', rent: 0, charges: 0, deposit: 0, availableAt: '', description: '',
      preciseAddressVisible: true, dpe: '', ges: '', floor: null, hasElevator: false, heatingType: '' };

  toggleEdit(): void {
    const c = this.campaign(); if (!c) return;
    if (!this.editing()) {
      this.editForm = {
        title: c.title ?? '', subtitle: c.subtitle ?? '',
        rent: c.rent ?? 0, charges: c.charges ?? 0, deposit: c.deposit ?? 0,
        availableAt: c.availableAt ? c.availableAt.substring(0, 10) : '',
        description: c.description ?? '',
        preciseAddressVisible: c.preciseAddressVisible !== false,
        dpe: c.dpe ?? '', ges: c.ges ?? '',
        floor: c.floor ?? null,
        hasElevator: c.hasElevator ?? false,
        heatingType: c.heatingType ?? '',
      };
    }
    this.editing.update(v => !v);
  }

  saveEdit(): void {
    const c = this.campaign(); if (!c) return;
    this.actionError.set('');
    if (!this.editForm.title.trim()) { this.actionError.set('Le titre est requis.'); return; }
    if (this.editForm.rent < 0)      { this.actionError.set('Loyer invalide.'); return; }
    this.acting.set(true);
    this.svc.update(c.id, {
      title: this.editForm.title.trim(),
      subtitle: this.editForm.subtitle.trim() || undefined,
      rent: this.editForm.rent,
      charges: this.editForm.charges,
      deposit: this.editForm.deposit,
      availableAt: this.editForm.availableAt || undefined,
      description: this.editForm.description.trim() || undefined,
      preciseAddressVisible: this.editForm.preciseAddressVisible,
      dpe: this.editForm.dpe || null,
      ges: this.editForm.ges || null,
      floor: this.editForm.floor,
      hasElevator: this.editForm.hasElevator,
      heatingType: this.editForm.heatingType || null,
    }).subscribe({
      next: (updated) => { this.campaign.set(updated); this.acting.set(false); this.editing.set(false); },
      error: (e) => {
        this.acting.set(false);
        const msg = e?.error?.error || (typeof e?.error === 'string' ? '' : '') || '';
        this.actionError.set(msg || `Enregistrement impossible (HTTP ${e?.status ?? '?'}). Réessayez ou vérifiez le backend.`);
      },
    });
  }
}
