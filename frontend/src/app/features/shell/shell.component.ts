import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  styles: [`
    /* ── Global card style (backup si pas défini dans styles.css) ── */
    :host ::ng-deep .card {
      background: white;
      border-radius: .875rem;
      border: 1.5px solid #F0F0F0;
      box-shadow: 0 1px 4px rgba(10,31,26,.04);
    }
    /* Sidebar claire — conforme aux maquettes 5/6/9/11/12 */
    .nav-item {
      display:flex;align-items:center;gap:.625rem;padding:.5625rem .75rem;
      border-radius:.625rem;font-size:.8125rem;font-weight:500;
      color:#6B7280;transition:all .15s;text-decoration:none;
      font-family:Inter,sans-serif;cursor:pointer;border:none;
      background:transparent;width:100%;text-align:left;
    }
    .nav-item:hover { background:#F5F7F6;color:#0A1F1A; }
    .nav-item.active-nav { background:#E0EDE8;color:#1B4438;font-weight:600; }
    .nav-icon { width:1rem;height:1rem;flex-shrink:0; }
    .section-label {
      padding:.75rem .75rem .25rem;font-size:.625rem;font-weight:700;
      letter-spacing:.14em;text-transform:uppercase;
      color:#9CA3AF;font-family:Inter,sans-serif;
    }
  `],
  template: `
    <div class="flex h-screen overflow-hidden" style="background:#F5F7F6">
      <aside class="w-60 shrink-0 flex flex-col overflow-hidden" style="background:white;border-right:1px solid #F0F0F0">

        <!-- Logo -->
        <div class="flex items-center gap-2.5 px-4 py-4 shrink-0"
             style="border-bottom:1px solid #F0F0F0">
          <img src="assets/logo.png" alt="Baileo"
               style="height:1.875rem;width:auto" />
          <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.0625rem;color:#0A1F1A;letter-spacing:-.03em">
            BAILEO
          </span>
        </div>

        <!-- User -->
        <div class="flex items-center gap-2.5 px-4 py-2.5 shrink-0"
             style="border-bottom:1px solid #F0F0F0">
          <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
               style="background:linear-gradient(135deg,#2C7A5E,#1B4438)">
            {{ initials() }}
          </div>
          <div class="min-w-0 flex-1">
            <p style="font-size:.75rem;font-weight:600;color:#0A1F1A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {{ user()?.firstName }} {{ user()?.lastName }}
            </p>
            <p style="font-size:.625rem;color:#9CA3AF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {{ roleLabel() }}
            </p>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-2 py-2 overflow-y-auto">
          <a routerLink="/tableau-de-bord" routerLinkActive="active-nav" class="nav-item">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
            </svg>
            Tableau de bord
          </a>

          @if (isOwner()) {
            <p class="section-label">Locations</p>
            <a routerLink="/campagnes" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>
              </svg>
              Campagnes
            </a>
            <a routerLink="/candidatures" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
              </svg>
              Candidatures
            </a>
            <a routerLink="/visites" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
              Visites
            </a>
            <a routerLink="/messages" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
              Messages
              @if (unreadCount() > 0) {
                <span class="ml-auto min-w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style="background:#2C7A5E;font-size:.5625rem;padding:0 .25rem">
                  {{ unreadCount() > 99 ? '99+' : unreadCount() }}
                </span>
              }
            </a>
            @if (isAgency()) {
              <p class="section-label">Agence</p>
              @if (orgContext()) {
                <p class="px-3 pb-1" style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif">{{ orgContext() }}</p>
              }
              <a routerLink="/agence/candidatures" routerLinkActive="active-nav" class="nav-item">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>
                </svg>
                Candidatures
              </a>
              <a routerLink="/equipe" routerLinkActive="active-nav" class="nav-item">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                </svg>
                Équipe
              </a>
              <a routerLink="/organisation" routerLinkActive="active-nav" class="nav-item">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
                </svg>
                Organisation
              </a>
            }
            <a routerLink="/mon-profil" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Mon profil
            </a>
          } @else {
            <a routerLink="/recherche" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              Annonces
            </a>
            <p class="section-label">Dossier</p>
            <a routerLink="/rental-passport" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
              Mon Rental Passport
            </a>
            <a routerLink="/mes-candidatures" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
              </svg>
              Mes candidatures
            </a>
            <a routerLink="/messages" routerLinkActive="active-nav" class="nav-item">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
              Messages
              @if (unreadCount() > 0) {
                <span class="ml-auto min-w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style="background:#2C7A5E;font-size:.5625rem;padding:0 .25rem">
                  {{ unreadCount() > 99 ? '99+' : unreadCount() }}
                </span>
              }
            </a>
          }
        </nav>

        <!-- Logout -->
        <div class="px-2 pb-3 shrink-0" style="border-top:1px solid #F0F0F0">
          <div class="h-2"></div>
          <button type="button" (click)="logout()" class="nav-item w-full">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
            </svg>
            Se déconnecter
          </button>
        </div>
      </aside>

      <main class="flex-1 overflow-auto flex flex-col">
        <!-- Topbar : cloche de notifications (maquettes 5/6/12) -->
        <div class="flex items-center justify-end px-6 py-2.5 shrink-0 relative"
             style="background:white;border-bottom:1px solid #F0F0F0">
          <button type="button" (click)="toggleNotifs()"
                  class="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-gray-50"
                  style="border:1.5px solid #E5E7EB;background:white">
            <svg class="w-4.5 h-4.5" style="width:1.125rem;height:1.125rem;color:#374151" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
            </svg>
            @if (notifUnread() > 0) {
              <span class="absolute -top-1 -right-1 min-w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                    style="background:#EF4444;font-size:.5625rem;padding:0 .2rem;font-family:Inter,sans-serif">
                {{ notifUnread() > 9 ? '9+' : notifUnread() }}
              </span>
            }
          </button>

          <!-- Dropdown notifications -->
          @if (notifOpen()) {
            <div class="absolute right-6 top-14 w-96 rounded-2xl overflow-hidden z-50"
                 style="background:white;border:1.5px solid #F0F0F0;box-shadow:0 12px 32px rgba(10,31,26,.12)">
              <div class="flex items-center justify-between px-4 py-3" style="border-bottom:1px solid #F0F0F0">
                <p style="font-size:.875rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">Notifications</p>
                @if (notifUnread() > 0) {
                  <button type="button" (click)="markAllRead()"
                          style="font-size:.75rem;font-weight:600;color:#2C7A5E;font-family:Inter,sans-serif;background:none;border:none;cursor:pointer">
                    Tout marquer comme lu
                  </button>
                }
              </div>
              <div class="max-h-96 overflow-y-auto">
                @for (n of notifications(); track n.id) {
                  <button type="button" (click)="openNotif(n)"
                          class="w-full text-left px-4 py-3 flex gap-3 transition-all hover:bg-gray-50"
                          style="border-bottom:1px solid #F8F8F8;background:none;border-left:none;border-right:none;border-top:none;cursor:pointer"
                          [style.background]="n.read ? 'white' : '#F8FBF9'">
                    <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          [style.background]="notifColor(n.type) + '18'">
                      <span class="w-2 h-2 rounded-full" [style.background]="notifColor(n.type)"></span>
                    </span>
                    <div class="min-w-0 flex-1">
                      <p style="font-size:.8125rem;font-weight:700;color:#0A1F1A;font-family:Inter,sans-serif">{{ n.title }}</p>
                      <p style="font-size:.75rem;color:#6B7280;font-family:Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">{{ n.body }}</p>
                      <p style="font-size:.6875rem;color:#9CA3AF;font-family:Inter,sans-serif;margin-top:.125rem">{{ n.createdAt | date:'dd/MM à HH:mm' }}</p>
                    </div>
                    @if (!n.read) {
                      <span class="w-2 h-2 rounded-full shrink-0 mt-1.5" style="background:#2C7A5E"></span>
                    }
                  </button>
                } @empty {
                  <div class="px-4 py-8 text-center">
                    <p style="font-size:.8125rem;color:#9CA3AF;font-family:Inter,sans-serif">Aucune notification</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <div class="flex-1 overflow-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  user          = this.auth.currentUser;
  unreadCount   = signal(0);
  notifUnread   = signal(0);
  notifOpen     = signal(false);
  notifications = signal<AppNotification[]>([]);
  private pSub?: Subscription;
  private nSub?: Subscription;

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private nSvc: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Compteur de messages non lus toutes les 30s
    this.pSub = interval(30000).pipe(
      switchMap(() => this.http.get<{ unread: number }>(`${environment.apiUrl}/messages/unread-total`))
    ).subscribe({
      next: (r) => this.unreadCount.set(r.unread ?? 0),
      error: () => {},
    });
    // Compteur de notifications non lues (immédiat + toutes les 30s)
    this.nSvc.unreadCount().subscribe({ next: r => this.notifUnread.set(r.unread ?? 0), error: () => {} });
    this.nSub = interval(30000).pipe(
      switchMap(() => this.nSvc.unreadCount())
    ).subscribe({
      next: (r) => this.notifUnread.set(r.unread ?? 0),
      error: () => {},
    });
  }

  ngOnDestroy(): void { this.pSub?.unsubscribe(); this.nSub?.unsubscribe(); }

  toggleNotifs(): void {
    this.notifOpen.update(v => !v);
    if (this.notifOpen()) {
      this.nSvc.list(1, 15).subscribe({
        next: (res) => { this.notifications.set(res.data); this.notifUnread.set(res.meta.unread); },
        error: () => {},
      });
    }
  }

  openNotif(n: AppNotification): void {
    if (!n.read) {
      this.nSvc.markRead(n.id).subscribe({ next: () => {}, error: () => {} });
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x));
      this.notifUnread.update(v => Math.max(0, v - 1));
    }
    this.notifOpen.set(false);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markAllRead(): void {
    this.nSvc.markAllRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(x => ({ ...x, read: true })));
        this.notifUnread.set(0);
      },
      error: () => {},
    });
  }

  notifColor(type: string): string {
    const map: Record<string, string> = {
      application_created: '#2C7A5E', status_changed: '#3B82F6',
      visit_booked: '#8B5CF6', visit_cancelled: '#EF4444',
      message_received: '#F97316',
      application_accepted: '#2C7A5E', application_rejected: '#EF4444',
      document_requested: '#EAB308', document_uploaded: '#2C7A5E',
    };
    return map[type] ?? '#9CA3AF';
  }
  isOwner(): boolean {
    const r = this.user()?.roles ?? [];
    return r.includes('ROLE_OWNER') || r.includes('ROLE_AGENCY');
  }
  initials(): string {
    const u = this.user();
    if (!u) return '?';
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] || u.firstName?.[1] || '')).toUpperCase() || '?';
  }
  roleLabel(): string {
    const r = this.user()?.roles ?? [];
    if (r.includes('ROLE_OWNER'))     return 'Propriétaire';
    if (r.includes('ROLE_AGENCY'))    return 'Agence';
    if (r.includes('ROLE_CANDIDATE')) return 'Candidat';
    return 'Utilisateur';
  }
  isAgency(): boolean {
    return (this.user()?.roles ?? []).includes('ROLE_AGENCY');
  }

  orgName = signal('');
  orgRole = signal('');
  private orgLoaded = false;

  orgContext(): string {
    if (this.isAgency() && !this.orgLoaded) {
      this.orgLoaded = true;
      this.http.get<{ name: string; myRole: string | null }>(`${environment.apiUrl}/organizations/current`).subscribe({
        next: (o) => {
          this.orgName.set(o.name ?? '');
          const map: Record<string, string> = { admin: 'Admin agence', manager: 'Manager', agent: 'Agent immobilier', viewer: 'Lecture seule' };
          this.orgRole.set(map[o.myRole ?? ''] ?? '');
        },
        error: () => {},
      });
    }
    return this.orgName() ? `${this.orgName()}${this.orgRole() ? ' · ' + this.orgRole() : ''}` : '';
  }

  logout(): void { this.auth.logout(); }
}
