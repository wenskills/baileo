import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protège les routes authentifiées.
 * Vérifie le token ET que la session est restaurée pour éviter
 * le flash d'une page protégée avec un token expiré.
 */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Pas de token du tout → redirect immédiat
  if (!auth.getToken()) {
    router.navigate(['/connexion']);
    return false;
  }

  // Si la session est déjà restaurée et que l'utilisateur n'est pas chargé
  // (token expiré détecté par restoreSession), on redirige
  if (auth.sessionRestored() && !auth.currentUser()) {
    router.navigate(['/connexion']);
    return false;
  }

  return true;
};

/**
 * Protège /onboarding : connecté ET status pending.
 * Si déjà actif → tableau de bord.
 */
export const onboardingGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.getToken()) {
    router.navigate(['/connexion']);
    return false;
  }

  if (auth.sessionRestored() && !auth.currentUser()) {
    router.navigate(['/connexion']);
    return false;
  }

  const user = auth.currentUser();
  if (user && user.status === 'active') {
    router.navigate(['/tableau-de-bord']);
    return false;
  }

  return true;
};

/**
 * Pages publiques (connexion, inscription).
 * Redirige vers tableau-de-bord uniquement si session restaurée ET user chargé.
 * Évite la boucle infinie token expiré → guestGuard → authGuard → logout → guestGuard.
 */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Rediriger seulement si on a un token valide ET un user chargé
  if (auth.getToken() && auth.currentUser()) {
    router.navigate(['/tableau-de-bord']);
    return false;
  }

  return true;
};


/**
 * Réservé aux propriétaires / agences.
 * Un candidat qui tape l'URL est renvoyé à son tableau de bord
 * (le backend vérifie aussi — défense en profondeur).
 */
export const ownerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.getToken()) { router.navigate(['/connexion']); return false; }
  if (auth.sessionRestored() && !auth.currentUser()) { router.navigate(['/connexion']); return false; }

  const roles = auth.currentUser()?.roles ?? [];
  if (auth.sessionRestored() && !roles.includes('ROLE_OWNER') && !roles.includes('ROLE_AGENCY')) {
    router.navigate(['/tableau-de-bord']);
    return false;
  }
  return true;
};

/**
 * Réservé aux candidats.
 */
export const candidateGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.getToken()) { router.navigate(['/connexion']); return false; }
  if (auth.sessionRestored() && !auth.currentUser()) { router.navigate(['/connexion']); return false; }

  const roles = auth.currentUser()?.roles ?? [];
  if (auth.sessionRestored() && !roles.includes('ROLE_CANDIDATE')) {
    router.navigate(['/tableau-de-bord']);
    return false;
  }
  return true;
};
