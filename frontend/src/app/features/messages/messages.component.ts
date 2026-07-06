import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription, interval, forkJoin } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService, Application } from '../../core/services/application.service';
import { environment } from '../../../environments/environment';

interface Message {
  id: string; applicationId: string;
  senderRole: string; isMine: boolean; content: string; read: boolean;
  readAt?: string; createdAt: string;
}

type Conv = Application & {
  isThread?: boolean;
  threadCandidateId?: string;
  interlocutorName?: string;
};
@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .conv-item { display:flex;align-items:center;gap:.75rem;padding:.75rem;border-radius:.75rem;cursor:pointer;transition:all .15s; }
    .conv-item:hover { background:#F5F7F6; }
    .conv-item.active { background:#E0EDE8; }
    .msg-bubble { max-width:75%;padding:.625rem .875rem;border-radius:1rem;font-size:.875rem;line-height:1.5;font-family:Inter,sans-serif; }
    .msg-bubble.mine { background:linear-gradient(135deg,#1B4438,#0A1F1A);color:white;border-bottom-right-radius:.25rem;margin-left:auto; }
    .msg-bubble.other { background:white;color:#0A1F1A;border:1.5px solid #F0F0F0;border-bottom-left-radius:.25rem; }
  `],
  template: `
    <div class="flex h-full" style="height:calc(100vh - 0px)">

      <!-- Conversations list -->
      <div class="w-72 shrink-0 flex flex-col" style="background:white;border-right:1px solid #F0F0F0">
        <div class="px-4 py-4 shrink-0" style="border-bottom:1px solid #F0F0F0">
          <h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:.9375rem;color:#0A1F1A;margin-bottom:.75rem">
            Messages
          </h2>
          <div class="relative">
            <input placeholder="Rechercher une conversation..."
                   class="w-full pl-8 pr-3 py-2 rounded-xl text-sm"
                   style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;outline:none;background:#F9FAFB"/>
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-2 py-2">
          @if (apps().length === 0) {
            <div class="text-center py-8">
              <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">
                Aucune conversation pour le moment.
              </p>
            </div>
          }
          @for (app of apps(); track app.id) {
            <div class="conv-item" [class.active]="selectedApp()?.id === app.id"
                 (click)="selectConversation(app)">
              <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                   style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
                {{ conversationInitials(app) }}
              </div>
              <div class="flex-1 min-w-0">
                <p style="font-size:.8125rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif" class="truncate">
                  {{ conversationName(app) }}
                </p>
                <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif" class="truncate">
                  {{ app.campaign?.title }}
                </p>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Chat area -->
      @if (selectedApp()) {
        <div class="flex-1 flex flex-col">

          <!-- Chat header -->
          <div class="px-5 py-3 shrink-0 flex items-center gap-3"
               style="background:white;border-bottom:1px solid #F0F0F0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                 style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
              {{ conversationInitials(selectedApp()!) }}
            </div>
            <div>
              <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
                {{ conversationName(selectedApp()!) }}
              </p>
              <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
                {{ selectedApp()!.campaign?.title }}
              </p>
            </div>
            <div class="ml-auto flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style="background:#E0EDE8;color:#1B4438;font-family:Inter,sans-serif">
                {{ statusLabel(selectedApp()!.status) }}
              </span>
            </div>
          </div>

          <!-- Messages -->
          <div #messagesContainer class="flex-1 overflow-y-auto px-5 py-4 space-y-3"
               style="background:#F9FAFB">
            @if (loadingMessages()) {
              <div class="flex items-center justify-center h-32">
                <div class="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                     style="border-color:#2C7A5E;border-top-color:transparent"></div>
              </div>
            }
            @for (msg of messages(); track msg.id) {
              <div [class]="msg.isMine ? 'flex flex-col items-end' : 'flex flex-col items-start'">
                @if (!msg.isMine) {
                  <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-bottom:.25rem;padding-left:.25rem">
                    {{ conversationName(selectedApp()!) }}
                  </p>
                }
                <div class="msg-bubble" [class.mine]="msg.isMine" [class.other]="!msg.isMine">
                  {{ msg.content }}
                </div>
                <p style="font-size:.625rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.25rem;padding-left:.25rem;padding-right:.25rem">
                  {{ msg.createdAt | date:'HH:mm' }}
                  @if (msg.isMine && msg.read) {
                    <span style="margin-left:.25rem">✓✓</span>
                  }
                </p>
              </div>
            } @empty {
              @if (!loadingMessages()) {
                <div class="flex flex-col items-center justify-center h-32">
                  <svg class="w-8 h-8 mb-2" style="color:#D1D5DB" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                  </svg>
                  <p style="font-size:.875rem;color:#9CA3AF;font-family:Inter,sans-serif">Démarrez la conversation</p>
                </div>
              }
            }
          </div>

          <!-- Input -->
          <div class="px-5 py-4 shrink-0 flex items-end gap-3"
               style="background:white;border-top:1px solid #F0F0F0">
            <textarea [(ngModel)]="newMessage" rows="1" placeholder="Écrire un message..."
                      (keydown.enter)="$event.preventDefault(); sendMessage()"
                      class="flex-1 px-4 py-2.5 rounded-xl resize-none"
                      style="border:1.5px solid #E5E7EB;font-family:Inter,sans-serif;font-size:.875rem;outline:none;max-height:120px;overflow-y:auto"
                      (focus)="onTextareaFocus($event)"
                      (blur)="onTextareaBlur($event)"></textarea>
            <button type="button" (click)="sendMessage()"
                    [disabled]="!newMessage.trim() || sending()"
                    class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                    style="background:linear-gradient(135deg,#1B4438,#0A1F1A)">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </div>
        </div>
      } @else {
        <!-- Empty state -->
        <div class="flex-1 flex items-center justify-center" style="background:#FAFBFA">
          <div class="text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style="background:#E0EDE8">
              <svg class="w-8 h-8" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
            </div>
            <p style="font-size:1rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">
              Sélectionnez une conversation
            </p>
            <p style="font-size:.875rem;color:#9CA3AF;margin-top:.25rem;font-family:Inter,sans-serif">
              Choisissez une candidature pour démarrer l'échange.
            </p>
          </div>
        </div>
      }
    </div>
  `,
})

export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  private pollSub?: Subscription;
  private lastMsgCount = 0;
  @ViewChild('messagesContainer') private container?: ElementRef;

  user     = this.auth.currentUser;
  apps     = signal<Conv[]>([]);
  selectedApp = signal<Conv | null>(null);
  messages    = signal<Message[]>([]);
  loadingMessages = signal(false);
  sending    = signal(false);
  newMessage = '';

  isOwner = () => {
    const r = this.user()?.roles ?? [];
    return r.includes('ROLE_OWNER') || r.includes('ROLE_AGENCY');
  };

  constructor(private auth: AuthService, private aSvc: ApplicationService, private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // La branche owner/candidat dépend de currentUser : attendre la restauration
    // de session (deep-link /messages?application=X après un rechargement complet)
    if (this.auth.sessionRestored()) { this.init(); return; }
    const wait = setInterval(() => {
      if (this.auth.sessionRestored()) { clearInterval(wait); this.init(); }
    }, 100);
    setTimeout(() => clearInterval(wait), 8000);
  }

  private init(): void {
    if (this.isOwner()) {
      // Propriétaire : agréger les conversations de TOUTES ses campagnes actives
      this.http.get<{ data: any[] }>(`${environment.apiUrl}/campaigns?limit=50`).subscribe({
        next: (res) => {
          const active = (res.data ?? []).filter((c: any) => c.status === 'active');
          if (!active.length) { this.apps.set([]); return; }
          forkJoin(
            active.map((c: any) =>
              this.http.get<{ data: Application[] }>(`${environment.apiUrl}/campaigns/${c.id}/applications?limit=100`)
            )
          ).subscribe({
            next: (results) => {
              const all = results.flatMap((r: any) => Array.isArray(r) ? r : (r?.data ?? []));
              this.apps.set(all.filter((a: Application) => !['refused', 'accepted', 'cancelled'].includes(a.status)));
              this.loadThreads();
            },
            error: () => this.apps.set([]),
          });
        },
        error: () => this.apps.set([]),
      });
    } else {
      this.aSvc.myApplications(1, 50).subscribe({
        next: (res) => {
          const list = res.data ?? [];
          this.apps.set(list.filter(a => !['refused', 'accepted', 'cancelled'].includes(a.status)));
          this.loadThreads();
        },
        error: () => this.apps.set([]),
      });
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.container) {
      this.container.nativeElement.scrollTop = this.container.nativeElement.scrollHeight;
    }
  }

  /** Fils de contact SANS candidature — fusionnés en tête de liste */
  private loadThreads(): void {
    this.http.get<{ data: { campaignId: string; candidateId: string; campaignTitle: string; interlocutorName: string; lastAt: string | null }[] }>(
      `${environment.apiUrl}/threads`
    ).subscribe({
      next: (res) => {
        const threads: Conv[] = (res.data ?? []).map(t => ({
          id: `thread:${t.campaignId}:${t.candidateId}`,
          isThread: true,
          threadCandidateId: t.candidateId,
          interlocutorName: t.interlocutorName,
          campaignId: t.campaignId,
          status: 'contact',
          createdAt: t.lastAt ?? '',
          campaign: { id: t.campaignId, title: t.campaignTitle } as Conv['campaign'],
        } as Conv));
        this.apps.update(list => [...threads, ...list.filter(a => !(a as Conv).isThread)]);
        this.openRequested();
      },
      error: () => this.openRequested(),
    });
  }

  /** Deep-links : ?application=X ou ?thread=CAMPAIGN[&candidate=ID] */
  private openRequested(): void {
    const qp = this.route.snapshot.queryParamMap;
    const wantedApp = qp.get('application');
    if (wantedApp) {
      const app = this.apps().find(a => a.id === wantedApp);
      if (app) this.selectConversation(app);
      return;
    }
    const threadCampaign = qp.get('thread');
    if (!threadCampaign) return;
    const cand = qp.get('candidate');
    const found = this.apps().find(a =>
      (a as Conv).isThread && a.campaignId === threadCampaign &&
      (!cand || (a as Conv).threadCandidateId === cand)
    );
    if (found) { this.selectConversation(found); return; }
    if (this.isOwner()) return; // owner : le fil apparaît quand le candidat écrit

    // Candidat : fil tout neuf (aucun message) → conversation vide prête à écrire
    const baseUrl = environment.apiUrl.endsWith('/api')
      ? environment.apiUrl.slice(0, -4) : environment.apiUrl;
    this.http.get<{ id: string; title: string; owner?: { name: string } | null }>(
      `${baseUrl}/api/annonces/${threadCampaign}`
    ).subscribe({
      next: (camp) => {
        const conv: Conv = {
          id: `thread:${camp.id}:me`,
          isThread: true,
          interlocutorName: camp.owner?.name ?? 'Propriétaire',
          campaignId: camp.id,
          status: 'contact',
          createdAt: '',
          campaign: { id: camp.id, title: camp.title } as Conv['campaign'],
        } as Conv;
        this.apps.update(list => [conv, ...list]);
        this.selectConversation(conv);
      },
      error: () => {},
    });
  }

  /** URL des messages selon le type de conversation */
  private messagesUrl(conv: Conv): string {
    if (conv.isThread) {
      const base = `${environment.apiUrl}/campaigns/${conv.campaignId}/thread/messages`;
      return this.isOwner() && conv.threadCandidateId
        ? `${base}?candidateId=${conv.threadCandidateId}` : base;
    }
    return `${environment.apiUrl}/applications/${conv.id}/messages`;
  }

  selectConversation(app: Conv): void {
    this.selectedApp.set(app);
    this.lastMsgCount = 0;
    this.stopPolling();
    this.loadMessages(app);
    this.startPolling(app);
  }

  private startPolling(conv: Conv): void {
    // Polling toutes les 4 secondes pour les nouveaux messages
    this.pollSub = interval(4000).pipe(
      exhaustMap(() => this.http.get<Message[] | { data: Message[] }>(this.messagesUrl(conv)))
    ).subscribe({
      next: (raw) => {
        const msgs = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (msgs.length !== this.lastMsgCount) {
          this.lastMsgCount = msgs.length;
          this.messages.set(msgs);
        }
      },
      error: () => {}, // Ne pas couper le polling sur erreur réseau temporaire
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadMessages(conv: Conv): void {
    this.loadingMessages.set(true);
    this.http.get<Message[] | { data: Message[] }>(this.messagesUrl(conv)).subscribe({
      next: (raw) => {
        const ms = Array.isArray(raw) ? raw : (raw?.data ?? []);
        this.messages.set(ms); this.lastMsgCount = ms.length; this.loadingMessages.set(false);
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    const app     = this.selectedApp();
    if (!content || !app || this.sending()) return;

    this.sending.set(true);
    const url  = app.isThread
      ? `${environment.apiUrl}/campaigns/${app.campaignId}/thread/messages`
      : `${environment.apiUrl}/applications/${app.id}/messages`;
    const body = app.isThread && this.isOwner() && app.threadCandidateId
      ? { content, candidateId: app.threadCandidateId }
      : { content };
    this.http.post<Message>(url, body).subscribe({
      next: (msg) => {
        this.messages.update(ms => [...ms, msg]);
        this.newMessage = '';
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  onTextareaFocus(e: FocusEvent): void {
    (e.target as HTMLTextAreaElement).style.borderColor = '#2C7A5E';
  }
  onTextareaBlur(e: FocusEvent): void {
    (e.target as HTMLTextAreaElement).style.borderColor = '#E5E7EB';
  }

  conversationName(app: Conv): string {
    if (app.isThread) return app.interlocutorName ?? 'Conversation';
    if (this.isOwner()) {
      return app.candidate ? `${app.candidate.firstName} ${app.candidate.lastName}` : 'Candidat';
    }
    // Candidat : nom réel du propriétaire (renvoyé par l'API, minimisé RGPD)
    return (app.campaign as { ownerName?: string } | undefined)?.ownerName ?? 'Propriétaire';
  }

  conversationInitials(app: Conv): string {
    const name = this.conversationName(app);
    const parts = name.split(' ').filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  statusLabel(s: string): string {
    if (s === 'contact') return 'Contact';
    return ApplicationService.statusLabel(s);
  }
}
