import { Component, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  styles: [`
    .process-card { background:white; border:1px solid #E3EAE5; border-radius:26px; padding:22px 18px; width:150px; transition:transform .3s ease, box-shadow .3s ease; }
    .process-card:hover { transform:translateY(-6px) rotateX(4deg); box-shadow:0 16px 32px rgba(10,31,26,.10); }
    .actor-card { transition:transform .35s ease, box-shadow .35s ease; }
    .actor-card:hover { transform:translateY(-6px) scale(1.01); box-shadow:0 24px 48px rgba(0,0,0,.35); }
  `],
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="font-family:'Inter',sans-serif;overflow-x:hidden">

      <!-- ╔══════════════════════════════════════╗
           ║  NAVIGATION                           ║
           ╚══════════════════════════════════════╝ -->
      <nav class="fixed top-0 left-0 right-0 z-50"
           style="background:rgba(255,255,255,0.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(14,42,37,0.06)">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          <a routerLink="/" class="flex items-center gap-3">
            <img src="assets/logo.png" alt="Baileo" style="height:2.75rem;width:auto;display:block">
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.375rem;color:#0A1F1A;letter-spacing:-0.04em">BAILEO</span>
          </a>

          <div class="hidden md:flex items-center gap-8">
            <a href="#features" class="text-sm font-medium transition-colors hover:text-baileo-forest" style="color:#6B7280">Fonctionnalités</a>
            <a href="#ranking" class="text-sm font-medium transition-colors hover:text-baileo-forest" style="color:#6B7280">Le workflow</a>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/connexion"
               class="hidden md:block text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-gray-50"
               style="color:#0A1F1A">Se connecter</a>
            <a routerLink="/inscription"
               class="text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:shadow-lg hover:-translate-y-px"
               style="background:linear-gradient(135deg,#1B4438,#0A1F1A)">
              Commencer
            </a>
          </div>
        </div>
      </nav>

      <!-- ╔══════════════════════════════════════╗
           ║  HERO — Dark premium                  ║
           ╚══════════════════════════════════════╝ -->
      <section class="relative min-h-screen flex items-center pt-16 overflow-hidden"
               style="background:linear-gradient(135deg, #0B2118 0%, #0A1F1A 40%, #163D30 70%, #0A1F1A 100%)">

        <!-- Cercles décoratifs lumineux -->
        <div class="absolute -top-40 -right-40 rounded-full animate-float-slow"
             style="width:600px;height:600px;background:radial-gradient(circle,rgba(56,184,138,0.12) 0%,transparent 70%)">
        </div>
        <div class="absolute -bottom-20 -left-20 rounded-full animate-float"
             style="width:400px;height:400px;background:radial-gradient(circle,rgba(56,184,138,0.08) 0%,transparent 70%)">
        </div>

        <!-- Grille décorative -->
        <div class="absolute inset-0 opacity-5"
             style="background-image:linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px);background-size:60px 60px"></div>

        <div class="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <!-- Texte -->
          <div class="animate-fade-up">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
                 style="background:rgba(56,184,138,0.15);border:1px solid rgba(56,184,138,0.3)">
              <div class="w-1.5 h-1.5 rounded-full" style="background:#2C7A5E"></div>
              <span class="text-xs font-bold tracking-widest uppercase" style="color:#2C7A5E">Le workflow locatif de A à Z</span>
            </div>

            <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:clamp(3rem,6vw,5rem);line-height:1.0;margin-bottom:1.5rem;color:white;letter-spacing:-0.03em">
              Louez mieux.<br/>
              <span style="background:linear-gradient(135deg,#2C7A5E,#5ECFAA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                Suivez tout.
              </span>
            </h1>

            <p class="text-lg mb-10 leading-relaxed animate-fade-up delay-100"
               style="color:rgba(255,255,255,0.6);max-width:28rem">
              Baileo centralise candidatures, documents, messages, visites et décisions
              dans un espace clair, sécurisé et partagé entre propriétaires, candidats
              et professionnels de la location. Fini les mails, SMS et fichiers dispersés.
            </p>

            <ul class="space-y-3 mb-10 animate-fade-up delay-200">
              @for (item of heroFeatures; track item) {
                <li class="flex items-center gap-3 text-sm font-medium" style="color:rgba(255,255,255,0.8)">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                       style="background:rgba(56,184,138,0.2)">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#2C7A5E" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  {{ item }}
                </li>
              }
            </ul>

            <div class="flex flex-wrap gap-4 animate-fade-up delay-300">
              <a routerLink="/inscription"
                 class="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-1 hover:shadow-2xl"
                 style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                Demander une démo
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
              </a>
              <a routerLink="/connexion"
                 class="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-sm transition-all hover:-translate-y-1"
                 style="border:1.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.8)">
                Voir le produit
              </a>
            </div>

            <div class="flex items-center gap-6 mt-8 animate-fade-up delay-400">
              <p class="text-xs" style="color:rgba(255,255,255,0.3)">
                <svg class="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                Aucune carte bancaire
              </p>
              <p class="text-xs" style="color:rgba(255,255,255,0.3)">
                <svg class="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Démo en 2 minutes
              </p>
            </div>
          </div>

          <!-- Product card 3D -->
          <div class="relative animate-fade-up delay-200">
            <div class="animate-float"
                 style="transform-style:preserve-3d;perspective:1000px">
              <div class="rounded-2xl overflow-hidden"
                   style="background:#0E1F1A;border:1px solid rgba(255,255,255,0.08);box-shadow:0 40px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(56,184,138,0.1)">

                <!-- Barre de fenêtre -->
                <div class="flex items-center gap-2 px-4 py-3" style="border-bottom:1px solid rgba(255,255,255,0.06)">
                  <div class="flex gap-1.5">
                    <div class="w-3 h-3 rounded-full" style="background:#FF5F57"></div>
                    <div class="w-3 h-3 rounded-full" style="background:#FEBC2E"></div>
                    <div class="w-3 h-3 rounded-full" style="background:#28C840"></div>
                  </div>
                  <div class="flex-1 rounded-md h-5 mx-4" style="background:rgba(255,255,255,0.04)"></div>
                </div>

                <!-- Dashboard -->
                <div class="flex" style="min-height:340px">
                  <!-- Sidebar -->
                  <div class="w-44 p-3" style="border-right:1px solid rgba(255,255,255,0.06)">
                    <div class="flex items-center gap-2 px-2 py-2.5 mb-4">
                      <img src="assets/logo.png" alt="" class="h-5 w-auto opacity-90" />
                      <span class="text-white text-xs font-black tracking-tight">BAILEO</span>
                    </div>
                    @for (item of sidebarItems; track item.label) {
                      <div class="flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 text-xs font-medium transition-colors"
                           [style.background]="item.active ? 'rgba(56,184,138,0.15)' : 'transparent'"
                           [style.color]="item.active ? '#2C7A5E' : 'rgba(255,255,255,0.35)'"
                      >
                        <div class="w-3.5 h-3.5 rounded-sm shrink-0" [style.background]="item.active ? 'rgba(56,184,138,0.3)' : 'rgba(255,255,255,0.08)'"></div>
                        {{ item.label }}
                      </div>
                    }
                  </div>

                  <!-- Main -->
                  <div class="flex-1 p-5">
                    <p class="text-white text-sm font-bold mb-4">Bonjour Marie</p>
                    <div class="grid grid-cols-3 gap-2 mb-5">
                      @for (stat of dashStats; track stat.label) {
                        <div class="rounded-xl p-3" style="background:rgba(255,255,255,0.04)">
                          <p class="text-xs mb-1" style="color:rgba(255,255,255,0.35)">{{ stat.label }}</p>
                          <p class="text-lg font-black text-white">{{ stat.value }}</p>
                          <p class="text-xs font-medium" style="color:#2C7A5E">{{ stat.trend }}</p>
                        </div>
                      }
                    </div>
                    <div class="rounded-xl p-3" style="background:rgba(255,255,255,0.04)">
                      <p class="text-xs font-bold mb-3" style="color:rgba(255,255,255,0.6)">Campagnes actives</p>
                      @for (c of campaigns; track c.name) {
                        <div class="flex items-center justify-between py-2" style="border-bottom:1px solid rgba(255,255,255,0.04)">
                          <span class="text-xs" style="color:rgba(255,255,255,0.5)">{{ c.name }}</span>
                          <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                                [style.color]="c.color" [style.background]="c.color + '22'">{{ c.score }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Badge flottant -->
            <div class="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-3 shadow-2xl animate-float-slow flex items-center gap-3"
                 style="border:1px solid rgba(56,184,138,0.15)">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:#E0EDE8">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#2C7A5E" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
                </svg>
              </div>
              <div>
                <p class="text-xs font-bold" style="color:#0A1F1A">+26% de candidatures</p>
                <p class="text-xs" style="color:#9CA3AF">Cette semaine</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Transition vers section suivante -->
        <div class="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
             style="background:linear-gradient(to bottom,transparent,#F7F9F7)"></div>
      </section>

      <!-- ╔══════════════════════════════════════╗
           ║  RANKING CENTER                       ║
           ╚══════════════════════════════════════╝ -->
      <section id="ranking" style="background:white;padding:6rem 1.5rem">
        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          <!-- Card -->
          <div class="rounded-2xl overflow-hidden" style="box-shadow:0 1px 3px rgba(0,0,0,0.06),0 20px 60px rgba(0,0,0,0.06);border:1px solid #F0F0F0">
            <div class="px-6 py-4 flex items-center justify-between" style="border-bottom:1px solid #F5F5F5;background:#FAFAFA">
              <div>
                <p class="text-sm font-bold" style="color:#0A1F1A">Suivi des candidatures</p>
                <p class="text-xs mt-0.5" style="color:#9CA3AF">T3 lumineux · Prado, Marseille</p>
              </div>
              <button class="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-gray-100"
                      style="color:#6B7280;border:1px solid #E5E7EB">Exporter</button>
            </div>
            <div class="divide-y" style="divide-color:#F9F9F9">
              @for (c of rankingCandidates; track c.name) {
                <div class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                         [style.background]="c.rankColor">{{ c.rank }}</div>
                    <div>
                      <p class="text-sm font-bold" style="color:#0A1F1A">{{ c.name }}</p>
                      <p class="text-xs mt-0.5" style="color:#9CA3AF">{{ c.info }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black" style="color:#0A1F1A">{{ c.score }}<span class="text-xs font-normal" style="color:#CBD5E1">/100</span></p>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background:#E0EDE8;color:#1B4438">Très compatible</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Texte -->
          <div>
            <p class="text-xs font-bold tracking-widest uppercase mb-4" style="color:#2C7A5E;letter-spacing:0.18em">
              Le cœur de Baileo
            </p>
            <h2 class="font-black leading-tight mb-5" style="font-size:clamp(2rem,4vw,2.75rem);color:#0A1F1A;letter-spacing:-0.03em">
              Un parcours clair,<br/>des deux côtés
            </h2>
            <p class="text-base leading-relaxed mb-8" style="color:#6B7280;max-width:26rem">
              Le propriétaire sait quoi faire. Le candidat sait où il en est.
              Chaque candidature devient un parcours traçable : documents vérifiés,
              visites planifiées, décision notifiée — sans jamais exposer vos notes privées.
            </p>
            <ul class="space-y-3 mb-10">
              @for (f of rankingFeatures; track f) {
                <li class="flex items-center gap-3 text-sm font-medium" style="color:#374151">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:#E0EDE8">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#2C7A5E" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  {{ f }}
                </li>
              }
            </ul>
            <a href="#" class="inline-flex items-center gap-2 text-sm font-bold transition-colors hover:text-baileo-mint"
               style="color:#0A1F1A">
              Découvrir le workflow
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      <!-- ╔══════════════════════════════════════╗
           ║  SECTION 4 — PROCESSUS / WORKFLOW     ║
           ╚══════════════════════════════════════╝ -->
      <section id="processus" style="background:#F7F8F4;padding:90px 1.5rem">
        <div class="mx-auto text-center" style="max-width:1180px">
          <p style="font-size:.6875rem;font-weight:800;letter-spacing:.12em;color:#2C7A5E;font-family:Inter,sans-serif">LE CŒUR DE BAILEO</p>
          <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:clamp(2rem,4vw,3rem);color:#0A1F1A;margin:.5rem 0 1rem">
            Un parcours clair pour chaque candidature
          </h2>
          <p class="mx-auto" style="font-size:1rem;color:#6B7280;font-family:Inter,sans-serif;max-width:42rem;margin-bottom:3.5rem">
            Chaque dossier avance étape par étape, de la réception de la candidature jusqu'à la
            signature du bail. Le propriétaire garde le contrôle. Le candidat sait toujours où il en est.
          </p>

          <!-- Timeline horizontale 6 étapes -->
          <div class="flex flex-wrap justify-center items-stretch gap-y-8" style="position:relative">
            @for (step of processSteps; track step.n; let i = $index) {
              <div class="flex items-center">
                <div class="process-card animate-fade-up" [style.animation-delay]="(i * 0.1) + 's'">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2.5" style="background:#EAF4EE">
                    <span [innerHTML]="step.icon"></span>
                  </div>
                  <p style="font-size:13px;font-weight:800;color:#2C7A5E;font-family:Inter,sans-serif">{{ step.n }}</p>
                  <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin:.25rem 0">{{ step.title }}</p>
                  <p style="font-size:12px;color:#9CA3AF;font-family:Inter,sans-serif;line-height:1.45">{{ step.desc }}</p>
                </div>
                @if (i < processSteps.length - 1) {
                  <div class="hidden lg:block" style="width:2.25rem;border-top:2px dashed #BFDCCB;margin:0 .25rem"></div>
                }
              </div>
            }
          </div>

          <a href="#features" class="inline-block mt-12" style="font-size:.9375rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif;text-decoration:none">
            Découvrir le workflow complet →
          </a>
        </div>
      </section>

      <!-- ╔══════════════════════════════════════╗
           ║  SECTION 6 — ACTEURS DE LA LOCATION   ║
           ╚══════════════════════════════════════╝ -->
      <section id="acteurs" style="background:#061F1A;padding:90px 1.5rem">
        <div class="mx-auto" style="max-width:1180px">
          <p class="text-center mb-12" style="font-size:.6875rem;font-weight:800;letter-spacing:.12em;color:#5ECFAA;font-family:Inter,sans-serif">
            CONÇU POUR TOUS LES ACTEURS DE LA LOCATION
          </p>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            @for (a of actors; track a.title) {
              <div class="actor-card" style="background:#0B2B24;border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px;min-height:300px;position:relative;overflow:hidden">
                <img [src]="a.img" alt="" loading="lazy"
                     (error)="hideImg($event)"
                     style="position:absolute;right:-1rem;bottom:0;height:82%;object-fit:cover;object-position:top;opacity:.9;-webkit-mask-image:linear-gradient(to left, black 55%, transparent 100%);mask-image:linear-gradient(to left, black 55%, transparent 100%)"/>
                <div style="position:relative;z-index:1;max-width:70%">
                  <h3 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.375rem;color:white;margin-bottom:.625rem">{{ a.title }}</h3>
                  <p style="font-size:.8125rem;color:rgba(255,255,255,0.65);font-family:Inter,sans-serif;line-height:1.55;margin-bottom:1rem">{{ a.text }}</p>
                  <ul style="list-style:none;padding:0;margin:0 0 1rem">
                    @for (b of a.bullets; track b) {
                      <li class="flex items-center gap-2 mb-1.5" style="font-size:.8125rem;color:rgba(255,255,255,0.85);font-family:Inter,sans-serif">
                        <svg class="w-3.5 h-3.5 shrink-0" style="color:#5ECFAA" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        {{ b }}
                      </li>
                    }
                  </ul>
                  <a href="#features" style="font-size:.8125rem;font-weight:700;color:#5ECFAA;font-family:Inter,sans-serif;text-decoration:none">En savoir plus →</a>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ╔══════════════════════════════════════╗
           ║  FEATURES GRID                        ║
           ╚══════════════════════════════════════╝ -->
      <section id="features" style="background:#F1F5F2;padding:90px 1.5rem">
        <div class="mx-auto" style="max-width:1180px">
          <div class="text-center mb-14">
            <p style="font-size:.6875rem;font-weight:800;letter-spacing:.12em;color:#2C7A5E;font-family:Inter,sans-serif">TOUT CE DONT VOUS AVEZ BESOIN</p>
            <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:clamp(2rem,4vw,3rem);color:#0A1F1A;margin-top:.5rem">
              Une plateforme complète, pensée pour vous
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style="gap:24px">
            @for (ft of features; track ft.title) {
              <div class="feature-card" style="position:relative;background:white;border:1px solid #E1E8E3;border-radius:18px;padding:28px">
                @if (ft.ia) {
                  <span style="position:absolute;top:14px;right:14px;font-size:.5625rem;font-weight:800;letter-spacing:.08em;background:#0A1F1A;color:#5ECFAA;padding:3px 8px;border-radius:99px;font-family:Inter,sans-serif">IA</span>
                }
                <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:#EAF4EE">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#2C7A5E" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="ft.icon"/>
                  </svg>
                </div>
                <h3 style="font-size:1.0625rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">{{ ft.title }}</h3>
                <p style="font-size:14px;line-height:1.5;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:.875rem">{{ ft.desc }}</p>
                <a routerLink="/inscription" style="font-size:.8125rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif;text-decoration:none">En savoir plus →</a>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ╔══════════════════════════════════════╗
           ║  SECTION 7 — SÉCURITÉ & CONFORMITÉ    ║
           ╚══════════════════════════════════════╝ -->
      <section id="securite" style="background:#F7F8F4;padding:90px 1.5rem">
        <div class="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center" style="max-width:1180px">
          <div>
            <p style="font-size:.6875rem;font-weight:800;letter-spacing:.12em;color:#2C7A5E;font-family:Inter,sans-serif">SÉCURITÉ & CONFORMITÉ</p>
            <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:clamp(2.25rem,4vw,3.25rem);color:#0A1F1A;margin:.5rem 0 2rem">
              Vos données sont en sécurité
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2" style="gap:20px">
              @for (g of securityItems; track g.title) {
                <div class="flex gap-3">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#EAF4EE">
                    <svg class="w-4.5 h-4.5" style="width:1.125rem;height:1.125rem" fill="none" viewBox="0 0 24 24" stroke="#2C7A5E" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="g.icon"/>
                    </svg>
                  </div>
                  <div>
                    <p style="font-size:.9375rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ g.title }}</p>
                    <p style="font-size:.8125rem;color:#6B7280;font-family:Inter,sans-serif;line-height:1.45">{{ g.desc }}</p>
                  </div>
                </div>
              }
            </div>
            <a routerLink="/inscription" class="inline-block mt-8" style="font-size:.9375rem;font-weight:700;color:#2C7A5E;font-family:Inter,sans-serif;text-decoration:none">
              En savoir plus sur la sécurité →
            </a>
          </div>

          <!-- Mockup mobile dark -->
          <div class="flex justify-center">
            <div style="width:270px;background:linear-gradient(160deg,#0A1F1A,#061F1A);border-radius:42px;padding:14px;box-shadow:0 32px 64px rgba(6,31,26,.35);border:1px solid rgba(255,255,255,.08)">
              <div style="background:#081A15;border-radius:32px;padding:2.5rem 1.5rem 1.5rem;min-height:460px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
                <div class="flex items-center justify-center mb-6" style="width:84px;height:84px;border-radius:50%;background:rgba(94,207,170,.12);border:1.5px solid rgba(94,207,170,.3)">
                  <svg style="width:2.5rem;height:2.5rem" fill="none" viewBox="0 0 24 24" stroke="#5ECFAA" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                  </svg>
                </div>
                <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:white;margin-bottom:.5rem">Votre dossier<br/>100% sécurisé</p>
                <p style="font-size:.75rem;color:rgba(255,255,255,.5);font-family:Inter,sans-serif;line-height:1.5">
                  Vos droits sont protégés avec une gestion claire du partage documentaire.
                </p>
                <div class="flex justify-center gap-8 mt-auto pt-8" style="opacity:.35">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"/></svg>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5ECFAA" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ╔══════════════════════════════════════╗
           ║  CTA FINAL                            ║
           ╚══════════════════════════════════════╝ -->
      <section style="background:#061F1A;padding:90px 1.5rem;position:relative;overflow:hidden">
        <div style="position:absolute;top:-8rem;right:-8rem;width:24rem;height:24rem;border-radius:50%;background:radial-gradient(circle,rgba(44,122,94,.18),transparent 70%)"></div>
        <div class="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center relative z-10" style="max-width:1180px">
          <div>
            <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:clamp(2rem,4vw,3rem);color:white;margin-bottom:1rem;letter-spacing:-0.03em">
              Prêt à louer mieux ?
            </h2>
            <p class="mb-8 text-base" style="color:rgba(255,255,255,0.55);max-width:26rem;font-family:Inter,sans-serif">
              Rejoignez les propriétaires, candidats et professionnels qui ont déjà choisi Baileo pour simplifier la location.
            </p>
            <div class="flex flex-wrap gap-4 mb-6">
              <a routerLink="/inscription"
                 class="px-8 py-4 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
                 style="background:linear-gradient(135deg,#2C7A5E,#1B4438);font-family:Inter,sans-serif;text-decoration:none">
                Commencer gratuitement
              </a>
              <a routerLink="/inscription"
                 class="px-8 py-4 rounded-xl font-bold text-sm transition-all hover:-translate-y-1"
                 style="border:1.5px solid rgba(255,255,255,0.15);color:white;font-family:Inter,sans-serif;text-decoration:none">
                Demander une démo
              </a>
            </div>
            <div class="flex flex-wrap gap-6">
              @for (b of ctaBadges; track b) {
                <span class="flex items-center gap-1.5 text-xs" style="color:rgba(255,255,255,0.4);font-family:Inter,sans-serif">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#5ECFAA" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  {{ b }}
                </span>
              }
            </div>
          </div>

          <!-- Mockup dashboard + mobile -->
          <div class="hidden lg:block" style="position:relative;height:320px">
            <div style="position:absolute;top:0;right:2rem;width:24rem;background:#0B2B24;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:1.25rem;box-shadow:0 24px 48px rgba(0,0,0,.4)">
              <p style="font-size:.625rem;font-weight:700;color:rgba(255,255,255,.4);font-family:Inter,sans-serif;margin-bottom:.75rem">VUE D'ENSEMBLE</p>
              <div class="grid grid-cols-3 gap-2 mb-3">
                @for (s of ctaStats; track s.label) {
                  <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:.625rem">
                    <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.125rem;color:#5ECFAA">{{ s.value }}</p>
                    <p style="font-size:.5625rem;color:rgba(255,255,255,.4);font-family:Inter,sans-serif">{{ s.label }}</p>
                  </div>
                }
              </div>
              <div class="flex items-end gap-1.5" style="height:56px">
                @for (h of [34, 48, 28, 56, 42, 50, 38]; track $index) {
                  <div class="flex-1 rounded-t" [style.height.px]="h" style="background:linear-gradient(180deg,#2C7A5E,#1B4438)"></div>
                }
              </div>
            </div>
            <div style="position:absolute;bottom:0;left:2rem;width:150px;background:linear-gradient(160deg,#0A1F1A,#061F1A);border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:8px;box-shadow:0 24px 48px rgba(0,0,0,.5)">
              <div style="background:#081A15;border-radius:18px;padding:1rem .75rem;text-align:center">
                <div class="mx-auto mb-2 flex items-center justify-center" style="width:36px;height:36px;border-radius:50%;background:rgba(94,207,170,.14)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5ECFAA" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                </div>
                <p style="font-size:.625rem;font-weight:700;color:white;font-family:Inter,sans-serif">Dossier complet</p>
                <p style="font-size:.5rem;color:rgba(255,255,255,.4);font-family:Inter,sans-serif">Visite confirmée demain</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer style="background:#061F1A;padding:64px 1.5rem 0">
        <div class="mx-auto" style="max-width:1180px">
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-10 pb-12">
            <div class="col-span-2">
              <div class="flex items-center gap-2.5 mb-3">
                <img src="assets/logo.png" alt="Baileo" style="height:2rem;width:auto;display:block">
                <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1rem;color:white;letter-spacing:-0.03em">BAILEO</span>
              </div>
              <p style="font-size:.8125rem;color:rgba(255,255,255,.45);font-family:Inter,sans-serif;max-width:16rem;line-height:1.5;margin-bottom:1rem">
                La plateforme intelligente qui simplifie la location pour tous.
              </p>
              <div class="flex gap-3">
                @for (s of ['LinkedIn', 'X', 'Instagram']; track s) {
                  <a href="#" class="flex items-center justify-center transition-colors hover:bg-white/10"
                     style="width:2rem;height:2rem;border-radius:50%;border:1px solid rgba(255,255,255,.15);font-size:.5625rem;font-weight:700;color:rgba(255,255,255,.6);font-family:Inter,sans-serif;text-decoration:none">
                    {{ s === 'LinkedIn' ? 'in' : (s === 'X' ? 'X' : 'ig') }}
                  </a>
                }
              </div>
            </div>
            @for (col of footerCols; track col.title) {
              <div>
                <p style="font-size:.75rem;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.85);font-family:Inter,sans-serif;margin-bottom:.875rem;text-transform:uppercase">{{ col.title }}</p>
                @for (l of col.links; track l) {
                  <a href="#" class="block py-1 transition-colors hover:text-white"
                     style="font-size:.8125rem;color:rgba(255,255,255,.45);font-family:Inter,sans-serif;text-decoration:none">{{ l }}</a>
                }
              </div>
            }
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 py-5" style="border-top:1px solid rgba(255,255,255,.08)">
            <p style="font-size:.75rem;color:rgba(255,255,255,.35);font-family:Inter,sans-serif">© 2026 Baileo — Tous droits réservés</p>
            <div class="flex items-center gap-5">
              @for (l of ['Mentions légales', 'Confidentialité', 'CGU']; track l) {
                <a href="#" class="transition-colors hover:text-white" style="font-size:.75rem;color:rgba(255,255,255,.35);font-family:Inter,sans-serif;text-decoration:none">{{ l }}</a>
              }
              <span class="flex items-center gap-1" style="font-size:.75rem;color:rgba(255,255,255,.35);font-family:Inter,sans-serif;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:2px 8px">
                🌐 Français
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class LandingComponent {
  processSteps = [
    { n: '01', title: 'Candidature reçue', desc: 'Le candidat dépose son dossier depuis la page du logement.',
      icon: '<svg class="w-4 h-4" color="#2C7A5E" stroke="#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>' },
    { n: '02', title: 'Dossier complété', desc: 'Les informations et documents sont centralisés.',
      icon: '<svg class="w-4 h-4" color="#2C7A5E" stroke="#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"/></svg>' },
    { n: '03', title: 'Documents vérifiés', desc: 'Les pièces sont suivies, validées ou demandées à nouveau.',
      icon: '<svg class="w-4 h-4" color="#2C7A5E" stroke="#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>' },
    { n: '04', title: 'Visite planifiée', desc: 'Le candidat choisit un créneau et reçoit une confirmation.',
      icon: '<svg class="w-4 h-4" color="#2C7A5E" stroke="#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>' },
    { n: '05', title: 'Décision envoyée', desc: 'Le propriétaire accepte, refuse ou met en attente.',
      icon: '<svg class="w-4 h-4" color="#2C7A5E" stroke="#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>' },
    { n: '06', title: 'Bail signé', desc: 'Le bail est préparé, signé et archivé.',
      icon: '<svg class="w-4 h-4" color="#2C7A5E" stroke="#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>' },
  ];

  actors = [
    {
      title: 'Pour les propriétaires',
      text: 'Gagnez du temps, centralisez tout et prenez de meilleures décisions grâce à une vue claire de vos dossiers.',
      bullets: ['Vue ensemble en temps réel', 'Historique complet par dossier', 'Contrôle total du processus'],
      img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=480&q=75',
    },
    {
      title: 'Pour les candidats',
      text: 'Déposez votre dossier une fois, suivez chaque candidature et recevez des mises à jour claires à chaque étape.',
      bullets: ['Dossier réutilisable', 'Suivi transparent', 'Notifications en temps réel'],
      img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=75',
    },
    {
      title: 'Pour les professionnels',
      text: 'Agences, gestionnaires, marchands de biens : collaborez, déléguez et pilotez plusieurs logements et équipes.',
      bullets: ['Multi-utilisateurs & rôles', 'Suivi partagé avec vos propriétaires', 'Tableaux de bord avancés'],
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=480&q=75',
    },
  ];

  hideImg(e: Event): void { (e.target as HTMLImageElement).style.display = 'none'; }

  heroFeatures = [
    'Candidatures centralisées, de A à Z',
    'Dossiers et documents suivis et protégés',
    'Visites planifiées sans échanges dispersés',
    'Décisions transparentes, candidat toujours informé',
    'Workspace collaboratif pour les agences',
  ];

  sidebarItems = [
    { label: 'Tableau de bord', active: true },
    { label: 'Campagnes', active: false },
    { label: 'Candidatures', active: false },
    { label: 'Visites', active: false },
    { label: 'Messages', active: false },
    { label: 'Analytics', active: false },
  ];

  dashStats = [
    { label: 'Candidatures', value: '48', trend: '+12 cette semaine' },
    { label: 'Visites', value: '18', trend: '+4 cette semaine' },
    { label: 'Taux réussite', value: '68%', trend: '+6% vs S-1' },
  ];

  campaigns = [
    { name: 'T3 lumineux — Prado', score: '95%', color: '#2C7A5E' },
    { name: 'Colocation — La Timone', score: '82%', color: '#3B82F6' },
    { name: 'Studio — Vieux-Port', score: '67%', color: '#F97316' },
  ];

  brands = ['FONCIA', 'laforêt', 'Orpi', 'PAP', 'GUY HOQUET', 'Century 21', 'NESTENN'];

  rankingCandidates = [
    { rank: 1, name: 'Wendy R.', info: '28 ans · Ingénieure · CDI',   score: 98, rankColor: 'linear-gradient(135deg,#F97316,#EA580C)' },
    { rank: 2, name: 'Lucas D.', info: '26 ans · Consultant · CDI',   score: 96, rankColor: 'linear-gradient(135deg,#94A3B8,#64748B)' },
    { rank: 3, name: 'Emma B.',  info: '24 ans · Marketing · CDI',    score: 95, rankColor: 'linear-gradient(135deg,#D97706,#B45309)' },
  ];

  rankingFeatures = [
    'Checklist documents : requis, reçus, validés',
    'Timeline complète visible des deux côtés',
    'Notes privées jamais partagées au candidat',
    'Décisions tracées avec message choisi',
  ];

  footerCols = [
    { title: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'Intégrations', 'API'] },
    { title: 'Ressources', links: ['Blog', 'Guides', 'FAQ', 'Webinaires'] },
    { title: 'Entreprise', links: ['À propos', 'Carrières', 'Presse', 'Contact'] },
  ];

  securityItems = [
    { title: 'Hébergé en Europe', desc: "Données hébergées dans l'Union Européenne",
      icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582' },
    { title: 'Conforme RGPD', desc: 'Données personnelles protégées',
      icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
    { title: 'Chiffrement', desc: 'Données chiffrées au repos et en transit',
      icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
    { title: 'Accès contrôlés', desc: "Droits d'accès granulaires et auditables",
      icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z' },
    { title: 'eIDAS', desc: 'Signature électronique légale et sécurisée',
      icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125' },
  ];

  features = [
    { ia: false, title: 'Campagnes & diffusion',
      desc: 'Créez vos annonces, générez votre landing page et diffusez-les sur les portails et réseaux en quelques clics.',
      icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418' },
    { ia: false, title: 'Dossiers centralisés',
      desc: 'Recevez, organisez et consultez tous les candidats et documents dans un espace unique et sécurisé.',
      icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
    { ia: false, title: 'Rental Passport',
      desc: 'Un dossier locatif complet, vérifié et réutilisable par vos candidats pour toutes leurs candidatures.',
      icon: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm4.125-9.75a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z' },
    { ia: false, title: 'Messages & notifications',
      desc: 'Échangez avec vos candidats, demandez des pièces manquantes et gardez une trace claire de chaque interaction.',
      icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
    { ia: false, title: 'Visites & retours',
      desc: 'Planifiez les visites, confirmez les créneaux et ajoutez vos notes privées après chaque rendez-vous.',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
    { ia: false, title: 'Décision & signature',
      desc: 'Acceptez, refusez, mettez en attente et signez le bail en ligne en toute sécurité.',
      icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' },
    { ia: true, title: 'Analytics & IA',
      desc: 'Analysez vos performances, suivez vos KPI et laissez notre IA vous aider à sélectionner le meilleur profil.',
      icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
    { ia: true, title: "Aide à la rédaction d'annonces",
      desc: "Générez des annonces optimisées pour Leboncoin, SeLoger, PAP et plus encore grâce à l'IA.",
      icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z' },
    { ia: true, title: 'Recommandations intelligentes',
      desc: 'Scores explicables, points forts, risques, comparaisons de dossiers et suggestions actionnables.',
      icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' },
  ];

  ctaBadges = ['Aucune carte bancaire', 'Essai gratuit', 'Sans engagement'];
  ctaStats = [
    { value: '24', label: 'Campagnes' },
    { value: '162', label: 'Candidatures' },
    { value: '28', label: 'Visites' },
  ];
}
