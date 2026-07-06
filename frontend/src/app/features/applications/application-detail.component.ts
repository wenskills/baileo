import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { DecisionRoomComponent } from '../../shared/decision-room.component';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApplicationService, Application } from '../../core/services/application.service';
import { VisitService, TimelineEvent } from '../../core/services/visit.service';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecisionRoomComponent],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      @if (loading()) {
        <div class="card p-8 animate-pulse"><div class="h-6 bg-gray-100 rounded w-1/2"></div></div>
      } @else if (!app()) {
        <div class="card p-8 text-center">
          <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Candidature introuvable.</p>
          <a routerLink="/candidatures" class="text-sm text-green-700 mt-2 block">Retour</a>
        </div>
      } @else {
        <div class="mb-4 flex items-center gap-2" style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
          <a routerLink="/candidatures" class="hover:text-gray-700">Candidatures</a>
          <span>›</span>
          <span style="color:#374151">{{ app()!.candidate?.firstName }} {{ app()!.candidate?.lastName }}</span>
        </div>
        <div class="grid grid-cols-3 gap-5">
          <div class="col-span-2 space-y-4">
            <div class="card p-5">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                     style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                  {{ (app()!.candidate?.firstName?.[0] ?? '') + (app()!.candidate?.lastName?.[0] ?? '') }}
                </div>
                <div>
                  <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.25rem;color:#0A1F1A">
                    {{ app()!.candidate?.firstName }} {{ app()!.candidate?.lastName }}
                  </h2>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                        [style.background]="statusColor(app()!.status) + '18'"
                        [style.color]="statusColor(app()!.status)">
                    {{ statusLabel(app()!.status) }}
                  </span>
                </div>
                @if (app()!.score !== null && app()!.score !== undefined) {
                  <div class="ml-auto text-center">
                    <p style="font-family:'Playfair Display',Georgia,serif;font-size:2rem;font-weight:800"
                       [style.color]="app()!.scoreColor">{{ app()!.score }}</p>
                    <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ app()!.scoreLabel }}</p>
                  </div>
                }
              </div>
            </div>
            <!-- Accès rapide : messagerie privée propriétaire ↔ candidat (spec) -->
            <a [routerLink]="['/messages']" [queryParams]="{application: app()!.id}"
               class="card p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5"
               style="text-decoration:none;border:1.5px solid #C8DDD7">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#E0EDE8">
                <svg class="w-4.5 h-4.5" style="width:1.125rem;height:1.125rem;color:#1B4438" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                </svg>
              </span>
              <div class="flex-1">
                <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Ouvrir la messagerie</p>
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">Conversation privée avec {{ app()!.candidate?.firstName || 'le candidat' }}</p>
              </div>
              <svg class="w-4 h-4" style="color:#9CA3AF" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </a>

            @if (app()!.passport) {
              <div class="card p-5">
                <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Informations candidat</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div><p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Contrat</p><p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ (app()!.passport!.contractType || '—').toUpperCase() }}</p></div>
                  <div><p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Employeur</p><p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ app()!.passport!.employer || '—' }}</p></div>
                  <div><p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Revenus mensuels</p><p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ app()!.passport!.monthlyIncome ?? '—' }} €</p></div>
                  <div><p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Garant</p><p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ app()!.passport!.guarantorRelation !== 'none' ? 'Oui (' + app()!.passport!.guarantorIncome + ' €)' : 'Non' }}</p></div>
                  <div><p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Documents</p><p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ app()!.passport!.documentsCount }} pièces</p></div>
                  <div><p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">Disponibilité</p><p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ app()!.passport!.availabilityDate || '—' }}</p></div>
                </div>
              </div>

              <!-- Documents : voir, valider, refuser (spec Phase 2 — le candidat est notifié) -->
              @if (app()!.passport!.documents?.length) {
                <div class="card p-5">
                  <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">
                    Documents du dossier
                  </h3>
                  <p class="flex items-center gap-1 -mt-1 mb-2" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                    Documents protégés — chaque consultation est journalisée et visible du candidat.
                  </p>
                  <div class="space-y-2">
                    @for (d of app()!.passport!.documents!; track d.type) {
                      <div class="p-3 rounded-xl" style="border:1.5px solid #F0F0F0">
                        <div class="flex items-center gap-3">
                          <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                [style.background]="d.status === 'validated' ? '#E0EDE8' : (d.status === 'rejected' ? '#FEF2F2' : '#F3F4F6')">
                            <svg class="w-4 h-4" [style.color]="d.status === 'validated' ? '#1B4438' : (d.status === 'rejected' ? '#DC2626' : '#6B7280')"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                            </svg>
                          </span>
                          <div class="flex-1 min-w-0">
                            <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif">{{ docLabel(d.type) }}</p>
                            <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                              @if (d.status === 'validated') { <span style="color:#1B4438;font-weight:700">Validé</span> }
                              @else if (d.status === 'rejected') { <span style="color:#DC2626;font-weight:700">Refusé</span> — {{ d.reviewComment }} }
                              @else { En attente de vérification }
                            </p>
                          </div>
                          <button type="button" (click)="openDoc(d)"
                             class="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                             style="border:1.5px solid #E5E7EB;color:#374151;background:white;cursor:pointer;font-family:Inter,sans-serif">Ouvrir</button>
                          @if (d.status !== 'validated') {
                            <button type="button" (click)="reviewDoc(d.type, 'validate')" [disabled]="reviewing()"
                                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                                    style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">Valider</button>
                          }
                          @if (d.status !== 'rejected') {
                            <button type="button" (click)="rejectTarget.set(rejectTarget() === d.type ? '' : d.type)"
                                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                                    style="border:1.5px solid #FECACA;color:#DC2626;background:white;cursor:pointer;font-family:Inter,sans-serif">Refuser</button>
                          }
                        </div>
                        @if (rejectTarget() === d.type) {
                          <div class="mt-2 flex gap-2">
                            <input [(ngModel)]="rejectComment" placeholder="Motif (obligatoire) — ex : document illisible, version expirée..."
                                   maxlength="500" class="flex-1 px-3 py-2 rounded-lg text-xs"
                                   style="border:1.5px solid #FECACA;font-family:Inter,sans-serif;outline:none"/>
                            <button type="button" (click)="reviewDoc(d.type, 'reject')" [disabled]="!rejectComment.trim() || reviewing()"
                                    class="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                                    style="background:#DC2626;border:none;cursor:pointer;font-family:Inter,sans-serif">Confirmer le refus</button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                  @if (reviewError()) {
                    <p class="mt-2" style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif">{{ reviewError() }}</p>
                  }
                </div>
              }

              <!-- Documents manquants vs exigés par la campagne + demande en 1 clic -->
              @if (missingDocs().length) {
                <div class="card p-5" style="border:1.5px solid #FED7AA;background:#FFFBF5">
                  <h3 class="flex items-center gap-2" style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">
                    <svg class="w-4 h-4" style="color:#F97316" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                    </svg>
                    Documents manquants ({{ missingDocs().length }})
                  </h3>
                  <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.75rem">
                    Exigés par votre annonce mais absents du dossier — demandez-les en un clic
                    (notification + message automatique au candidat).
                  </p>
                  <div class="flex flex-wrap gap-2">
                    @for (t of missingDocs(); track t) {
                      <button type="button" (click)="requestDoc(t)" [disabled]="requesting() === t || requested().includes(t)"
                              class="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                              [style.background]="requested().includes(t) ? '#E0EDE8' : 'white'"
                              [style.color]="requested().includes(t) ? '#1B4438' : '#F97316'"
                              [style.border]="requested().includes(t) ? '1.5px solid #C8DDD7' : '1.5px solid #FED7AA'"
                              style="cursor:pointer;font-family:Inter,sans-serif">
                        {{ requested().includes(t) ? '✓ Demandé — ' + docLabel(t) : 'Demander : ' + docLabel(t) }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Après la visite : fiche ressenti PRIVÉE + retour choisi (spec Phase 2) -->
              <div class="card p-5">
                <div class="flex items-center justify-between mb-1">
                  <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Après la visite</h3>
                  <span class="px-2 py-0.5 rounded-lg" style="font-size:.625rem;font-weight:700;background:#F3F4F6;color:#6B7280;font-family:Inter,sans-serif">
                    Privé — jamais visible du candidat
                  </span>
                </div>
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.75rem">
                  Notez votre ressenti pour comparer vos candidats plus tard.
                </p>
                <div class="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
                  @for (crit of feedbackCriteria; track crit.key) {
                    <div class="flex items-center justify-between">
                      <span style="font-size:.75rem;color:#374151;font-family:Inter,sans-serif">{{ crit.label }}</span>
                      <div class="flex gap-1">
                        @for (n of [1,2,3,4,5]; track n) {
                          <button type="button" (click)="setFbNote(crit.key, n)"
                                  class="w-5 h-5 rounded-full text-center"
                                  [style.background]="(fb[crit.key] ?? 0) >= n ? '#2C7A5E' : '#E5E7EB'"
                                  style="border:none;cursor:pointer;font-size:.5rem"></button>
                        }
                      </div>
                    </div>
                  }
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <textarea [(ngModel)]="fb.positives" rows="2" placeholder="Points positifs..." maxlength="1000"
                            class="px-3 py-2 rounded-lg text-xs resize-none" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"></textarea>
                  <textarea [(ngModel)]="fb.negatives" rows="2" placeholder="Points négatifs..." maxlength="1000"
                            class="px-3 py-2 rounded-lg text-xs resize-none" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"></textarea>
                </div>
                <textarea [(ngModel)]="fb.comment" rows="2" placeholder="Impression générale, questions posées..." maxlength="2000"
                          class="w-full px-3 py-2 rounded-lg text-xs resize-none mb-2" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"></textarea>
                <div class="flex items-center gap-2">
                  <button type="button" (click)="saveFeedback()" [disabled]="fbSaving()"
                          class="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                          style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">
                    {{ fbSaving() ? 'Enregistrement...' : 'Enregistrer la fiche' }}
                  </button>
                  @if (fbSaved()) { <span style="font-size:.75rem;color:#2C7A5E;font-weight:600;font-family:Inter,sans-serif">Fiche enregistrée</span> }
                  @if (fbError()) { <span style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif">{{ fbError() }}</span> }
                </div>

                <!-- Retour au candidat : UNIQUEMENT ce que le propriétaire choisit d'envoyer -->
                <div class="mt-4 pt-3" style="border-top:1px solid #F0F0F0">
                  <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">
                    Envoyer un retour au candidat <span style="font-weight:400;color:#9CA3AF;font-size:.6875rem">(optionnel — via la messagerie)</span>
                  </p>
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    @for (q of quickReplies; track q) {
                      <button type="button" (click)="feedbackMsg = q"
                              class="px-2.5 py-1 rounded-lg text-xs"
                              style="border:1.5px solid #C8DDD7;color:#1B4438;background:white;cursor:pointer;font-family:Inter,sans-serif">{{ q }}</button>
                    }
                  </div>
                  <div class="flex gap-2">
                    <input [(ngModel)]="feedbackMsg" placeholder="Votre message au candidat..." maxlength="5000"
                           class="flex-1 px-3 py-2 rounded-lg text-xs" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"/>
                    <button type="button" (click)="sendFeedbackMsg()" [disabled]="!feedbackMsg.trim() || fbMsgSending()"
                            class="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                            style="background:#2C7A5E;border:none;cursor:pointer;font-family:Inter,sans-serif">Envoyer</button>
                  </div>
                  @if (fbMsgSent()) { <p class="mt-1.5" style="font-size:.75rem;color:#2C7A5E;font-weight:600;font-family:Inter,sans-serif">Message envoyé au candidat.</p> }
                </div>
              </div>
            }
            @if (app()!.scoreBreakdown?.length) {
              <div class="card p-5">
                <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Détail du score</h3>
                <div class="space-y-3">
                  @for (b of app()!.scoreBreakdown; track b.label) {
                    <div>
                      <div class="flex justify-between mb-1">
                        <span style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">{{ b.label }}</span>
                        <span style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ b.score }}/{{ b.max }}</span>
                      </div>
                      <div class="h-2 rounded-full overflow-hidden" style="background:#E5E7EB">
                        <div class="h-full rounded-full" style="background:linear-gradient(90deg,#2C7A5E,#38B88A)"
                             [style.width]="(b.score / b.max * 100) + '%'"></div>
                      </div>
                      <p style="font-size:.6875rem;color:#9CA3AF;margin-top:.25rem;font-family:Inter,sans-serif">{{ b.reason }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
          <div class="space-y-4">
            <div class="card p-4">
              <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.75rem">Étape du dossier</h3>
              <div class="space-y-1.5">
                @for (s of workflowStatuses(); track s.value) {
                  <button type="button" (click)="move(s.value)"
                          class="w-full py-2 rounded-xl text-xs font-semibold text-left px-3 transition-all"
                          style="font-family:Inter,sans-serif;border:none;cursor:pointer"
                          [style.background]="app()!.status === s.value ? s.color + '18' : '#F5F7F6'"
                          [style.color]="app()!.status === s.value ? s.color : '#6B7280'">
                    {{ s.label }}
                  </button>
                }
              </div>
              <!-- La DÉCISION passe par la salle de décision (checklist + message + traçabilité) -->
              <button type="button" (click)="decisionOpen.set(true)"
                      class="w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-white"
                      style="background:#0A1F1A;border:none;cursor:pointer;font-family:Inter,sans-serif">
                Ouvrir la salle de décision
              </button>
              @if (isDecided()) {
                <p class="mt-1.5 text-center" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">
                  Décision prise : {{ statusLabelOf(app()!.status) }}
                </p>
              }
            </div>
            <!-- Collaboration d'équipe (agence) : assignation + commentaires internes -->
            @if (isAgencyContext()) {
              <div class="card p-4">
                <h3 class="flex items-center gap-2" style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">
                  Équipe
                  <span class="px-1.5 py-0.5 rounded" style="font-size:.5625rem;font-weight:700;background:#F3F4F6;color:#6B7280;font-family:Inter,sans-serif">INTERNE AGENCE</span>
                </h3>
                <label style="font-size:.6875rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Assigné à</label>
                <select [ngModel]="assignedTo()" (ngModelChange)="assign($event)"
                        class="w-full px-3 py-2 rounded-xl text-xs mb-3"
                        style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;background:white;outline:none">
                  <option value="">Personne</option>
                  @for (m of teamMembers(); track m.userId) {
                    <option [value]="m.userId">{{ m.name }}</option>
                  }
                </select>

                <label style="font-size:.6875rem;font-weight:600;color:#6B7280;font-family:Inter,sans-serif;display:block;margin-bottom:.25rem">Commentaires internes</label>
                <div class="space-y-2 mb-2" style="max-height:12rem;overflow-y:auto">
                  @for (cm of internalComments(); track cm.id) {
                    <div class="p-2 rounded-lg" style="background:#F8FBF9">
                      <p style="font-size:.75rem;color:#0A1F1A;font-family:Inter,sans-serif">{{ cm.body }}</p>
                      <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ cm.author }} · {{ cm.createdAt | date:'d MMM HH:mm' }}</p>
                    </div>
                  } @empty {
                    <p style="font-size:.6875rem;color:#D1D5DB;font-family:Inter,sans-serif">Aucun commentaire d'équipe.</p>
                  }
                </div>
                <div class="flex gap-1.5">
                  <input [(ngModel)]="newComment" placeholder="Commentaire interne..." maxlength="2000"
                         (keyup.enter)="addInternalComment()"
                         class="flex-1 px-2.5 py-1.5 rounded-lg text-xs" style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"/>
                  <button type="button" (click)="addInternalComment()" [disabled]="!newComment.trim()"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                          style="background:#1B4438;border:none;cursor:pointer;font-family:Inter,sans-serif">+</button>
                </div>
              </div>
            }

            <div class="card p-4">
              <h3 style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.5rem">Note privée</h3>
              <textarea [(ngModel)]="note" rows="4" placeholder="Ajouter une note..."
                        class="w-full px-3 py-2 rounded-xl text-sm resize-none"
                        style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none"
                        (focus)="$any($event.target).style.borderColor='#2C7A5E'"
                        (blur)="$any($event.target).style.borderColor='#E5E7EB'"></textarea>
              <button type="button" (click)="saveNote()"
                      class="mt-2 w-full py-2 rounded-xl text-xs font-bold text-white"
                      style="background:#1B4438;font-family:Inter,sans-serif">
                Enregistrer la note
              </button>
              @if (noteSaved()) {
                <span style="font-size:.75rem;color:#2C7A5E;font-weight:600;font-family:Inter,sans-serif;margin-left:.5rem">Enregistrée</span>
              }
              @if (noteError()) {
                <span style="font-size:.75rem;color:#DC2626;font-family:Inter,sans-serif;margin-left:.5rem">{{ noteError() }}</span>
              }
            </div>
          </div>
        </div>

        <!-- Timeline d'audit (spec : tous les changements tracés) -->
        <div class="card p-5 mt-4">
          <h3 style="font-size:.9375rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:1rem">
            Historique
          </h3>
          @if (timeline().length) {
            <div class="relative" style="padding-left:1.25rem">
              <div class="absolute top-1 bottom-1" style="left:.3125rem;width:2px;background:#E0EDE8"></div>
              <div class="space-y-4">
                @for (e of timeline(); track e.id) {
                  <div class="relative">
                    <span class="absolute rounded-full"
                          style="left:-1.25rem;top:.25rem;width:.6875rem;height:.6875rem;border:2.5px solid white;box-shadow:0 0 0 1.5px #C8DDD7"
                          [style.background]="timelineColor(e.type)"></span>
                    <p style="font-size:.8125rem;color:#374151;font-family:Inter,sans-serif">{{ e.message }}</p>
                    <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.125rem">
                      {{ e.createdAt | date:'dd MMM yyyy à HH:mm' }}
                      · {{ e.actorRole === 'owner' ? 'Vous' : (e.actorRole === 'candidate' ? 'Candidat' : 'Système') }}
                    </p>
                  </div>
                }
              </div>
            </div>
          } @else {
            <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">Aucun événement enregistré.</p>
          }
        </div>
      }
    </div>

    @if (decisionOpen()) {
      <app-decision-room [applicationId]="app()!.id"
                         [candidateName]="app()!.candidate?.firstName || 'ce candidat'"
                         (closed)="decisionOpen.set(false)"
                         (decided)="onDecided($event)"/>
    }
  `,
})
export class ApplicationDetailComponent implements OnInit {
  app     = signal<Application | null>(null);
  loading = signal(true);
  note    = '';

  statuses = [
    { value: 'new',              label: 'Nouveau',          color: '#6B7280' },
    { value: 'prequalification', label: 'Préqualification', color: '#3B82F6' },
    { value: 'documents',        label: 'Documents',        color: '#F97316' },
    { value: 'visite',           label: 'Visite',           color: '#8B5CF6' },
    { value: 'decision',         label: 'Décision',         color: '#EAB308' },
    { value: 'signature',        label: 'Signature',        color: '#2C7A5E' },
    { value: 'accepted',         label: 'Accepté',          color: '#2C7A5E' },
    { value: 'waitlist',         label: 'Liste d\'attente',  color: '#F59E0B' },
    { value: 'refused',          label: 'Refusé',           color: '#EF4444' },
    { value: 'cancelled',        label: 'Annulé',           color: '#9CA3AF' },
  ];

  timeline = signal<TimelineEvent[]>([]);

  constructor(private svc: ApplicationService, private vSvc: VisitService, private route: ActivatedRoute, private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(id).subscribe({
      next: (a) => { this.app.set(a); this.note = a.ownerNote ?? ''; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.loadFeedback(id);
    this.loadTeamContext(id);
    this.vSvc.timeline(id).subscribe({
      next: (res) => this.timeline.set(res.data),
      error: () => {},
    });
  }

  timelineColor(type: string): string {
    const map: Record<string, string> = {
      application_created: '#2C7A5E', status_changed: '#3B82F6',
      visit_booked: '#8B5CF6', visit_cancelled: '#EF4444',
      application_accepted: '#2C7A5E', application_rejected: '#EF4444',
      document_added: '#F97316', message_sent: '#6B7280',
    };
    return map[type] ?? '#9CA3AF';
  }

  // ── Collaboration agence ──
  assignedTo       = signal('');
  teamMembers      = signal<{ userId: string; name: string }[]>([]);
  internalComments = signal<{ id: string; author: string; body: string; createdAt: string }[]>([]);
  newComment = '';
  private orgId = '';

  isAgencyContext(): boolean {
    return (this.auth.currentUser()?.roles ?? []).includes('ROLE_AGENCY');
  }

  private loadTeamContext(applicationId: string): void {
    if (!this.isAgencyContext()) return;
    this.http.get<{ id: string }>(`${environment.apiUrl}/organizations/current`).subscribe({
      next: (org) => {
        this.orgId = org.id;
        this.http.get<{ data: { userId: string; name: string; status: string }[] }>(
          `${environment.apiUrl}/organizations/${org.id}/members`
        ).subscribe({
          next: (res) => this.teamMembers.set((res.data ?? []).filter(m => m.status === 'active')),
          error: () => {},
        });
      },
      error: () => {},
    });
    this.http.get<{ data: { id: string; author: string; body: string; createdAt: string }[] }>(
      `${environment.apiUrl}/applications/${applicationId}/internal-comments`
    ).subscribe({ next: (res) => this.internalComments.set(res.data ?? []), error: () => {} });
  }

  assign(userId: string): void {
    const a = this.app(); if (!a) return;
    this.assignedTo.set(userId);
    const req = userId
      ? this.http.post(`${environment.apiUrl}/applications/${a.id}/assign`, { userId })
      : this.http.delete(`${environment.apiUrl}/applications/${a.id}/assign`);
    req.subscribe({ next: () => {}, error: () => {} });
  }

  addInternalComment(): void {
    const a = this.app(); const body = this.newComment.trim();
    if (!a || !body) return;
    this.http.post<{ id: string; author: string; body: string; createdAt: string }>(
      `${environment.apiUrl}/applications/${a.id}/internal-comments`, { body }
    ).subscribe({
      next: (cm) => { this.internalComments.update(l => [...l, cm]); this.newComment = ''; },
      error: () => {},
    });
  }

  decisionOpen = signal(false);

  /** Étapes de travail uniquement — les décisions passent par la Decision Room */
  workflowStatuses(): { value: string; label: string; color: string }[] {
    return this.statuses.filter(s => !['accepted', 'waitlist', 'refused', 'cancelled'].includes(s.value));
  }

  isDecided(): boolean {
    return ['accepted', 'waitlist', 'refused', 'cancelled', 'withdrawn'].includes(this.app()?.status ?? '');
  }

  statusLabelOf(s: string): string { return ApplicationService.statusLabel(s); }

  onDecided(newStatus: string): void {
    this.decisionOpen.set(false);
    const a = this.app();
    if (a) { a.status = newStatus; this.app.set({ ...a }); }
    if (a) this.vSvc.timeline(a.id).subscribe({ next: (res) => this.timeline.set(res.data), error: () => {} });
  }

  move(status: string): void {
    const a = this.app(); if (!a) return;
    this.svc.updateStatus(a.id, status).subscribe({
      next: () => {
        a.status = status; this.app.set({...a});
        this.vSvc.timeline(a.id).subscribe({ next: (res) => this.timeline.set(res.data), error: () => {} });
      },
      error: () => {},
    });
  }

  // ── Documents manquants + demande (spec : « demander une pièce ») ──
  requesting = signal('');
  requested  = signal<string[]>([]);

  missingDocs(): string[] {
    const a = this.app();
    const required = (a as { documentsRequired?: string[] } | null)?.documentsRequired ?? [];
    const present  = new Set((a?.passport?.documents ?? []).map(d => d.type));
    return required.filter(t => !present.has(t));
  }

  requestDoc(type: string): void {
    const a = this.app(); if (!a) return;
    this.requesting.set(type);
    this.http.post(`${environment.apiUrl}/applications/${a.id}/request-document`, { type }).subscribe({
      next: () => {
        this.requesting.set('');
        this.requested.update(l => [...l, type]);
      },
      error: () => this.requesting.set(''),
    });
  }

  // ── Validation des documents (spec Phase 2) ──
  reviewing    = signal(false);
  reviewError  = signal('');
  rejectTarget = signal('');
  rejectComment = '';

  docLabel(type: string): string {
    const map: Record<string, string> = {
      identity: 'Pièce d\'identité', domicile: 'Justificatif de domicile',
      contract: 'Contrat de travail', payslips: 'Fiches de paie',
      tax: 'Avis d\'imposition', rib: 'RIB', insurance: 'Attestation d\'assurance',
      guarantor_id: 'Pièce d\'identité du garant', guarantor_income: 'Revenus du garant',
    };
    return map[type] ?? type;
  }

  /** URL d'ouverture SÉCURISÉE : toujours l'endpoint journalisé (jamais le chemin statique). */
  docUrl(d: { type: string; url: string }): string {
    const base = environment.apiUrl.endsWith('/api') ? environment.apiUrl.slice(0, -4) : environment.apiUrl;
    const cid = this.app()?.candidate?.id;
    return cid ? `${base}/api/documents/${cid}/${d.type}/download` : '#';
  }

  /** Ouverture avec le token (l'iframe/href direct n'aurait pas le header Authorization). */
  openDoc(d: { type: string; url: string; name: string }): void {
    this.http.get(this.docUrl(d), { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.reviewError.set('Document inaccessible.'),
    });
  }

  reviewDoc(type: string, action: 'validate' | 'reject'): void {
    const a = this.app(); if (!a?.candidate?.id) return;
    const comment = action === 'reject' ? this.rejectComment.trim() : '';
    if (action === 'reject' && !comment) return;
    this.reviewing.set(true);
    this.reviewError.set('');
    this.http.post<{ type: string; status: string; reviewComment: string | null }>(
      `${environment.apiUrl}/passport/${a.candidate.id}/documents/${type}/review`,
      { action, comment }
    ).subscribe({
      next: (res) => {
        this.reviewing.set(false);
        this.rejectTarget.set('');
        this.rejectComment = '';
        // Mise à jour locale du statut
        const docs = a.passport?.documents;
        const d = docs?.find(x => x.type === res.type);
        if (d) { d.status = res.status; d.reviewComment = res.reviewComment; }
        this.app.set({ ...a });
      },
      error: (e) => {
        this.reviewing.set(false);
        this.reviewError.set(e?.error?.error || `Action impossible (HTTP ${e?.status ?? '?'}).`);
      },
    });
  }

  // ── Fiche ressenti post-visite (privée) ──
  feedbackCriteria = [
    { key: 'punctuality'   as const, label: 'Ponctualité' },
    { key: 'presentation'  as const, label: 'Présentation' },
    { key: 'communication' as const, label: 'Communication' },
    { key: 'interest'      as const, label: 'Intérêt réel' },
    { key: 'compatibility' as const, label: 'Compatibilité ressentie' },
  ];
  fb: { punctuality: number | null; presentation: number | null; communication: number | null;
        interest: number | null; compatibility: number | null;
        positives: string; negatives: string; comment: string } =
    { punctuality: null, presentation: null, communication: null, interest: null, compatibility: null,
      positives: '', negatives: '', comment: '' };
  fbSaving = signal(false);
  fbSaved  = signal(false);
  fbError  = signal('');

  setFbNote(key: 'punctuality'|'presentation'|'communication'|'interest'|'compatibility', n: number): void {
    this.fb[key] = this.fb[key] === n ? null : n;
  }

  loadFeedback(applicationId: string): void {
    this.http.get<{ data: { punctuality: number | null; presentation: number | null; communication: number | null; interest: number | null; compatibility: number | null; positives?: string | null; negatives?: string | null; comment?: string | null } | null }>(`${environment.apiUrl}/applications/${applicationId}/visit-feedback`).subscribe({
      next: (res) => {
        if (res.data) {
          this.fb = {
            punctuality: res.data.punctuality, presentation: res.data.presentation,
            communication: res.data.communication, interest: res.data.interest,
            compatibility: res.data.compatibility,
            positives: res.data.positives ?? '', negatives: res.data.negatives ?? '',
            comment: res.data.comment ?? '',
          };
        }
      },
      error: () => {},
    });
  }

  saveFeedback(): void {
    const a = this.app(); if (!a) return;
    this.fbSaving.set(true); this.fbError.set(''); this.fbSaved.set(false);
    this.http.put(`${environment.apiUrl}/applications/${a.id}/visit-feedback`, {
      ...this.fb,
      positives: this.fb.positives.trim() || null,
      negatives: this.fb.negatives.trim() || null,
      comment: this.fb.comment.trim() || null,
    }).subscribe({
      next: () => {
        this.fbSaving.set(false);
        this.fbSaved.set(true);
        setTimeout(() => this.fbSaved.set(false), 2500);
      },
      error: (e) => { this.fbSaving.set(false); this.fbError.set(e?.error?.error || 'Enregistrement impossible.'); },
    });
  }

  // ── Retour choisi au candidat (via la messagerie — jamais la fiche privée) ──
  quickReplies = [
    'Merci pour votre visite.',
    'Votre dossier est toujours en cours.',
    'Nous attendons encore quelques visites.',
    'Votre candidature progresse.',
  ];
  feedbackMsg = '';
  fbMsgSending = signal(false);
  fbMsgSent    = signal(false);

  sendFeedbackMsg(): void {
    const a = this.app(); const content = this.feedbackMsg.trim();
    if (!a || !content) return;
    this.fbMsgSending.set(true); this.fbMsgSent.set(false);
    this.http.post(`${environment.apiUrl}/applications/${a.id}/messages`, { content }).subscribe({
      next: () => {
        this.fbMsgSending.set(false);
        this.fbMsgSent.set(true);
        this.feedbackMsg = '';
        setTimeout(() => this.fbMsgSent.set(false), 3000);
      },
      error: () => this.fbMsgSending.set(false),
    });
  }

  noteSaved = signal(false);
  noteError = signal('');

  saveNote(): void {
    const a = this.app(); if (!a) return;
    this.noteError.set('');
    this.svc.updateNote(a.id, this.note).subscribe({
      next: () => {
        this.noteSaved.set(true);
        setTimeout(() => this.noteSaved.set(false), 2000);
      },
      error: (e) => this.noteError.set(e?.error?.error || 'Note non enregistrée.'),
    });
  }

  statusLabel(s: string): string { return ApplicationService.statusLabel(s); }
  statusColor(s: string): string { return ApplicationService.statusColor(s); }

}
