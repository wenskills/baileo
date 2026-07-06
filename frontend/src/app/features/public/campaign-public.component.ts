import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface PublicCampaign {
  slug?: string | null;
  dpe?: string | null; ges?: string | null; floor?: number | null;
  hasElevator?: boolean; heatingType?: string | null;
  extras?: { label: string; value: string }[];
  owner?: { name: string; memberSince: string; activeCampaigns: number; bio: string | null; responseTime?: string | null } | null;
  id: string; title: string; subtitle?: string; propertyType: string;
  address: string;
  preciseAddress?: boolean; surface?: number; rooms?: number; bedrooms?: number;
  bathrooms?: number; rent: number; charges: number;
  deposit: number; rentalType: string; minDuration: number;
  description?: string; amenities?: string[]; photos?: string[];
  documentsRequired?: string[]; availableAt?: string;
}

const AMENITY_LABELS: Record<string, string> = {
  elevator:'Ascenseur', parking:'Parking', balcony:'Balcon', fiber:'Fibre optique',
  dishwasher:'Lave-vaisselle', washer:'Lave-linge', cellar:'Cave', bike:'Local vélo',
  heating:'Chauffage individuel', furnished_kitchen:'Cuisine équipée',
  pool:'Piscine', garden:'Jardin', terrace:'Terrasse',
};

const DOC_LABELS: Record<string, string> = {
  identity:'Pièce d\'identité', domicile:'Justificatif de domicile',
  contract:'Contrat de travail', payslips:'3 dernières fiches de paie',
  tax:'Avis d\'imposition', rib:'RIB', insurance:'Attestation d\'assurance',
  guarantor:'Garant (si nécessaire)',
};

