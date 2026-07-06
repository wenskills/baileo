import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: string;
  organizationId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'baileo_token';

  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);

  /**
   * C4 — Signal indiquant que la restauration de session est terminée.
   * Les guards attendent que ce signal soit true avant de prendre une décision,
   * ce qui évite la race condition entre restoreSession() et les guards.
   */
  sessionRestored = signal(false);

  constructor(private http: HttpClient, private router: Router) {
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      this.sessionRestored.set(true);
      return;
    }
    this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        this.sessionRestored.set(true);
      },
      error: (err) => {
        if (err?.status === 401 || err?.status === 403) {
          // Token réellement invalide → nettoyer
          this.clearSession();
        } else {
          // Erreur RÉSEAU ou 5xx (backend en train de démarrer, coupure...) :
          // on GARDE le token — sinon chaque redémarrage du backend déconnecte
          // l'utilisateur. Les guards laisseront passer (token présent),
          // et le prochain appel authentifié revalidera la session.
          console.warn('Session non vérifiable (backend indisponible ?) — token conservé.');
        }
        this.sessionRestored.set(true);
      },
    });
  }

  login(email: string, password: string): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(res => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          this.isAuthenticated.set(true);
        })
      );
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/register`, data);
  }

  loadMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }),
      catchError(err => {
        // Tout échec de /me signifie que la session n'est plus valide :
        // 401 = token expiré, 403 = accès révoqué, 0 = réseau
        // Dans tous les cas on remet currentUser à null pour éviter un état stale
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        // On ne logout() (redirect) que sur 401 — les autres erreurs sont gérées par le composant appelant
        if (err.status === 401) this.logout();
        throw err;
      })
    );
  }

  completeOnboarding(role: string, extra?: { mode?: 'create' | 'join'; organizationName?: string; invitationToken?: string }): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${environment.apiUrl}/onboarding/complete`, { role, ...(extra ?? {}) })
      .pipe(tap(user => this.currentUser.set(user)));
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Utilisé par GoogleCallbackComponent pour stocker le token reçu via redirect */
  storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.isAuthenticated.set(true);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/connexion']);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }
}
