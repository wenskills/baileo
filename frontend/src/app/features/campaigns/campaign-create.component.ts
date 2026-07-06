import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CampaignService } from '../../core/services/campaign.service';
import { PhotoGalleryComponent } from './photo-gallery.component';

interface WizardData {
  photos: string[];
  // Étape 1
  propertyType: string; title: string; subtitle: string;
  address: string; surface: number | null; rooms: number | null;
  availableAt: string; rentalType: string;
  // Étape 2
  description: string; amenities: string[];
  // Étape 3
  rent: number | null; charges: number; deposit: number; minDuration: number;
  dpe: string; ges: string; floor: number | null; hasElevator: boolean; heatingType: string;
  extras: { label: string; value: string }[];
  // Étape 4
  documentsRequired: string[];
  // Étape 5
  publishNow: boolean;
}

@Component({
  selector: 'app-campaign-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PhotoGalleryComponent],
  styles: [`
    .step-btn { background: white; border: 2px solid #E5E7EB; padding: .5rem .875rem; border-radius: .625rem; font-size: .8125rem; font-weight: 600; font-family: Inter, sans-serif; cursor: pointer; transition: all .15s; }
    .step-btn.active { border-color: #1B4438; color: #1B4438; background: #F0F9F5; }
    .step-btn.done { border-color: #2C7A5E; color: #2C7A5E; background: #E0EDE8; }
    .type-btn { display: flex; flex-direction: column; align-items: center; gap: .375rem; padding: .75rem .875rem; border-radius: .75rem; border: 2px solid #E5E7EB; cursor: pointer; transition: all .15s; background: white; font-family: Inter, sans-serif; font-size: .8125rem; color: #6B7280; }
    .type-btn.active { border-color: #1B4438; background: #F0F9F5; color: #1B4438; }
    .field-label { font-size: .8125rem; font-weight: 600; color: #374151; font-family: Inter, sans-serif; display: block; margin-bottom: .375rem; }
    .field-input { width: 100%; padding: .625rem .875rem; border: 1.5px solid #E5E7EB; border-radius: .625rem; font-size: .875rem; font-family: Inter, sans-serif; color: #0A1F1A; outline: none; transition: border-color .15s; background: white; }
    .field-input:focus { border-color: #2C7A5E; box-shadow: 0 0 0 3px rgba(44,122,94,.08); }
    .doc-checkbox { display: flex; align-items: center; gap: .625rem; padding: .625rem .75rem; border-radius: .625rem; border: 1.5px solid #E5E7EB; cursor: pointer; transition: all .15s; background: white; }
    .doc-checkbox.checked { border-color: #2C7A5E; background: #F0F9F5; }
  `],
  template: `
    <div class="min-h-screen" style="background:#F5F7F6">

      <!-- Header wizard -->
      <div class="px-6 py-4 flex items-center gap-4 bg-white" style="border-bottom:1px solid #F0F0F0">
        <a routerLink="/campagnes"
           class="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-50"
           style="border:1.5px solid #E5E7EB">
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </a>
        <h1 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">
          Créer une campagne
        </h1>

        <!-- Stepper -->
        <div class="flex items-center gap-2 mx-auto">
          @for (s of steps; track s.num) {
            <div class="flex items-center gap-2">
              <button type="button"
                      class="step-btn"
                      [class.active]="currentStep() === s.num"
                      [class.done]="currentStep() > s.num"
                      (click)="currentStep() > s.num && goTo(s.num)">
                <span class="flex items-center gap-1.5">
                  @if (currentStep() > s.num) {
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  } @else {
                    <span style="font-size:.6875rem;background:#E5E7EB;border-radius:50%;width:1.125rem;height:1.125rem;display:flex;align-items:center;justify-content:center;font-weight:700"
                          [style.background]="currentStep() === s.num ? '#1B4438' : ''"
                          [style.color]="currentStep() === s.num ? 'white' : ''">
                      {{ s.num }}
                    </span>
                  }
                  {{ s.label }}
                </span>
              </button>
              @if (!$last) {
                <div style="width:2rem;height:1px;background:#E5E7EB"></div>
              }
            </div>
          }
        </div>

        <div class="flex gap-2">
          <button type="button" (click)="saveDraft()"
                  class="px-3 py-2 rounded-xl text-sm font-semibold border"
                  style="border-color:#E5E7EB;color:#6B7280;font-family:Inter,sans-serif;background:white">
            Enregistrer le brouillon
          </button>
          <button type="button" (click)="next()"
                  class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
            {{ currentStep() < 5 ? 'Suivant' : 'Publier' }}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body: form + preview -->
      <div class="grid grid-cols-2 gap-0 h-[calc(100vh-64px)]">

        <!-- LEFT: Form -->
        <div class="overflow-y-auto p-6 space-y-6" style="border-right:1px solid #F0F0F0">

          @if (currentStep() === 1) {
            <div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-bottom:.25rem">
                Informations générales
              </h2>
              <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
                Commençons par les informations principales de votre campagne.
              </p>
            </div>

            <!-- Type de bien -->
            <div>
              <label class="field-label">Type de bien</label>
              <div class="flex gap-2 flex-wrap">
                @for (t of propertyTypes; track t.value) {
                  <button type="button" class="type-btn"
                          [class.active]="form.propertyType === t.value"
                          (click)="form.propertyType = t.value">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="t.icon"/>
                    </svg>
                    {{ t.label }}
                  </button>
                }
              </div>
            </div>

            <!-- Titre -->
            <div>
              <label class="field-label">Titre de l'annonce <span style="color:#EF4444">*</span></label>
              <div class="relative">
                <input [(ngModel)]="form.title" placeholder="T3 lumineux avec balcon – Prado"
                       class="field-input" maxlength="80"/>
                <span class="absolute right-3 top-1/2 -translate-y-1/2"
                      style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                  {{ form.title.length }}/80
                </span>
              </div>
            </div>

            <!-- Sous-titre -->
            <div>
              <label class="field-label">Sous-titre <span style="color:#9CA3AF;font-weight:400">(optionnel)</span></label>
              <input [(ngModel)]="form.subtitle" placeholder="Proche mer, calme et traversant"
                     class="field-input" maxlength="80"/>
            </div>

            <!-- Adresse / Surface / Pièces -->
            <div>
              <label class="field-label">Adresse du logement <span style="color:#EF4444">*</span></label>
              <input [(ngModel)]="form.address" placeholder="123 Avenue du Prado, 13008 Marseille"
                     class="field-input"/>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">Surface</label>
                <div class="relative">
                  <input type="number" [(ngModel)]="form.surface" placeholder="72" min="1" class="field-input" style="padding-right:2.5rem"/>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2"
                        style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">m²</span>
                </div>
              </div>
              <div>
                <label class="field-label">Nombre de pièces</label>
                <select [(ngModel)]="form.rooms" class="field-input">
                  <option [value]="null">Sélectionner</option>
                  @for (n of [1,2,3,4,5,6,7]; track n) {
                    <option [value]="n">{{ n }} pièce{{ n > 1 ? 's' : '' }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">Disponibilité</label>
                <input type="date" [(ngModel)]="form.availableAt" class="field-input"/>
              </div>
              <div>
                <label class="field-label">Type de location</label>
                <div class="flex gap-2">
                  @for (t of rentalTypeOptions; track t.value) {
                    <button type="button"
                            class="flex-1 py-2 rounded-xl text-sm font-medium border transition-all"
                            [style.borderColor]="form.rentalType === t.value ? '#1B4438' : '#E5E7EB'"
                            [style.background]="form.rentalType === t.value ? '#F0F9F5' : 'white'"
                            [style.color]="form.rentalType === t.value ? '#1B4438' : '#6B7280'"
                            style="font-family:Inter,sans-serif"
                            (click)="form.rentalType = t.value">
                      {{ t.label }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Conseil -->
            <div class="p-4 rounded-xl" style="background:linear-gradient(135deg,#F0F9F5,#E0EDE8);border:1px solid #C8DDD7">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
                </svg>
                <span style="font-size:.8125rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif">Conseil</span>
              </div>
              <p style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">
                Un titre clair et des photos de qualité augmentent significativement vos chances de trouver le bon locataire.
              </p>
            </div>
          }

          @if (currentStep() === 2) {
            <div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-bottom:.25rem">
                Logement
              </h2>
              <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">Photos et description</p>
            </div>

            <!-- Upload photos -->
            <div>
              <label class="field-label">Photos du logement</label>
              <app-photo-gallery
                [campaignId]="createdCampaignId()"
                [initialPhotos]="form.photos"
                [maxPhotos]="10"
                (photosChange)="onPhotosChange($event)">
              </app-photo-gallery>
              @if (!createdCampaignId()) {
                <p class="mt-1" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                  Les photos seront uploadées une fois les informations de base enregistrées.
                </p>
              }
            </div>

            <div>
              <label class="field-label">Description du bien</label>
              <textarea [(ngModel)]="form.description" rows="4" placeholder="Décrivez votre logement..."
                        class="field-input" style="resize:vertical;min-height:6rem"></textarea>
            </div>

            <div>
              <label class="field-label">Équipements</label>
              <div class="grid grid-cols-2 gap-2">
                @for (a of amenityOptions; track a.value) {
                  <button type="button" class="doc-checkbox text-left"
                          [class.checked]="form.amenities.includes(a.value)"
                          (click)="toggleAmenity(a.value)">
                    <div class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                         [style.borderColor]="form.amenities.includes(a.value) ? '#2C7A5E' : '#E5E7EB'"
                         [style.background]="form.amenities.includes(a.value) ? '#2C7A5E' : 'white'">
                      @if (form.amenities.includes(a.value)) {
                        <svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      }
                    </div>
                    <span style="font-size:.8125rem;font-family:Inter,sans-serif;color:#374151">{{ a.label }}</span>
                  </button>
                }
              </div>
            </div>
          }

          @if (currentStep() === 3) {
            <div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-bottom:.25rem">
                Conditions
              </h2>
              <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">Loyer et conditions</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Loyer mensuel (HC) <span style="color:#EF4444">*</span></label>
                <div class="relative">
                  <input type="number" [(ngModel)]="form.rent" placeholder="1150" min="0" class="field-input" style="padding-right:2rem"/>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF;font-family:Inter,sans-serif">€</span>
                </div>
              </div>
              <div>
                <label class="field-label">Charges mensuelles</label>
                <div class="relative">
                  <input type="number" [(ngModel)]="form.charges" placeholder="100" min="0" class="field-input" style="padding-right:2rem"/>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF;font-family:Inter,sans-serif">€</span>
                </div>
              </div>
              <div>
                <label class="field-label">Dépôt de garantie</label>
                <div class="relative">
                  <input type="number" [(ngModel)]="form.deposit" placeholder="2300" min="0" class="field-input" style="padding-right:2rem"/>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF;font-family:Inter,sans-serif">€</span>
                </div>
              </div>
              <div>
                <label class="field-label">Durée minimale (mois)</label>
                <input type="number" [(ngModel)]="form.minDuration" min="1" max="36" class="field-input"/>
              </div>
            </div>

            <!-- Caractéristiques du logement (annonce complète : DPE, GES, chauffage...) -->
            <div>
              <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
                Caractéristiques du logement
              </p>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="field-label">DPE (énergie)</label>
                  <select [(ngModel)]="form.dpe" class="field-input">
                    <option value="">Non renseigné</option>
                    @for (l of ['A','B','C','D','E','F','G']; track l) { <option [value]="l">{{ l }}</option> }
                  </select>
                </div>
                <div>
                  <label class="field-label">GES (émissions)</label>
                  <select [(ngModel)]="form.ges" class="field-input">
                    <option value="">Non renseigné</option>
                    @for (l of ['A','B','C','D','E','F','G']; track l) { <option [value]="l">{{ l }}</option> }
                  </select>
                </div>
                <div>
                  <label class="field-label">Chauffage</label>
                  <select [(ngModel)]="form.heatingType" class="field-input">
                    <option value="">Non renseigné</option>
                    <option value="individuel_gaz">Individuel gaz</option>
                    <option value="individuel_electrique">Individuel électrique</option>
                    <option value="collectif">Collectif</option>
                    <option value="pompe_chaleur">Pompe à chaleur</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label class="field-label">Étage</label>
                  <input type="number" [(ngModel)]="form.floor" min="-3" max="60" placeholder="4" class="field-input"/>
                </div>
                <label class="flex items-center gap-2 mt-6" style="cursor:pointer">
                  <input type="checkbox" [(ngModel)]="form.hasElevator" style="accent-color:#2C7A5E;width:1rem;height:1rem"/>
                  <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">Ascenseur</span>
                </label>
              </div>
            </div>

            <!-- Indications libres du propriétaire (spec : « d'autres indications qu'il peut rajouter comme il veut ») -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                  Informations complémentaires <span style="font-weight:400;color:#9CA3AF;font-size:.75rem">(optionnel)</span>
                </p>
                <button type="button" (click)="addExtra()" [disabled]="form.extras.length >= 20"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                        style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;cursor:pointer;font-family:Inter,sans-serif">
                  + Ajouter
                </button>
              </div>
              @for (ex of form.extras; track $index) {
                <div class="flex gap-2 mb-2">
                  <input [(ngModel)]="ex.label" placeholder="Ex : Eau chaude" maxlength="60" class="field-input" style="width:35%"/>
                  <input [(ngModel)]="ex.value" placeholder="Ex : Collective, incluse dans les charges" maxlength="200" class="field-input flex-1"/>
                  <button type="button" (click)="removeExtra($index)"
                          class="px-2.5 rounded-lg" style="border:1.5px solid #FECACA;color:#DC2626;background:white;cursor:pointer">✕</button>
                </div>
              } @empty {
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                  Ex : « Taxe ordures : 15 €/mois », « Fibre : installée », « Cave : 6 m² »...
                </p>
              }
            </div>

            @if (form.rent) {
              <div class="p-4 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                <p style="font-size:.8125rem;font-weight:700;color:#1B4438;font-family:Inter,sans-serif;margin-bottom:.5rem">
                  Récapitulatif financier
                </p>
                <div class="flex justify-between">
                  <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">Loyer charges comprises</span>
                  <span style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ (form.rent || 0) + form.charges }} €/mois
                  </span>
                </div>
                <div class="flex justify-between mt-1">
                  <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">Revenus candidat recommandés (x3)</span>
                  <span style="font-size:.875rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif">
                    ≥ {{ (((form.rent || 0) + form.charges) * 3) | number:'1.0-0' }} €/mois
                  </span>
                </div>
              </div>
            }
          }

          @if (currentStep() === 4) {
            <div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-bottom:.25rem">
                Documents requis
              </h2>
              <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">Pièces demandées aux candidats</p>
            </div>

            <div class="space-y-2">
              @for (doc of docOptions; track doc.value) {
                <button type="button" class="doc-checkbox w-full"
                        [class.checked]="form.documentsRequired.includes(doc.value)"
                        (click)="toggleDoc(doc.value)">
                  <div class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                       [style.borderColor]="form.documentsRequired.includes(doc.value) ? '#2C7A5E' : '#E5E7EB'"
                       [style.background]="form.documentsRequired.includes(doc.value) ? '#2C7A5E' : 'white'">
                    @if (form.documentsRequired.includes(doc.value)) {
                      <svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                      </svg>
                    }
                  </div>
                  <div class="flex-1 text-left">
                    <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ doc.label }}</p>
                    @if (doc.required) {
                      <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Recommandé</p>
                    }
                  </div>
                </button>
              }
            </div>
          }

          @if (currentStep() === 5) {
            <div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-bottom:.25rem">
                Publication
              </h2>
              <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">Diffusion et visibilité</p>
            </div>

            <!-- Récapitulatif -->
            <div class="space-y-3">
              <div class="card p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:#E0EDE8">
                    <svg class="w-5 h-5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                    </svg>
                  </div>
                  <div>
                    <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.title || 'Sans titre' }}</p>
                    <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ form.address }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-3 mt-3 pt-3" style="border-top:1px solid #F5F7F6">
                  <div class="text-center">
                    <p style="font-size:1rem;font-weight:800;color:#0A1F1A;font-family:'Playfair Display',Georgia,serif">{{ form.rent }}€</p>
                    <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Loyer</p>
                  </div>
                  <div class="text-center">
                    <p style="font-size:1rem;font-weight:800;color:#0A1F1A;font-family:'Playfair Display',Georgia,serif">{{ form.surface }}m²</p>
                    <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Surface</p>
                  </div>
                  <div class="text-center">
                    <p style="font-size:1rem;font-weight:800;color:#0A1F1A;font-family:'Playfair Display',Georgia,serif">{{ form.rooms }}P</p>
                    <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Pièces</p>
                  </div>
                </div>
              </div>

              <div class="card p-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <div class="relative">
                    <input type="checkbox" [(ngModel)]="form.publishNow" class="sr-only"/>
                    <div class="w-10 h-6 rounded-full transition-colors"
                         [style.background]="form.publishNow ? '#2C7A5E' : '#E5E7EB'">
                      <div class="w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform"
                           [style.transform]="form.publishNow ? 'translateX(1.25rem)' : 'translateX(.25rem)'"></div>
                    </div>
                  </div>
                  <div>
                    <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                      Publier immédiatement
                    </p>
                    <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                      Votre annonce sera visible par les candidats.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            @if (error()) {
              <div class="p-3 rounded-xl" style="background:#FEE2E2;border:1px solid #FECACA">
                <p style="font-size:.8125rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p>
              </div>
            }
          }
        </div>

        <!-- RIGHT: Preview fidèle à la maquette -->
        <div class="overflow-y-auto p-6" style="background:#FAFBFA">
          <p style="font-size:.8125rem;font-weight:600;color:#9CA3AF;margin-bottom:.75rem;font-family:Inter,sans-serif">
            Aperçu de votre campagne
          </p>
          <p style="font-size:.75rem;color:#9CA3AF;margin-bottom:1rem;font-family:Inter,sans-serif">
            Ceci est un aperçu de votre future page publique.
          </p>

          <div class="rounded-2xl overflow-hidden bg-white shadow-sm" style="border:1px solid #E5E7EB">
            <!-- Photo placeholder -->
            <div class="h-48 flex items-center justify-center"
                 style="background:linear-gradient(135deg,#E0EDE8,#C8DDD7)">
              <div class="text-center">
                <svg class="w-10 h-10 mx-auto mb-2" style="color:#8BC5B5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                </svg>
                <p style="font-size:.75rem;color:#8BC5B5;font-family:Inter,sans-serif">Ajoutez des photos</p>
              </div>
            </div>

            <div class="p-4 space-y-3">
              <!-- Type badge -->
              @if (form.propertyType) {
                <span class="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                      style="background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                  {{ form.propertyType }}
                </span>
              }

              <h3 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.125rem;color:#0A1F1A">
                {{ form.title || 'Titre de votre annonce' }}
              </h3>
              @if (form.subtitle) {
                <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">{{ form.subtitle }}</p>
              }

              <!-- Specs grid -->
              <div class="flex flex-wrap gap-3 py-2" style="border-top:1px solid #F5F7F6;border-bottom:1px solid #F5F7F6">
                @if (form.surface) {
                  <span style="font-size:.75rem;color:#374151;font-family:Inter,sans-serif">
                    <b>{{ form.surface }}</b>m²
                  </span>
                }
                @if (form.rooms) {
                  <span style="font-size:.75rem;color:#374151;font-family:Inter,sans-serif">
                    <b>{{ form.rooms }}</b> pièces
                  </span>
                }
              </div>

              <!-- Infos pratiques -->
              <div class="space-y-1.5">
                <div class="flex justify-between">
                  <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Loyer</span>
                  <span style="font-size:.75rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.rent || '—' }} €/mois</span>
                </div>
                <div class="flex justify-between">
                  <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Charges</span>
                  <span style="font-size:.75rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.charges }} €/mois</span>
                </div>
                <div class="flex justify-between">
                  <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Dépôt de garantie</span>
                  <span style="font-size:.75rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.deposit }} €</span>
                </div>
                @if (form.availableAt) {
                  <div class="flex justify-between">
                    <span style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Disponible le</span>
                    <span style="font-size:.75rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.availableAt | date:'dd/MM/yyyy' }}</span>
                  </div>
                }
              </div>

              <!-- CTA -->
              <button class="w-full py-3 rounded-xl font-bold text-white text-sm"
                      style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
                Déposer mon dossier
              </button>
              <p style="text-align:center;font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                Candidature sécurisée et 100% gratuite
              </p>
            </div>
          </div>

          <!-- Étapes de création -->
          <div class="mt-4 space-y-1">
            <p style="font-size:.75rem;font-weight:700;color:#374151;margin-bottom:.5rem;font-family:Inter,sans-serif">Étapes de création</p>
            @for (s of steps; track s.num) {
              <div class="flex items-center gap-3 py-1.5">
                <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                     [style.background]="currentStep() > s.num ? '#2C7A5E' : currentStep() === s.num ? '#1B4438' : '#E5E7EB'">
                  @if (currentStep() > s.num) {
                    <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  } @else {
                    <span style="font-size:.5rem;color:white;font-weight:700">{{ s.num }}</span>
                  }
                </div>
                <div>
                  <p style="font-size:.8125rem;font-weight:600;font-family:Inter,sans-serif"
                     [style.color]="currentStep() === s.num ? '#1B4438' : '#374151'">
                    {{ s.label }}
                  </p>
                  <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ s.sub }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CampaignCreateComponent implements OnInit {
  currentStep = signal(1);

  ngOnInit(): void {
    // Reprise d'un brouillon : /campagnes/creer?draft=ID → pré-remplir et
    // reprendre à la première étape incomplète (exigence : « revenir à l'étape exacte »)
    const draftId = this.route.snapshot.queryParamMap.get('draft');
    if (!draftId) return;
    this.svc.get(draftId).subscribe({
      next: (camp) => {
        if (camp.status !== 'draft') return; // publiée → passer par la fiche
        this.createdCampaignId.set(camp.id);
        this.form.title        = camp.title ?? '';
        this.form.subtitle     = camp.subtitle ?? '';
        this.form.address      = camp.address ?? '';
        this.form.propertyType = camp.propertyType ?? this.form.propertyType;
        this.form.rentalType   = camp.rentalType ?? this.form.rentalType;
        this.form.surface      = camp.surface ?? null;
        this.form.rooms        = camp.rooms ?? null;
        this.form.rent         = camp.rent && camp.rent > 0 ? camp.rent : null;
        this.form.charges      = camp.charges ?? 0;
        this.form.deposit      = camp.deposit ?? 0;
        this.form.description  = camp.description ?? '';
        this.form.amenities    = camp.amenities ?? [];
        this.form.documentsRequired = camp.documentsRequired?.length ? camp.documentsRequired : this.form.documentsRequired;
        this.form.availableAt  = camp.availableAt ? camp.availableAt.substring(0, 10) : '';
        this.form.photos       = camp.photos ?? [];
        this.form.dpe          = (camp as { dpe?: string | null }).dpe ?? '';
        this.form.ges          = (camp as { ges?: string | null }).ges ?? '';
        this.form.floor        = (camp as { floor?: number | null }).floor ?? null;
        this.form.hasElevator  = (camp as { hasElevator?: boolean }).hasElevator ?? false;
        this.form.heatingType  = (camp as { heatingType?: string | null }).heatingType ?? '';
        this.form.extras       = (camp as { extras?: { label: string; value: string }[] }).extras ?? [];
        // Étape exacte = première étape dont les champs requis manquent
        if (!this.form.title || !this.form.address)      this.currentStep.set(1);
        else if (!this.form.photos.length && !this.form.description) this.currentStep.set(2);
        else if (!this.form.rent)                        this.currentStep.set(3);
        else                                             this.currentStep.set(4);
      },
      error: () => {},
    });
  }
  saving      = signal(false);
  error       = signal('');

  form: WizardData = {
    propertyType: 'apartment', title: '', subtitle: '', address: '', photos: [] as string[],
    surface: null, rooms: null, availableAt: '', rentalType: 'empty',
    description: '', amenities: [],
    rent: null, charges: 0, deposit: 0, minDuration: 12,
    documentsRequired: ['identity', 'contract', 'payslips', 'tax'],
    publishNow: true,
    dpe: '', ges: '', floor: null, hasElevator: false, heatingType: '',
    extras: [],
  };

  steps = [
    { num: 1, label: 'Informations', sub: 'Les bases de votre campagne' },
    { num: 2, label: 'Logement',     sub: 'Photos et description' },
    { num: 3, label: 'Conditions',   sub: 'Loyer et conditions' },
    { num: 4, label: 'Documents',    sub: 'Pièces demandées' },
    { num: 5, label: 'Publication',  sub: 'Diffusion et visibilité' },
  ];

  propertyTypes = [
    { value: 'apartment', label: 'Appartement', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
    { value: 'house',     label: 'Maison',       icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { value: 'colocation',label: 'Colocation',   icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
    { value: 'studio',    label: 'Studio',       icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
    { value: 'bureau',    label: 'Bureau',       icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
  ];

  rentalTypeOptions = [
    { value: 'empty',     label: 'Vide' },
    { value: 'furnished', label: 'Meublé' },
    { value: 'colocation',label: 'Colocation' },
  ];

  amenityOptions = [
    { value: 'elevator', label: 'Ascenseur' }, { value: 'parking', label: 'Parking' },
    { value: 'balcony', label: 'Balcon' }, { value: 'fiber', label: 'Fibre optique' },
    { value: 'dishwasher', label: 'Lave-vaisselle' }, { value: 'washer', label: 'Lave-linge' },
    { value: 'cellar', label: 'Cave' }, { value: 'bike', label: 'Local vélo' },
    { value: 'heating', label: 'Chauffage individuel' }, { value: 'furnished', label: 'Cuisine équipée' },
  ];

  docOptions = [
    { value: 'identity',  label: 'Pièce d\'identité', required: true },
    { value: 'domicile',  label: 'Justificatif de domicile', required: true },
    { value: 'contract',  label: 'Contrat de travail', required: true },
    { value: 'payslips',  label: '3 dernières fiches de paie', required: true },
    { value: 'tax',       label: 'Dernier avis d\'imposition', required: false },
    { value: 'rib',       label: 'RIB', required: false },
    { value: 'guarantor', label: 'Garant (si nécessaire)', required: false },
  ];

  /** ID de la campagne créée (pour upload photos après persist step 1) */
  createdCampaignId = signal<string | null>(null);

  constructor(private svc: CampaignService, private router: Router, private route: ActivatedRoute) {}

  onPhotosChange(urls: string[]): void {
    this.form.photos = urls;
  }

  goTo(n: number): void { this.currentStep.set(n); }

  validate(): string {
    if (this.currentStep() === 1) {
      if (!this.form.title.trim()) return 'Le titre est requis.';
      if (!this.form.address.trim()) return 'L\'adresse est requise.';
    }
    if (this.currentStep() === 3) {
      if (!this.form.rent || this.form.rent <= 0) return 'Le loyer est requis.';
    }
    return '';
  }

  next(): void {
    this.error.set('');
    const err = this.validate();
    if (err) { this.error.set(err); return; }

    if (this.currentStep() < 5) {
      // Pré-créer la campagne en brouillon lors du passage step 1 → step 2
      // pour obtenir un ID et permettre l'upload de photos
      if (this.currentStep() === 1 && !this.createdCampaignId()) {
        this.svc.create({
          title: this.form.title,
          address: this.form.address,
          rent: this.form.rent ?? 0,  // 0 accepté pour les brouillons
          propertyType: this.form.propertyType,
          subtitle: this.form.subtitle || undefined,
          surface: this.form.surface ?? undefined,
          rooms: this.form.rooms ?? undefined,
          rentalType: this.form.rentalType,
      // Les photos sont déjà uploadées si on a un ID brouillon
          availableAt: this.form.availableAt || undefined,
        }).subscribe({
          next: (c) => {
            this.createdCampaignId.set(c.id);
            this.currentStep.update(s => s + 1);
          },
          error: (e) => this.error.set(e?.error?.error || 'Erreur lors de la création.'),
        });
        return;
      }
      this.currentStep.update(s => s + 1);
      return;
    }

    // Si on vient de l'étape 1 et qu'on n'a pas encore de campagne créée,
    // créer un brouillon pour avoir un ID (nécessaire pour l'upload photos en step 2)
    if (this.currentStep() === 5) {
      this.saving.set(true);
      // Si la campagne a déjà été pré-créée comme brouillon, juste publier
      if (this.createdCampaignId()) {
        const id = this.createdCampaignId()!;
        this.svc.update(id, {
          description: this.form.description || undefined,
          amenities: this.form.amenities,
          documentsRequired: this.form.documentsRequired,
          rent: this.form.rent ?? 0,  // 0 accepté pour les brouillons
          charges: this.form.charges,
          deposit: this.form.deposit,
          minDuration: this.form.minDuration,
          dpe: this.form.dpe || undefined,
          ges: this.form.ges || undefined,
          floor: this.form.floor,
          hasElevator: this.form.hasElevator,
          heatingType: this.form.heatingType || undefined,
          extras: this.form.extras.filter(e => e.label.trim() && e.value.trim()),
          availableAt: this.form.availableAt || undefined,
        }).subscribe({
          next: () => {
            if (this.form.publishNow) {
              this.svc.publish(id).subscribe({
                next: () => this.router.navigate(['/campagnes', id]),
                error: () => this.router.navigate(['/campagnes', id]),
              });
            } else {
              this.router.navigate(['/campagnes', id]);
            }
          },
          error: () => { this.saving.set(false); this.error.set('Erreur lors de la mise à jour.'); }
        });
        return;
      }
    }

    // Publication (cas où on publie depuis step 5 sans pré-création)
    this.saving.set(true);
    this.svc.create({
      propertyType: this.form.propertyType,
      title: this.form.title,
      subtitle: this.form.subtitle || undefined,
      address: this.form.address,
      surface: this.form.surface ?? undefined,
      rooms: this.form.rooms ?? undefined,
      availableAt: this.form.availableAt || undefined,
      rentalType: this.form.rentalType,
      // Les photos sont déjà uploadées si on a un ID brouillon
      description: this.form.description || undefined,
      amenities: this.form.amenities,
      rent: this.form.rent ?? 0,
      charges: this.form.charges,
      deposit: this.form.deposit,
      minDuration: this.form.minDuration,
          dpe: this.form.dpe || undefined,
          ges: this.form.ges || undefined,
          floor: this.form.floor,
          hasElevator: this.form.hasElevator,
          heatingType: this.form.heatingType || undefined,
          extras: this.form.extras.filter(e => e.label.trim() && e.value.trim()),
      documentsRequired: this.form.documentsRequired,
    }).subscribe({
      next: (c) => {
        if (this.form.publishNow) {
          this.svc.publish(c.id).subscribe({
            next: () => this.router.navigate(['/campagnes', c.id]),
            error: () => this.router.navigate(['/campagnes', c.id]),
          });
        } else {
          this.router.navigate(['/campagnes', c.id]);
        }
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.error || 'Erreur lors de la création. Vérifiez les informations.');
      },
    });
  }

  saveDraft(): void {
    if (!this.form.title.trim()) {
      this.currentStep.set(1);
      this.error.set('Un titre est requis pour enregistrer un brouillon.');
      return;
    }
    if (!this.form.address.trim()) {
      this.currentStep.set(1);
      this.error.set('Une adresse est requise pour enregistrer un brouillon.');
      return;
    }
    if (!this.form.rent || this.form.rent <= 0) {
      this.currentStep.set(3);
      this.error.set('Un loyer est requis pour enregistrer un brouillon.');
      return;
    }
    this.svc.create({
      title: this.form.title, address: this.form.address,
      rent: this.form.rent ?? 0, propertyType: this.form.propertyType,
    }).subscribe({
      next: (c) => this.router.navigate(['/campagnes', c.id]),
      error: () => this.error.set('Erreur lors de l\'enregistrement.'),
    });
  }

  addExtra(): void { if (this.form.extras.length < 20) this.form.extras.push({ label: '', value: '' }); }
  removeExtra(i: number): void { this.form.extras.splice(i, 1); }

  toggleAmenity(v: string): void {
    const idx = this.form.amenities.indexOf(v);
    if (idx >= 0) this.form.amenities.splice(idx, 1);
    else this.form.amenities.push(v);
  }

  toggleDoc(v: string): void {
    const idx = this.form.documentsRequired.indexOf(v);
    if (idx >= 0) this.form.documentsRequired.splice(idx, 1);
    else this.form.documentsRequired.push(v);
  }
}
