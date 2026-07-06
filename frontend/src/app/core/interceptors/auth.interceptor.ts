import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Ne JAMAIS envoyer de Bearer sur les endpoints d'authentification publique :
  // un vieux token (clés JWT régénérées, session périmée) ferait échouer le
  // login en 401 AVANT que les identifiants ne soient lus par le firewall.
  const authEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password',
                         '/auth/reset-password', '/auth/verify-reset-token',
                         '/auth/google/'];
  const isAuthEndpoint = authEndpoints.some(r => req.url.includes(r));

  if (token && !isAuthEndpoint) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError(err => {
      // Auto-logout uniquement sur les routes protégées (pas sur les routes publiques)
      // pour éviter de déconnecter un utilisateur qui vérifie un lien de reset
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password',
                            '/auth/reset-password', '/auth/verify-reset-token'];
      const isPublicRoute = publicRoutes.some(r => req.url.includes(r));
      if (err.status === 401 && token && !isPublicRoute) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
