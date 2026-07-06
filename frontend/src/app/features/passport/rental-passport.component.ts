import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PassportService, RentalPassport, CONTRACT_TYPES, DOCUMENT_TYPES } from '../../core/services/passport.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-rental-passport',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .field-label { font-size:.8125rem;font-weight:600;color:#374151;font-family:Inter,sans-serif;display:block;margin-bottom:.375rem; }
    .field-input { width:100%;padding:.625rem .875rem;border:1.5px solid #E5E7EB;border-radius:.625rem;font-size:.875rem;font-family:Inter,sans-serif;color:#0A1F1A;outline:none;transition:border-color .15s;background:white; }
    .field-input:focus { border-color:#2C7A5E;box-shadow:0 0 0 3px rgba(44,122,94,.08); }
    .step-pill { padding:.375rem .875rem;border-radius:2rem;font-size:.75rem;font-weight:600;border:1.5px solid #E5E7EB;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;background:white;color:#9CA3AF; }
    .step-pill.active { border-color:#1B4438;background:#F0F9F5;color:#1B4438; }
    .step-pill.done { border-color:#2C7A5E;background:#E0EDE8;color:#2C7A5E; }
    .doc-row { display:flex;align-items:center;gap:.75rem;padding:.75rem;border-radius:.75rem;border:1.5px solid #F0F0F0;background:white;transition:all .15s; }
    .doc-row:hover { border-color:#E0EDE8;background:#FAFBFA; }
  `],
  template: `
    <div class="p-6 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.625rem;color:#0A1F1A;letter-spacing:-.03em">
            Mon Rental Passport
          </h1>
          <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
            Votre dossier complet, vérifié et toujours à jour.
          </p>
        </div>
        <button type="button" (click)="save()"
                [disabled]="saving()"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-px"
                style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
          @if (saving()) {
            <span style="font-size:.75rem">Enregistrement...</span>
          } @else {
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            Enregistrer
          }
        </button>
      </div>

      <!-- Score & profil header card -->
      <div class="card p-5 mb-5">
        <div class="flex items-start gap-6">
          <!-- Avatar placeholder -->
          <div class="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-xl font-bold text-white"
               style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
            {{ initials() }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <p style="font-family:'Playfair Display',Georgia,serif;font-size:1.125rem;font-weight:800;color:#0A1F1A">
                {{ form.firstName || 'Prénom' }} {{ form.lastName || 'Nom' }}
              </p>
              @if (completionRate() >= 80) {
                <svg class="w-4 h-4" style="color:#2C7A5E" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            </div>
            @if (form.contractType && form.employer) {
              <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif">
                {{ contractLabel(form.contractType) }} chez <span style="color:#2C7A5E;font-weight:600">{{ form.employer }}</span>
              </p>
            }
            @if (form.monthlyIncome) {
              <p style="font-size:.875rem;color:#374151;font-family:Inter,sans-serif;margin-top:.25rem">
                Revenus mensuels : <b>{{ form.monthlyIncome | number:'1.0-0' }} €</b>
              </p>
            }
          </div>

          <!-- Score Baileo (circulaire) -->
          <div class="shrink-0 text-center">
            <p style="font-size:.6875rem;font-weight:700;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.375rem">
              Score Baileo
            </p>
            <div class="relative w-20 h-20">
              <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#E0EDE8" stroke-width="5"/>
                <circle cx="40" cy="40" r="32" fill="none" stroke="#2C7A5E" stroke-width="5"
                        stroke-linecap="round"
                        [attr.stroke-dasharray]="'201'"
                        [attr.stroke-dashoffset]="201 - (201 * completionRate() / 100)"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;line-height:1">
                  {{ completionRate() }}%
                </span>
                <span style="font-size:.5rem;color:#9CA3AF;font-family:Inter,sans-serif">complété</span>
              </div>
            </div>
          </div>

          <!-- Score breakdown bars -->
          <div class="shrink-0 space-y-2" style="min-width:200px">
            @for (b of scoreBreakdown(); track b.label) {
              <div>
                <div class="flex justify-between mb-0.5">
                  <span style="font-size:.6875rem;color:#374151;font-family:Inter,sans-serif">{{ b.label }}</span>
                  <span style="font-size:.6875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ b.val }}/{{ b.max }}
                  </span>
                </div>
                <div class="h-1.5 rounded-full overflow-hidden" style="background:#E5E7EB">
                  <div class="h-full rounded-full transition-all"
                       style="background:linear-gradient(90deg,#2C7A5E,#38B88A)"
                       [style.width]="(b.val / b.max * 100) + '%'"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Indicateurs -->
        <div class="flex items-center gap-4 mt-4 pt-3" style="border-top:1px solid #F5F7F6">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
            </svg>
            <span style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">Dossier vérifié</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-3.5 h-3.5 rounded-full" style="background:#E0EDE8;display:flex;align-items:center;justify-content:center">
              <div style="width:.5rem;height:.5rem;border-radius:50%;background:#2C7A5E"></div>
            </div>
            <span style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">
              {{ passport()?.documents?.length ?? 0 }} documents uploadés
            </span>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <span style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif">Visible par les propriétaires</span>
            <div class="relative w-8 h-5 cursor-pointer" (click)="toggleVisibility()">
              <div class="w-8 h-5 rounded-full transition-colors"
                   [style.background]="form.visibleToOwners ? '#2C7A5E' : '#E5E7EB'">
                <div class="w-3 h-3 rounded-full bg-white shadow absolute top-1 transition-transform"
                     [style.transform]="form.visibleToOwners ? 'translateX(1.125rem)' : 'translateX(.25rem)'"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps tabs -->
      <div class="flex gap-2 mb-5 overflow-x-auto pb-1">
        @for (s of steps; track s.key) {
          <button type="button" class="step-pill shrink-0"
                  [class.active]="currentStep() === s.key"
                  [class.done]="isStepDone(s.key)"
                  (click)="currentStep.set(s.key)">
            @if (isStepDone(s.key)) {
              <svg class="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
            }
            {{ s.label }}
          </button>
        }
      </div>

      <!-- Form steps -->
      <div class="grid grid-cols-3 gap-5">
        <div class="col-span-2">

          @if (currentStep() === 'identity') {
            <div class="card p-5 space-y-4">
              <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">1. Mon identité</h2>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="field-label">Prénom</label><input [(ngModel)]="form.firstName" class="field-input" placeholder="Wendy"/></div>
                <div><label class="field-label">Nom</label><input [(ngModel)]="form.lastName" class="field-input" placeholder="Rasamoelina"/></div>
                <div><label class="field-label">Date de naissance</label><input type="date" [(ngModel)]="form.birthDate" class="field-input"/></div>
                <div><label class="field-label">Nationalité</label><input [(ngModel)]="form.nationality" class="field-input" placeholder="Française"/></div>
                <div><label class="field-label">Téléphone</label><input [(ngModel)]="form.phone" class="field-input" placeholder="06 12 34 56 78"/></div>
              </div>
              <div><label class="field-label">Adresse actuelle</label><input [(ngModel)]="form.currentAddress" class="field-input" placeholder="12 rue de la Paix, 13001 Marseille"/></div>
              <div class="p-3 rounded-xl flex items-center gap-2" style="background:#F0F9F5;border:1px solid #E0EDE8">
                <svg class="w-4 h-4 shrink-0" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                </svg>
                <p style="font-size:.75rem;color:#374151;font-family:Inter,sans-serif">
                  Vos informations sont sécurisées et utilisées uniquement pour votre dossier de location.
                </p>
              </div>
            </div>
          }

          @if (currentStep() === 'situation') {
            <div class="card p-5 space-y-4">
              <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">2. Situation actuelle</h2>
              <div>
                <label class="field-label">Type de contrat</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (ct of contractTypes; track ct.value) {
                    <button type="button"
                            class="py-2 px-3 rounded-xl text-sm font-semibold border transition-all"
                            style="font-family:Inter,sans-serif"
                            [style.borderColor]="form.contractType === ct.value ? '#1B4438' : '#E5E7EB'"
                            [style.background]="form.contractType === ct.value ? '#F0F9F5' : 'white'"
                            [style.color]="form.contractType === ct.value ? '#1B4438' : '#6B7280'"
                            (click)="form.contractType = ct.value">
                      {{ ct.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="field-label">Employeur</label><input [(ngModel)]="form.employer" class="field-input" placeholder="Nom de l'entreprise"/></div>
                <div><label class="field-label">Ancienneté</label><input [(ngModel)]="form.employmentDuration" class="field-input" placeholder="2 ans 3 mois"/></div>
              </div>
            </div>
          }

          @if (currentStep() === 'revenus') {
            <div class="card p-5 space-y-4">
              <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">3. Revenus</h2>
              <div>
                <label class="field-label">Revenus mensuels nets</label>
                <div class="relative">
                  <input type="number" [(ngModel)]="form.monthlyIncome" placeholder="2800" min="0"
                         class="field-input" style="padding-right:2rem"/>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF">€</span>
                </div>
              </div>
              @if (form.monthlyIncome && form.monthlyIncome > 0) {
                <div class="p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                  <p style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">
                    Avec <b>{{ form.monthlyIncome | number:'1.0-0' }} €</b> de revenus, vous pouvez cibler des loyers
                    jusqu'à <b style="color:#2C7A5E">{{ (form.monthlyIncome / 3) | number:'1.0-0' }} €/mois</b> (loyer cc).
                  </p>
                </div>
              }
            </div>
          }

          @if (currentStep() === 'garant') {
            <div class="card p-5 space-y-4">
              <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">4. Garant</h2>
              <div>
                <label class="field-label">Avez-vous un garant ?</label>
                <div class="flex gap-2">
                  @for (rel of ['Aucun|none','Parent|parent','Conjoint|spouse','Autre|other']; track rel) {
                    <button type="button"
                            class="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                            style="font-family:Inter,sans-serif"
                            [style.borderColor]="form.guarantorRelation === rel.split('|')[1] ? '#1B4438' : '#E5E7EB'"
                            [style.background]="form.guarantorRelation === rel.split('|')[1] ? '#F0F9F5' : 'white'"
                            [style.color]="form.guarantorRelation === rel.split('|')[1] ? '#1B4438' : '#6B7280'"
                            (click)="form.guarantorRelation = rel.split('|')[1]">
                      {{ rel.split('|')[0] }}
                    </button>
                  }
                </div>
              </div>
              @if (form.guarantorRelation !== 'none') {
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="field-label">Nom du garant</label>
                    <input [(ngModel)]="form.guarantorName" class="field-input" placeholder="Pierre Martin"/>
                  </div>
                  <div>
                    <label class="field-label">Revenus du garant</label>
                    <div class="relative">
                      <input type="number" [(ngModel)]="form.guarantorIncome" placeholder="3200" min="0"
                             class="field-input" style="padding-right:2rem"/>
                      <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF">€</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          @if (currentStep() === 'documents') {
            <div class="card p-5 space-y-3">
              <div class="flex items-center justify-between">
                <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">5. Documents</h2>
                <span style="font-size:.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif">
                  {{ form.documents.length }} / {{ docTypes.length }} documents
                </span>
              </div>

              @for (dt of docTypes; track dt.value) {
                <div class="doc-row">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                       [style.background]="hasDoc(dt.value) ? '#E0EDE8' : '#F5F7F6'">
                    <svg class="w-4 h-4" [style.color]="hasDoc(dt.value) ? '#2C7A5E' : '#9CA3AF'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ dt.label }}</p>
                    @if (getDoc(dt.value)) {
                      <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ getDoc(dt.value)!.name }}</p>
                      @if (docStatus(dt.value) === 'rejected' && docComment(dt.value)) {
                        <p style="font-size:.6875rem;color:#DC2626;font-family:Inter,sans-serif;margin-top:.125rem">
                          Motif du propriétaire : {{ docComment(dt.value) }}
                        </p>
                      }
                    }
                  </div>
                  @if (hasDoc(dt.value)) {
                    <div class="flex items-center gap-1.5">
                      @if (docStatus(dt.value) === 'validated') {
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold" style="background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                          Validé ✓
                        </span>
                      } @else if (docStatus(dt.value) === 'rejected') {
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold" style="background:#FEF2F2;color:#DC2626;font-family:Inter,sans-serif">
                          À corriger
                        </span>
                        <label class="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                               style="background:#1B4438;color:white;font-family:Inter,sans-serif">
                          @if (uploadingDoc() === dt.value) { {{ uploadProgress() }}% } @else { Re-téléverser }
                          <input type="file" class="hidden" accept=".pdf,image/jpeg,image/png,image/webp"
                                 (change)="uploadDocument($event, dt.value)" [disabled]="uploadingDoc() !== null"/>
                        </label>
                      } @else {
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold" style="background:#E0EDE8;color:#2C7A5E;font-family:Inter,sans-serif">
                          Ajouté
                        </span>
                      }
                      @if (docStatus(dt.value) !== 'validated') {
                        <button type="button" (click)="removeDoc(dt.value)"
                                class="text-red-400 hover:text-red-600"
                                style="font-size:.625rem;font-family:Inter,sans-serif">
                          Suppr.
                        </button>
                      }
                    </div>
                  } @else {
                    <label class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                           style="background:#F0F9F5;color:#1B4438;border:1.5px solid #E0EDE8;font-family:Inter,sans-serif">
                      @if (uploadingDoc() === dt.value) {
                        <span>{{ uploadProgress() }}%</span>
                      } @else {
                        + Ajouter
                      }
                      <input type="file" class="hidden"
                             accept=".pdf,image/jpeg,image/png,image/webp"
                             (change)="uploadDocument($event, dt.value)"
                             [disabled]="uploadingDoc() !== null"/>
                    </label>
                  }
                </div>
              }
            </div>
          }

          @if (currentStep() === 'preferences') {
            <div class="card p-5 space-y-4">
              <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">6. Préférences</h2>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="field-label">Budget maximum</label>
                  <div class="relative">
                    <input type="number" [(ngModel)]="form.maxRent" placeholder="1200" min="0" class="field-input" style="padding-right:2rem"/>
                    <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF">€</span>
                  </div>
                </div>
                <div>
                  <label class="field-label">Surface minimum</label>
                  <div class="relative">
                    <input type="number" [(ngModel)]="form.minSurface" placeholder="40" min="0" class="field-input" style="padding-right:2.5rem"/>
                    <span class="absolute right-3 top-1/2 -translate-y-1/2" style="font-size:.875rem;color:#9CA3AF">m²</span>
                  </div>
                </div>
                <div>
                  <label class="field-label">Ville souhaitée</label>
                  <input [(ngModel)]="form.preferredCity" class="field-input" placeholder="Marseille, 1er, 6e, 8e"/>
                </div>
                <div>
                  <label class="field-label">Date de disponibilité</label>
                  <input type="date" [(ngModel)]="form.availabilityDate" class="field-input"/>
                </div>
              </div>
            </div>
          }

          @if (currentStep() === 'recap') {
            <div class="card p-4 mb-4 flex items-center justify-between">
              <div>
                <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Vos données vous appartiennent</p>
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Téléchargez une copie complète (RGPD, art. 20).</p>
              </div>
              <button type="button" (click)="exportData()" [disabled]="exporting()"
                      class="px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                      style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;cursor:pointer;font-family:Inter,sans-serif">
                {{ exporting() ? 'Préparation...' : 'Télécharger mes données' }}
              </button>
            </div>
            <!-- Transparence RGPD : partages actifs + accès journalisés -->
            <div class="card p-4 mb-4">
              <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">Qui a accès à mon dossier</p>
              @if (shares().length) {
                @for (s of shares(); track s.id) {
                  <div class="flex items-center justify-between py-1.5" style="border-bottom:1px solid #F5F7F6">
                    <div>
                      <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ s.campaignTitle }}</p>
                      <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ s.ownerName }} · depuis le {{ s.sharedAt | date:'d MMM yyyy' }}</p>
                    </div>
                    <span class="px-2 py-0.5 rounded-lg" style="font-size:.625rem;font-weight:700;font-family:Inter,sans-serif"
                          [style.background]="s.status === 'active' ? '#E0EDE8' : '#F3F4F6'"
                          [style.color]="s.status === 'active' ? '#1B4438' : '#9CA3AF'">
                      {{ s.status === 'active' ? 'Partage actif' : 'Révoqué' }}
                    </span>
                  </div>
                }
              } @else {
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Aucun partage — votre dossier n'est visible de personne.</p>
              }
              @if (accessLog().length) {
                <p style="font-size:.75rem;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-top:.75rem;margin-bottom:.25rem">Dernières consultations de vos documents</p>
                @for (l of accessLog().slice(0, 5); track l.at) {
                  <p style="font-size:.6875rem;color:#6B7280;font-family:Inter,sans-serif">
                    {{ l.viewer }} — {{ docLabelPublic(l.documentType) }} ({{ l.action === 'download' ? 'consulté' : l.action === 'validate' ? 'validé' : 'refusé' }}) · {{ l.at | date:'d MMM à HH:mm' }}
                  </p>
                }
              }
            </div>

            <div class="card p-5 space-y-4">
              <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1rem;color:#0A1F1A">Récapitulatif de votre dossier</h2>
              <div class="space-y-3">
                <div class="p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                  <p style="font-size:.75rem;font-weight:700;color:#9CA3AF;margin-bottom:.375rem;font-family:Inter,sans-serif">IDENTITÉ</p>
                  <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.firstName }} {{ form.lastName }}</p>
                  @if (form.phone) { <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">{{ form.phone }}</p> }
                </div>
                <div class="p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                  <p style="font-size:.75rem;font-weight:700;color:#9CA3AF;margin-bottom:.375rem;font-family:Inter,sans-serif">SITUATION PROFESSIONNELLE</p>
                  <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ contractLabel(form.contractType) || '—' }} {{ form.employer ? '· ' + form.employer : '' }}</p>
                  @if (form.monthlyIncome) { <p style="font-size:.8125rem;color:#2C7A5E;font-weight:600;font-family:Inter,sans-serif">{{ form.monthlyIncome | number:'1.0-0' }} € / mois</p> }
                </div>
                @if (form.guarantorRelation !== 'none') {
                  <div class="p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                    <p style="font-size:.75rem;font-weight:700;color:#9CA3AF;margin-bottom:.375rem;font-family:Inter,sans-serif">GARANT</p>
                    <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ form.guarantorName || 'Garant déclaré' }}</p>
                    @if (form.guarantorIncome) { <p style="font-size:.8125rem;color:#2C7A5E;font-weight:600;font-family:Inter,sans-serif">{{ form.guarantorIncome | number:'1.0-0' }} € / mois</p> }
                  </div>
                }
                <div class="p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                  <p style="font-size:.75rem;font-weight:700;color:#9CA3AF;margin-bottom:.375rem;font-family:Inter,sans-serif">DOCUMENTS</p>
                  <p style="font-size:.875rem;font-weight:600;font-family:Inter,sans-serif"
                     [style.color]="form.documents.length >= 4 ? '#2C7A5E' : '#F97316'">
                    {{ form.documents.length }} document{{ form.documents.length !== 1 ? 's' : '' }} ajouté{{ form.documents.length !== 1 ? 's' : '' }}
                  </p>
                </div>
                <div class="p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                  <p style="font-size:.75rem;font-weight:700;color:#9CA3AF;margin-bottom:.375rem;font-family:Inter,sans-serif">DISPONIBILITÉ</p>
                  <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ form.availabilityDate || 'Non précisée' }}{{ form.preferredCity ? ' · ' + form.preferredCity : '' }}
                  </p>
                </div>
              </div>

              <!-- Score visuel -->
              <div class="flex items-center gap-4 p-4 rounded-xl" style="background:linear-gradient(135deg,#F0F9F5,white);border:1.5px solid #E0EDE8">
                <div class="relative w-16 h-16 shrink-0">
                  <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#E0EDE8" stroke-width="5"/>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#2C7A5E" stroke-width="5"
                            [attr.stroke-dasharray]="'163.4'"
                            [attr.stroke-dashoffset]="163.4 - (163.4 * completionRate() / 100)"
                            stroke-linecap="round"/>
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center"
                        style="font-size:.75rem;font-weight:800;color:#0A1F1A;font-family:Inter,sans-serif">{{ completionRate() }}%</span>
                </div>
                <div>
                  <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    Complété à {{ completionRate() }}%
                  </p>
                  <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">
                    {{ completionRate() >= 80 ? 'Dossier solide — vous êtes prêt à postuler !' : 'Complétez votre dossier pour maximiser vos chances.' }}
                  </p>
                </div>
              </div>

              @if (error()) {
                <div class="p-3 rounded-xl" style="background:#FEF2F2;border:1px solid #FEE2E2">
                  <p style="font-size:.8125rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p>
                </div>
              }
            </div>
          }

          <!-- Navigation -->
          <div class="flex justify-between mt-4">
            <button type="button" (click)="prevStep()"
                    [disabled]="currentStepIdx() === 0"
                    class="px-4 py-2 rounded-xl text-sm font-semibold border disabled:opacity-40"
                    style="border-color:#E5E7EB;font-family:Inter,sans-serif;background:white;color:#6B7280">
              Précédent
            </button>
            @if (currentStepIdx() < steps.length - 1) {
              <button type="button" (click)="nextStep()"
                      class="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style="background:#1B4438;font-family:Inter,sans-serif">
                {{ currentStep() === 'documents' || currentStep() === 'preferences' ? 'Récapitulatif' : 'Continuer' }}
              </button>
            } @else {
              <button type="button" (click)="save()" [disabled]="saving()"
                      class="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif">
                {{ saving() ? 'Enregistrement...' : 'Enregistrer mon dossier' }}
              </button>
            }
          </div>
        </div>

        <!-- Sidebar droite: progression -->
        <div class="space-y-4">
          <div class="card p-4">
            <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
              Votre progression
            </h3>

            <!-- Barre progression -->
            <div class="h-2 rounded-full overflow-hidden mb-3" style="background:#E5E7EB">
              <div class="h-full rounded-full transition-all"
                   style="background:linear-gradient(90deg,#2C7A5E,#38B88A)"
                   [style.width]="completionRate() + '%'"></div>
            </div>
            <p class="text-right mb-3" style="font-size:.75rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif">
              {{ completionRate() }}%
            </p>

            <div class="space-y-2">
              @for (s of steps; track s.key) {
                <div class="flex items-center gap-2 cursor-pointer" (click)="currentStep.set(s.key)">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                       [style.background]="isStepDone(s.key) ? '#2C7A5E' : currentStep() === s.key ? '#1B4438' : '#E5E7EB'">
                    @if (isStepDone(s.key)) {
                      <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                      </svg>
                    } @else {
                      <span style="font-size:.5rem;color:white;font-weight:700">{{ steps.indexOf(s) + 1 }}</span>
                    }
                  </div>
                  <span style="font-size:.8125rem;font-family:Inter,sans-serif"
                        [style.color]="currentStep() === s.key ? '#1B4438' : '#6B7280'"
                        [style.fontWeight]="currentStep() === s.key ? '600' : '400'">
                    {{ s.label }}
                  </span>
                  @if (isStepDone(s.key)) {
                    <span class="ml-auto" style="font-size:.625rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif">Complété</span>
                  } @else if (currentStep() === s.key) {
                    <span class="ml-auto" style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">En cours</span>
                  } @else {
                    <span class="ml-auto" style="font-size:.625rem;color:#D1D5DB;font-family:Inter,sans-serif">À faire</span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Success message -->
          @if (saved()) {
            <div class="card p-4" style="background:#F0F9F5;border:1.5px solid #E0EDE8">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 shrink-0" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p style="font-size:.8125rem;font-weight:600;color:#1B4438;font-family:Inter,sans-serif">
                  Dossier enregistré avec succès !
                </p>
              </div>
            </div>
          }

          @if (error()) {
            <div class="card p-4" style="background:#FEF2F2;border:1.5px solid #FEE2E2">
              <p style="font-size:.8125rem;color:#DC2626;font-family:Inter,sans-serif">{{ error() }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class RentalPassportComponent implements OnInit {
  user    = this.auth.currentUser;
  loading = signal(true);
  saving  = signal(false);
  saved   = signal(false);
  error   = signal('');
  passport = signal<RentalPassport | null>(null);

  currentStep = signal('identity');

  form = {
    firstName: '', lastName: '', birthDate: '', nationality: '', phone: '', currentAddress: '',
    contractType: '', employer: '', monthlyIncome: null as number | null, employmentDuration: '',
    guarantorRelation: 'none', guarantorName: '', guarantorIncome: null as number | null,
    maxRent: null as number | null, minSurface: null as number | null,
    preferredCity: '', availabilityDate: '', projectDuration: 'long_term',
    documents: [] as { type: string; name: string; url?: string; uploadedAt: string; status?: string; reviewComment?: string | null }[],
    visibleToOwners: true,
  };

  /** Brouillon : positionne le wizard sur la première étape dont les champs requis manquent. */
  private resumeAtFirstIncomplete(): void {
    const f = this.form;
    if (!f.firstName || !f.lastName || !f.birthDate)   { this.currentStep.set('identity');  return; }
    if (!f.contractType || !f.currentAddress)          { this.currentStep.set('situation'); return; }
    if (!f.monthlyIncome)                              { this.currentStep.set('revenus');   return; }
    if (f.guarantorRelation !== 'none' && !f.guarantorName) { this.currentStep.set('garant'); return; }
    if (!f.documents?.length)                          { this.currentStep.set('documents'); return; }
    this.currentStep.set('recap');
  }

  steps = [
    { key: 'identity',    label: 'Identité' },
    { key: 'situation',   label: 'Situation' },
    { key: 'revenus',     label: 'Revenus' },
    { key: 'garant',      label: 'Garant' },
    { key: 'documents',   label: 'Documents' },
    { key: 'preferences', label: 'Préférences' },
    { key: 'recap',       label: 'Récapitulatif' },
  ];

  contractTypes = CONTRACT_TYPES;
  docTypes      = DOCUMENT_TYPES;

  uploadingDoc = signal<string | null>(null);
  uploadProgress = signal(0);

  constructor(private svc: PassportService, private auth: AuthService, private http: HttpClient) {}

  docStatus(type: string): string {
    return (this.getDoc(type) as { status?: string } | undefined)?.status ?? 'uploaded';
  }
  docComment(type: string): string {
    return (this.getDoc(type) as { reviewComment?: string | null } | undefined)?.reviewComment ?? '';
  }

  exporting = signal(false);
  shares    = signal<{ id: string; campaignTitle: string; ownerName: string; status: string; sharedAt: string }[]>([]);
  accessLog = signal<{ documentType: string; viewer: string; action: string; at: string }[]>([]);

  private loadPrivacy(): void {
    this.http.get<{ data: { id: string; campaignTitle: string; ownerName: string; status: string; sharedAt: string }[] }>(
      `${environment.apiUrl}/passport/shares`
    ).subscribe({
      next: (res) => this.shares.set(res.data ?? []),
      error: () => {},
    });
    this.http.get<{ data: { documentType: string; viewer: string; action: string; at: string }[] }>(`${environment.apiUrl}/documents/access-log`).subscribe({
      next: (res) => this.accessLog.set(res.data ?? []),
      error: () => {},
    });
  }

  docLabelPublic(type: string): string {
    const map: Record<string, string> = {
      identity: 'Pièce d\'identité', domicile: 'Justificatif de domicile', contract: 'Contrat de travail',
      payslips: 'Fiches de paie', tax: 'Avis d\'imposition', rib: 'RIB', insurance: 'Assurance',
      guarantor_id: 'Identité garant', guarantor_income: 'Revenus garant',
    };
    return map[type] ?? type;
  }

  exportData(): void {
    this.exporting.set(true);
    this.http.get(`${environment.apiUrl}/auth/export`).subscribe({
      next: (data) => {
        this.exporting.set(false);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `baileo-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => this.exporting.set(false),
    });
  }

  uploadDocument(event: Event, docType: string): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validation côté client
    const maxSize = 10 * 1024 * 1024;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (file.size > maxSize) { this.error.set('Fichier trop lourd (max 10 Mo).'); return; }
    if (!allowed.includes(file.type)) { this.error.set('Format non supporté (PDF, JPG, PNG, WebP).'); return; }

    this.uploadingDoc.set(docType);
    this.uploadProgress.set(0);
    this.error.set('');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', docType);

    const req = new HttpRequest('POST', `${environment.apiUrl}/rental-passport/documents`, formData, {
      reportProgress: true,
      headers: {} as any,
    });

    this.http.request(req).subscribe({
      next: (ev) => {
        if (ev.type === HttpEventType.UploadProgress && ev.total) {
          this.uploadProgress.set(Math.round(100 * ev.loaded / ev.total));
        }
        if (ev.type === HttpEventType.Response) {
          const body = ev.body as any;
          // Mettre à jour la liste locale de documents
          this.form.documents = [
            ...this.form.documents.filter(d => d.type !== docType),
            { type: docType, name: body.name, url: body.url, uploadedAt: body.uploadedAt },
          ];
          this.uploadingDoc.set(null);
          this.uploadProgress.set(0);
        }
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Erreur lors de l\'upload.');
        this.uploadingDoc.set(null);
        this.uploadProgress.set(0);
      },
    });
  }

  ngOnInit(): void {
    this.loadPrivacy();
    const u = this.user();
    if (u) { this.form.firstName = u.firstName ?? ''; this.form.lastName = u.lastName ?? ''; }

    this.svc.get().subscribe({
      next: (p) => {
        if (p.exists) {
          this.passport.set(p);
          Object.assign(this.form, {
            firstName: p.firstName ?? this.form.firstName,
            lastName:  p.lastName  ?? this.form.lastName,
            birthDate: p.birthDate ?? '',
            nationality: p.nationality ?? '',
            phone: p.phone ?? '',
            currentAddress: p.currentAddress ?? '',
            contractType: p.contractType ?? '',
            employer: p.employer ?? '',
            monthlyIncome: p.monthlyIncome ?? null,
            employmentDuration: p.employmentDuration ?? '',
            guarantorRelation: p.guarantorRelation ?? 'none',
            guarantorName: p.guarantorName ?? '',
            guarantorIncome: p.guarantorIncome ?? null,
            maxRent: p.maxRent ?? null,
            minSurface: p.minSurface ?? null,
            preferredCity: p.preferredCity ?? '',
            availabilityDate: p.availabilityDate ?? '',
            projectDuration: p.projectDuration ?? 'long_term',
            documents: p.documents ?? [],
            visibleToOwners: p.visibleToOwners ?? true,
          });
          // Reprise à l'étape exacte : première section incomplète
          this.resumeAtFirstIncomplete();
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);

    this.svc.save(this.form as any).subscribe({
      next: (p) => {
        this.passport.set(p);
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.error || 'Erreur lors de l\'enregistrement.');
      },
    });
  }

  completionRate(): number {
    let score = 0;
    if (this.form.firstName)           score += 10;
    if (this.form.lastName)            score += 5;
    if (this.form.birthDate)           score += 5;
    if (this.form.phone)               score += 5;
    if (this.form.contractType)        score += 10;
    if (this.form.employer)            score += 5;
    if (this.form.monthlyIncome)       score += 10;
    if (this.form.availabilityDate)    score += 5;
    if (this.form.preferredCity)       score += 5;
    if (this.form.documents.length >= 3) score += 20;
    if (this.form.documents.length >= 6) score += 10;
    if (this.form.guarantorRelation !== 'none' && this.form.guarantorIncome) score += 10;
    return Math.min(100, score);
  }

  scoreBreakdown() {
    return [
      { label: 'Stabilité professionnelle', val: this.form.contractType === 'cdi' ? 18 : this.form.contractType ? 10 : 0, max: 20 },
      { label: 'Revenus & solvabilité',     val: this.form.monthlyIncome ? Math.min(20, Math.floor(this.form.monthlyIncome / 200)) : 0, max: 20 },
      { label: 'Garanties',                 val: this.form.guarantorRelation !== 'none' && this.form.guarantorIncome ? 13 : 0, max: 15 },
      { label: 'Dossier & documents',       val: Math.min(20, this.form.documents.length * 3), max: 20 },
      { label: 'Réactivité',               val: 8, max: 10 },
    ];
  }

  currentStepIdx(): number { return this.steps.findIndex(s => s.key === this.currentStep()); }
  nextStep(): void { if (this.currentStepIdx() < this.steps.length - 1) this.currentStep.set(this.steps[this.currentStepIdx() + 1].key); }
  prevStep(): void { if (this.currentStepIdx() > 0) this.currentStep.set(this.steps[this.currentStepIdx() - 1].key); }

  isStepDone(key: string): boolean {
    const idx = this.steps.findIndex(s => s.key === key);
    return idx < this.currentStepIdx();
  }

  hasDoc(type: string): boolean { return this.form.documents.some(d => d.type === type); }
  getDoc(type: string) { return this.form.documents.find(d => d.type === type); }
  removeDoc(type: string): void { this.form.documents = this.form.documents.filter(d => d.type !== type); }
  addFakeDoc(type: string, label: string): void {
    this.form.documents.push({ type, name: `${label}.pdf`, uploadedAt: new Date().toISOString() });
  }

  toggleVisibility(): void { this.form.visibleToOwners = !this.form.visibleToOwners; }
  contractLabel(ct: string): string { return CONTRACT_TYPES.find(c => c.value === ct)?.label ?? ct; }
  initials(): string {
    return ((this.form.firstName?.[0] ?? '?') + (this.form.lastName?.[0] ?? '')).toUpperCase();
  }
}