@Component({
  selector: 'app-campaign-public',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  styles: [`
    .hero-img { width:100%;height:420px;object-fit:cover; }
    .thumb { width:80px;height:60px;object-fit:cover;border-radius:.5rem;cursor:pointer;transition:all .15s;flex-shrink:0; }
    .thumb.active, .thumb:hover { outline:2.5px solid #2C7A5E;transform:scale(1.04); }
    .icon-chip { display:inline-flex;align-items:center;gap:.375rem;padding:.375rem .75rem;
      background:#F5F7F6;border-radius:2rem;font-size:.8125rem;color:#374151;font-family:Inter,sans-serif; }
    .step-num { width:2.5rem;height:2.5rem;border-radius:50%;background:#E0EDE8;
      display:flex;align-items:center;justify-content:center;font-weight:700;
      color:#1B4438;font-family:Inter,sans-serif;flex-shrink:0; }
  `],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center min-h-screen" style="background:#F5F7F6">
        <div class="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
             style="border-color:#2C7A5E;border-top-color:transparent"></div>
      </div>
    } @else if (!campaign()) {
      <div class="flex flex-col items-center justify-center min-h-screen" style="background:#F5F7F6">
        <p style="font-family:'Playfair Display',Georgia,serif;font-size:1.25rem;font-weight:700;color:#0A1F1A">
          Annonce introuvable
        </p>
        <p style="font-family:Inter,sans-serif;color:#9CA3AF;margin-top:.5rem">
          Cette annonce n'existe pas ou n'est plus disponible.
        </p>
        <a routerLink="/"
           class="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
           style="background:#1B4438;font-family:Inter,sans-serif">
          Retour à l'accueil
        </a>
      </div>
    } @else {
      <div style="background:#F5F7F6;min-height:100vh">

        <!-- Barre de navigation publique -->
        <header class="sticky top-0 z-50 px-6 py-3 flex items-center justify-between bg-white"
                style="border-bottom:1px solid #F0F0F0">
          <div class="flex items-center gap-2">
            <img src="/assets/logo.png" alt="Baileo" style="height:1.5rem;width:auto"/>
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:.9375rem;color:#0A1F1A">
              BAILEO
            </span>
          </div>
          <div class="flex items-center gap-3">
            <a href="#" (click)="$event.preventDefault()"
               style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">
              Une question ?
            </a>
            <button type="button" (click)="contactOwner()" [disabled]="contacting()"
               class="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
               style="background:#1B4438;font-family:Inter,sans-serif;border:none;cursor:pointer">
              {{ contacting() ? 'Ouverture...' : 'Contacter le propriétaire' }}
            </button>
          </div>
        </header>

        <!-- Hero : galerie photos -->
        <div style="background:#0A1F1A;position:relative">
          @if (campaign()!.photos?.length) {
            <img [src]="activePhoto()"
                 class="hero-img"
                 [alt]="campaign()!.title"
                 style="object-position:center"/>
          } @else {
            <div class="hero-img flex items-center justify-center"
                 style="background:linear-gradient(135deg,#1B4438,#0A1F1A)">
              <svg class="w-20 h-20 opacity-20" fill="none" viewBox="0 0 24 24"
                   stroke="white" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"/>
              </svg>
            </div>
          }

          <!-- Badge type -->
          <div class="absolute top-4 left-4">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style="background:rgba(0,0,0,.5);color:white;backdrop-filter:blur(4px);font-family:Inter,sans-serif">
              {{ campaign()!.propertyType === 'apartment' ? 'Appartement' : campaign()!.propertyType }}
            </span>
          </div>

          <!-- Compteur photos -->
          @if ((campaign()!.photos?.length ?? 0) > 1) {
            <button type="button" (click)="showAllPhotos = !showAllPhotos"
                    class="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style="background:rgba(0,0,0,.55);color:white;backdrop-filter:blur(4px);font-family:Inter,sans-serif">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
              </svg>
              Voir toutes les photos ({{ campaign()!.photos!.length }})
            </button>
          }
        </div>

        <!-- Miniatures -->
        @if ((campaign()!.photos?.length ?? 0) > 1) {
          <div class="flex gap-2 px-6 py-3 overflow-x-auto bg-white"
               style="border-bottom:1px solid #F0F0F0">
            @for (p of campaign()!.photos!; track p; let i = $index) {
              <img [src]="p" [alt]="'Photo ' + (i + 1)"
                   class="thumb"
                   [class.active]="activePhotoIdx() === i"
                   (click)="activePhotoIdx.set(i)"/>
            }
          </div>
        }

        <!-- Body principal + sidebar -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-6 py-8">

          <!-- Contenu principal (2/3) -->
          <div class="lg:col-span-2 space-y-8">

            <!-- Titre + specs -->
            <div>
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:2rem;color:#0A1F1A;letter-spacing:-.03em;line-height:1.15">
                {{ campaign()!.title }}
              </h1>
              @if (campaign()!.subtitle) {
                <p style="font-size:1.0625rem;color:#6B7280;margin-top:.375rem;font-family:Inter,sans-serif">
                  {{ campaign()!.subtitle }}
                </p>
              }

              <!-- Chips specs -->
              <div class="flex flex-wrap gap-2 mt-4">
                @if (campaign()!.surface) {
                  <span class="icon-chip">
                    <svg class="w-4 h-4" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>
                    </svg>
                    {{ campaign()!.surface }} m²
                  </span>
                }
                @if (campaign()!.rooms) {
                  <span class="icon-chip">
                    <svg class="w-4 h-4" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"/>
                    </svg>
                    {{ campaign()!.rooms }} pièce{{ campaign()!.rooms! > 1 ? 's' : '' }}
                  </span>
                }
                @if (campaign()!.bedrooms) {
                  <span class="icon-chip">{{ campaign()!.bedrooms }} chambre{{ campaign()!.bedrooms! > 1 ? 's' : '' }}</span>
                }
                @if (campaign()!.bathrooms) {
                  <span class="icon-chip">{{ campaign()!.bathrooms }} salle{{ campaign()!.bathrooms! > 1 ? 's' : '' }} de bain</span>
                }
                @if (campaign()!.floor !== null && campaign()!.floor !== undefined) {
                  <span class="icon-chip">{{ campaign()!.floor }}e étage</span>
                }
              </div>
            </div>

            <!-- 4 points forts (comme la maquette Image 13) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-2xl"
                 style="border:1.5px solid #F0F0F0">
              @for (pt of keyPoints(); track pt.title) {
                <div class="text-center p-2">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                       style="background:#E0EDE8">
                    <svg class="w-5 h-5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="pt.icon"/>
                    </svg>
                  </div>
                  <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ pt.title }}
                  </p>
                  <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif;line-height:1.4">
                    {{ pt.desc }}
                  </p>
                </div>
              }
            </div>

            <!-- Description -->
            @if (campaign()!.description) {
              <div class="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.125rem;color:#0A1F1A;margin-bottom:.75rem">
                    À propos du logement
                  </h2>
                  <p style="font-size:.9375rem;color:#374151;line-height:1.75;font-family:Inter,sans-serif;white-space:pre-wrap">
                    {{ campaign()!.description }}
                  </p>
                </div>
                <!-- Infos pratiques + carte placeholder -->
                <div>
                  <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.125rem;color:#0A1F1A;margin-bottom:.75rem">
                    Localisation
                  </h2>
                  <p style="font-size:.9375rem;color:#6B7280;font-family:Inter,sans-serif">
                    {{ campaign()!.address }}
                  </p>
                  <!-- Carte placeholder stylée -->
                  <div class="mt-3 rounded-xl overflow-hidden"
                       style="height:140px;background:linear-gradient(135deg,#E0EDE8,#C8DDD7);display:flex;align-items:center;justify-content:center">
                    <div class="text-center">
                      <svg class="w-8 h-8 mx-auto mb-1" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                      </svg>
                      <p style="font-size:.75rem;color:#2C7A5E;font-family:Inter,sans-serif">Voir le quartier</p>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Équipements -->
            @if (campaign()!.amenities?.length) {
              <div>
                <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.125rem;color:#0A1F1A;margin-bottom:.75rem">
                  Équipements
                </h2>
                <div class="flex flex-wrap gap-2">
                  @for (a of campaign()!.amenities!; track a) {
                    <span class="icon-chip">
                      <svg class="w-3.5 h-3.5" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ amenityLabel(a) }}
                    </span>
                  }
                </div>
              </div>
            }

            <!-- Conditions + Documents requis -->
            <div class="grid md:grid-cols-2 gap-8">
              <div>
                <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.125rem;color:#0A1F1A;margin-bottom:.75rem">
                  Conditions de location
                </h2>
                <div class="space-y-2.5">
                  @for (c of conditions(); track c.label) {
                    <div class="flex justify-between items-center py-1.5"
                         style="border-bottom:1px solid #F5F7F6">
                      <span style="font-size:.9375rem;color:#6B7280;font-family:Inter,sans-serif">{{ c.label }}</span>
                      <span style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ c.value }}</span>
                    </div>
                  }
                </div>
              </div>

              <div>
                <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.125rem;color:#0A1F1A;margin-bottom:.75rem">
                  Documents demandés
                </h2>
                <div class="space-y-2">
                  @for (d of campaign()!.documentsRequired!; track d) {
                    <div class="flex items-center gap-2.5">
                      <svg class="w-4 h-4 shrink-0" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span style="font-size:.9375rem;color:#374151;font-family:Inter,sans-serif">{{ docLabel(d) }}</span>
                    </div>
                  }
                </div>
                <div class="mt-4 p-3 rounded-xl" style="background:#F0F9F5;border:1px solid #E0EDE8">
                  <div class="flex items-start gap-2">
                    <svg class="w-4 h-4 mt-0.5 shrink-0" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                    </svg>
                    <p style="font-size:.8125rem;color:#1B4438;font-family:Inter,sans-serif;line-height:1.5">
                      Votre Rental Passport vous permet de remplir votre dossier une seule fois
                      et de l'utiliser pour toutes vos candidatures.
                      <a routerLink="/inscription"
                         style="font-weight:700;text-decoration:underline">En savoir plus →</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Informations pratiques enrichies (maquette 14 : DPE, GES, étage...) -->
        @if (campaign()!.dpe || campaign()!.ges || campaign()!.floor !== null || campaign()!.heatingType || campaign()!.extras?.length) {
          <div class="card p-5" style="margin-bottom:1.25rem">
            <h3 style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
              Informations pratiques
            </h3>
            <div class="grid grid-cols-2 gap-x-8 gap-y-2.5">
              @if (campaign()!.dpe) {
                <div class="flex items-center justify-between">
                  <span style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">DPE</span>
                  <span class="px-2 py-0.5 rounded-md" [style.background]="energyColor(campaign()!.dpe!) + '22'"
                        [style.color]="energyColor(campaign()!.dpe!)"
                        style="font-size:.8125rem;font-weight:800;font-family:Inter,sans-serif">{{ campaign()!.dpe }}</span>
                </div>
              }
              @if (campaign()!.ges) {
                <div class="flex items-center justify-between">
                  <span style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">GES</span>
                  <span class="px-2 py-0.5 rounded-md" [style.background]="energyColor(campaign()!.ges!) + '22'"
                        [style.color]="energyColor(campaign()!.ges!)"
                        style="font-size:.8125rem;font-weight:800;font-family:Inter,sans-serif">{{ campaign()!.ges }}</span>
                </div>
              }
              @if (campaign()!.floor !== null && campaign()!.floor !== undefined) {
                <div class="flex items-center justify-between">
                  <span style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">Étage</span>
                  <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                    {{ campaign()!.floor === 0 ? 'Rez-de-chaussée' : campaign()!.floor }}{{ campaign()!.hasElevator ? ' · Ascenseur' : '' }}
                  </span>
                </div>
              }
              @if (campaign()!.heatingType) {
                <div class="flex items-center justify-between">
                  <span style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">Chauffage</span>
                  <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ heatingLabel(campaign()!.heatingType!) }}</span>
                </div>
              }
              @for (ex of campaign()!.extras ?? []; track ex.label) {
                <div class="flex items-center justify-between">
                  <span style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif">{{ ex.label }}</span>
                  <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;text-align:right">{{ ex.value }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Profil public du propriétaire (RGPD : données minimisées) -->
        @if (campaign()!.owner) {
          <div class="card p-5" style="margin-bottom:1.25rem">
            <h3 style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
              Votre propriétaire
            </h3>
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                   style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                <span style="font-size:1rem;font-weight:700;color:white;font-family:Inter,sans-serif">
                  {{ campaign()!.owner!.name.charAt(0) }}
                </span>
              </div>
              <div class="min-w-0">
                <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                  {{ campaign()!.owner!.name }}
                </p>
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                  Membre depuis {{ ownerSince() }}
                  · {{ campaign()!.owner!.activeCampaigns }} annonce{{ campaign()!.owner!.activeCampaigns > 1 ? 's' : '' }} active{{ campaign()!.owner!.activeCampaigns > 1 ? 's' : '' }}
                </p>
                @if (campaign()!.owner!.responseTime) {
                  <p class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg"
                     style="font-size:.6875rem;font-weight:700;background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
                    </svg>
                    {{ campaign()!.owner!.responseTime }}
                  </p>
                }
                @if (campaign()!.owner!.bio) {
                  <p style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif;margin-top:.5rem;line-height:1.6">
                    {{ campaign()!.owner!.bio }}
                  </p>
                }
                <button type="button" (click)="contactOwner()"
                        class="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;cursor:pointer;font-family:Inter,sans-serif">
                  Poser une question
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Quartier : carte embed sans clé API (RGPD : adresse publique = éventuellement ville seule) -->
        <div class="card p-5" style="margin-bottom:1.25rem">
          <h3 style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
            Le quartier
          </h3>
          <div class="rounded-xl overflow-hidden" style="border:1.5px solid #F0F0F0">
            <iframe [src]="mapUrl()" width="100%" height="280" style="border:0;display:block"
                    loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                    title="Carte du quartier"></iframe>
          </div>
          @if (!campaign()!.preciseAddress) {
            <p class="flex items-center gap-1.5" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.5rem">
              <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
              </svg>
              L'adresse exacte sera communiquée après validation de votre dossier.
            </p>
          }
        </div>

        <!-- Comment ça marche -->
            <div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.125rem;color:#0A1F1A;margin-bottom:1rem">
                Comment ça marche ?
              </h2>
              <div class="flex flex-col md:flex-row gap-4">
                @for (step of howItWorks; track step.num) {
                  <div class="flex items-start gap-3 flex-1">
                    <div class="step-num">{{ step.num }}</div>
                    <div>
                      <p style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ step.title }}</p>
                      <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.25rem;line-height:1.4">{{ step.desc }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Sidebar sticky : CTA + Prix -->
          <div class="lg:col-span-1">
            <div #ctaBlock data-cta class="sticky top-20 bg-white rounded-2xl p-5 space-y-4"
                 style="border:1.5px solid #E5E7EB;box-shadow:0 8px 32px rgba(10,31,26,.08)">

              <!-- Localisation -->
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" style="color:#9CA3AF" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                </svg>
                <span style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ campaign()!.address }}</span>
              </div>

              <!-- Prix -->
              <div>
                <p style="font-family:'Playfair Display',Georgia,serif;font-size:1.875rem;font-weight:800;color:#0A1F1A;line-height:1">
                  {{ campaign()!.rent | number:'1.0-0' }} €<span style="font-size:1rem;font-weight:400;color:#9CA3AF"> / mois</span>
                </p>
                <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.25rem">
                  Charges : {{ campaign()!.charges }} € / mois
                </p>
              </div>

              <!-- Dispo -->
              @if (campaign()!.availableAt) {
                <div class="flex items-center gap-2 py-2"
                     style="border-top:1px solid #F5F7F6;border-bottom:1px solid #F5F7F6">
                  <svg class="w-4 h-4 shrink-0" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                  </svg>
                  <span style="font-size:.875rem;color:#374151;font-family:Inter,sans-serif">
                    Disponible à partir du <b>{{ formatDate(campaign()!.availableAt!) }}</b>
                  </span>
                </div>
              }

              <!-- CTA principal : connecté → dépôt direct ; sinon inscription avec retour -->
              @if (isLoggedIn()) {
                <a [routerLink]="['/campagnes', campaign()!.id, 'postuler']"
                   class="block w-full py-3.5 rounded-xl font-bold text-white text-center transition-all hover:-translate-y-px hover:shadow-lg"
                   style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif;font-size:.9375rem">
                  Déposer mon dossier
                </a>
              } @else {
                <a routerLink="/inscription" [queryParams]="{redirect: '/campagnes/' + campaign()!.id + '/postuler'}"
                   class="block w-full py-3.5 rounded-xl font-bold text-white text-center transition-all hover:-translate-y-px hover:shadow-lg"
                   style="background:linear-gradient(135deg,#1B4438,#0A1F1A);font-family:Inter,sans-serif;font-size:.9375rem">
                  Déposer mon dossier
                </a>
                <p style="text-align:center;font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif;margin-top:.5rem">
                  Déjà un compte ?
                  <a routerLink="/connexion" [queryParams]="{redirect: '/campagnes/' + campaign()!.id + '/postuler'}"
                     style="color:#2C7A5E;font-weight:600">Se connecter</a>
                </p>
              }
              <p style="text-align:center;font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                <svg class="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                Candidature sécurisée et 100% gratuite
              </p>

              <!-- Stats du dossier -->
              <div class="pt-2 space-y-1" style="border-top:1px solid #F5F7F6">
                <div class="flex justify-between">
                  <span style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">Dépôt de garantie</span>
                  <span style="font-size:.8125rem;font-weight:600;color:#374151;font-family:Inter,sans-serif">{{ campaign()!.deposit | number:'1.0-0' }} €</span>
                </div>
                <div class="flex justify-between">
                  <span style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">Durée minimum</span>
                  <span style="font-size:.8125rem;font-weight:600;color:#374151;font-family:Inter,sans-serif">{{ campaign()!.minDuration }} mois</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-12 py-8 text-center" style="background:#0A1F1A">
          <div class="flex items-center justify-center gap-2 mb-3">
            <img src="/assets/logo.png" alt="Baileo" style="height:1.25rem;filter:brightness(0) invert(1)"/>
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:.875rem;color:white">BAILEO</span>
          </div>
          <p style="font-size:.8125rem;color:rgba(255,255,255,.4);font-family:Inter,sans-serif">
            Votre dossier est sécurisé et visible uniquement par le propriétaire.
            Aucune donnée n'est partagée avec des tiers.
          </p>
          <div class="flex items-center justify-center gap-4 mt-3">
            @for (link of ['Comment ça marche','Sécurité & confidentialité','FAQ','Contact']; track link) {
              <a href="#" style="font-size:.75rem;color:rgba(255,255,255,.3);font-family:Inter,sans-serif">{{ link }}</a>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class CampaignPublicComponent implements OnInit {
  private cachedMapUrl: SafeResourceUrl | null = null;
  private cachedMapAddr = '';

  /** Carte Google Maps en iframe embed — AUCUNE clé API requise. */
  mapUrl(): SafeResourceUrl {
    const addr = this.campaign()?.address ?? '';
    if (addr !== this.cachedMapAddr || !this.cachedMapUrl) {
      this.cachedMapAddr = addr;
      const q = encodeURIComponent(addr || 'Marseille, France');
      this.cachedMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://maps.google.com/maps?q=${q}&z=15&output=embed`
      );
    }
    return this.cachedMapUrl;
  }

  isLoggedIn(): boolean { return !!this.auth.currentUser(); }

  contacting = signal(false);

  energyColor(letter: string): string {
    const map: Record<string, string> = { A: '#1B8354', B: '#4CAF50', C: '#CDDC39', D: '#FFC107', E: '#FF9800', F: '#FF5722', G: '#D32F2F' };
    return map[letter] ?? '#6B7280';
  }

  heatingLabel(t: string): string {
    const map: Record<string, string> = {
      individuel_gaz: 'Individuel gaz', individuel_electrique: 'Individuel électrique',
      collectif: 'Collectif', pompe_chaleur: 'Pompe à chaleur', autre: 'Autre',
    };
    return map[t] ?? t;
  }

  ownerSince(): string {
    const ms = this.campaign()?.owner?.memberSince;
    if (!ms) return '';
    const [y, m] = ms.split('-');
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return `${months[parseInt(m, 10) - 1] ?? ''} ${y}`;
  }

  /**
   * « Contacter le propriétaire » :
   *  - connecté candidat → ouvre (ou crée) la conversation, SANS dossier requis
   *  - non connecté → connexion/inscription puis retour ici avec ?contact=1
   */
  contactOwner(): void {
    const c = this.campaign(); if (!c) return;
    if (!this.isLoggedIn()) {
      this.router.navigate(['/connexion'], {
        queryParams: { redirect: `/annonces/${c.slug || c.id}?contact=1` },
      });
      return;
    }
    this.contacting.set(true);
    this.http.post<{ mode: 'application' | 'thread'; applicationId: string | null; campaignId: string }>(
      `${this.apiBase()}/api/campaigns/${c.id}/contact`, {}
    ).subscribe({
      next: (res) => {
        this.contacting.set(false);
        // Candidature existante → sa conversation ; sinon → fil de contact
        // (contacter ne crée JAMAIS de candidature — spec Phase 2)
        if (res.mode === 'application' && res.applicationId) {
          this.router.navigate(['/messages'], { queryParams: { application: res.applicationId } });
        } else {
          this.router.navigate(['/messages'], { queryParams: { thread: res.campaignId } });
        }
      },
      error: (e) => {
        this.contacting.set(false);
        alert(e?.error?.error || 'Impossible d\'ouvrir la conversation. Vérifiez que vous êtes connecté avec un compte candidat.');
      },
    });
  }

  private apiBase(): string {
    return environment.apiUrl.endsWith('/api')
      ? environment.apiUrl.slice(0, -4)
      : environment.apiUrl.replace(/\/api\/.*$/, '');
  }

  campaign       = signal<PublicCampaign | null>(null);
  loading        = signal(true);
  activePhotoIdx = signal(0);
  showAllPhotos  = false;

  activePhoto = () => this.campaign()?.photos?.[this.activePhotoIdx()] ?? '';

  howItWorks = [
    { num: 1, title: 'Déposez votre dossier',  desc: 'Remplissez votre Rental Passport et ajoutez vos documents.' },
    { num: 2, title: 'Dossier transmis',        desc: 'Votre dossier est envoyé au propriétaire en toute sécurité.' },
    { num: 3, title: 'Étude du dossier',        desc: 'Le propriétaire étudie votre dossier et peut vous contacter.' },
    { num: 4, title: 'Visite',                  desc: 'Si votre dossier est sélectionné, vous êtes invité à visiter.' },
    { num: 5, title: 'Décision',                desc: 'Vous recevez la décision du propriétaire directement ici.' },
  ];

  constructor(private route: ActivatedRoute, private http: HttpClient, private auth: AuthService, private sanitizer: DomSanitizer, private router: Router) {}

  ngOnInit(): void {
    // Retour de connexion avec intention de contact → ouvrir la conversation dès que possible
    if (this.route.snapshot.queryParamMap.get('contact') === '1') {
      const wait = setInterval(() => {
        if (this.campaign() && this.auth.currentUser()) {
          clearInterval(wait);
          this.contactOwner();
        }
        if (this.campaign() && this.auth.sessionRestored() && !this.auth.currentUser()) {
          clearInterval(wait); // non connecté : on laisse la page publique
        }
      }, 300);
      setTimeout(() => clearInterval(wait), 8000); // garde-fou
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    // Construire l'URL de base sans dupliquer '/api'
    const baseUrl = environment.apiUrl.endsWith('/api')
      ? environment.apiUrl.slice(0, -4)
      : environment.apiUrl.replace(/\/api\/.*$/, '');
    this.http.get<PublicCampaign>(`${baseUrl}/api/annonces/${id}`).subscribe({
      next:  (c) => { this.campaign.set(c); this.loading.set(false); },
      error: () => { this.campaign.set(null); this.loading.set(false); },
    });
  }

  keyPoints() {
    const c = this.campaign()!;
    return [
      { icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25', title: 'Un beau logement', desc: c.surface ? `${c.surface} m² — ${c.rooms} pièces` : 'Voir les détails' },
      { icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z', title: 'Emplacement idéal', desc: c.address.split(',').slice(1).join(',').trim() || c.address },
      { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', title: 'Dossier simplifié', desc: 'Un seul dossier, partagé avec le propriétaire.' },
      { icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', title: 'Suivi en temps réel', desc: 'Suivez l\'avancement de votre candidature à chaque étape.' },
    ];
  }

  conditions() {
    const c = this.campaign()!;
    const typeLabel: Record<string, string> = { empty: 'Vide', furnished: 'Meublé', colocation: 'Colocation' };
    return [
      { label: 'Loyer mensuel',      value: `${c.rent} €` },
      { label: 'Charges mensuelles', value: `${c.charges} €` },
      { label: 'Dépôt de garantie', value: `${c.deposit} €` },
      { label: 'Type de bail',       value: typeLabel[c.rentalType] ?? c.rentalType },
      { label: 'Durée minimale',     value: `${c.minDuration} mois` },
    ];
  }

  amenityLabel(a: string): string { return AMENITY_LABELS[a] ?? a; }
  docLabel(d: string): string     { return DOC_LABELS[d] ?? d; }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  scrollToCta(): void {
    // Sur desktop: sidebar sticky visible → scroller en haut
    // Sur mobile: scroller vers le bloc CTA
    const ctaEl = document.querySelector('[data-cta]');
    if (ctaEl) {
      ctaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
