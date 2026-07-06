import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingGuard, ownerGuard, candidateGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Pages publiques (Phase 1 — inchangées) ──────────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'suivi/:token',
    loadComponent: () => import('./features/public/campaign-follow.component').then(m => m.CampaignFollowComponent),
  },
  {
    path: 'invitation/:token',
    loadComponent: () => import('./features/auth/accept-invitation.component').then(m => m.AcceptInvitationComponent),
  },
  {
    path: 'inscription',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'mot-de-passe-oublie',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reinitialiser-mot-de-passe',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'auth/google/success',
    loadComponent: () => import('./features/auth/google-callback/google-callback.component').then(m => m.GoogleCallbackComponent),
  },
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/auth/onboarding/onboarding.component').then(m => m.OnboardingComponent),
  },

  // ── Annonce publique Phase 2 (sans authGuard) ─────────────────────────────
  {
    path: 'annonces/:id',
    loadComponent: () => import('./features/public/campaign-public.component').then(m => m.CampaignPublicComponent),
  },

  // ── Zone protégée — Shell Phase 2 (sidebar + layout) ─────────────────────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      // Propriétaire
      { path: 'campagnes',        canActivate: [ownerGuard], loadComponent: () => import('./features/campaigns/campaigns.component').then(m => m.CampaignsComponent) },
      { path: 'campagnes/creer',  canActivate: [ownerGuard], loadComponent: () => import('./features/campaigns/campaign-create.component').then(m => m.CampaignCreateComponent) },
      { path: 'campagnes/:id/postuler', canActivate: [candidateGuard], loadComponent: () => import('./features/public/apply.component').then(m => m.ApplyComponent) },
      { path: 'campagnes/:id',    canActivate: [ownerGuard], loadComponent: () => import('./features/campaigns/campaign-detail.component').then(m => m.CampaignDetailComponent) },
      { path: 'candidatures',     canActivate: [ownerGuard], loadComponent: () => import('./features/applications/applications.component').then(m => m.ApplicationsComponent) },
      { path: 'candidatures/:id', canActivate: [ownerGuard], loadComponent: () => import('./features/applications/application-detail.component').then(m => m.ApplicationDetailComponent) },
      { path: 'visites',          canActivate: [ownerGuard], loadComponent: () => import('./features/visits/visits.component').then(m => m.VisitsComponent) },
      { path: 'mon-profil',       canActivate: [ownerGuard], loadComponent: () => import('./features/profile/owner-profile.component').then(m => m.OwnerProfileComponent) },
      { path: 'agence/candidatures', canActivate: [ownerGuard], loadComponent: () => import('./features/agency/agency-applications.component').then(m => m.AgencyApplicationsComponent) },
      { path: 'equipe',           canActivate: [ownerGuard], loadComponent: () => import('./features/agency/team.component').then(m => m.TeamComponent) },
      { path: 'organisation',     canActivate: [ownerGuard], loadComponent: () => import('./features/agency/organization-settings.component').then(m => m.OrganizationSettingsComponent) },
      // Candidat
      { path: 'rental-passport',  canActivate: [candidateGuard], loadComponent: () => import('./features/passport/rental-passport.component').then(m => m.RentalPassportComponent) },
      { path: 'recherche',        canActivate: [candidateGuard], loadComponent: () => import('./features/public/browse.component').then(m => m.BrowseComponent) },
      { path: 'mes-candidatures', canActivate: [candidateGuard], loadComponent: () => import('./features/applications/my-applications.component').then(m => m.MyApplicationsComponent) },
      { path: 'mes-candidatures/:id', canActivate: [candidateGuard], loadComponent: () => import('./features/applications/candidate-application-detail.component').then(m => m.CandidateApplicationDetailComponent) },
      // Commun
      { path: 'messages',         loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent) },
      { path: '',                  redirectTo: 'tableau-de-bord', pathMatch: 'full' },
    ],
  },

  { path: '403', loadComponent: () => import('./features/errors/forbidden.component').then(m => m.ForbiddenComponent) },
  { path: '**', loadComponent: () => import('./features/errors/not-found.component').then(m => m.NotFoundComponent) },
];
