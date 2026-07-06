import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Page 404 — introuvable, avec porte de sortie (spec). */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6" style="background:#F5F7F6">
      <div class="text-center" style="max-width:26rem">
        <p style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:4rem;color:#1B4438">404</p>
        <h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.25rem;color:#0A1F1A;margin-bottom:.5rem">Page introuvable</h1>
        <p style="font-size:.875rem;color:#6B7280;font-family:Inter,sans-serif;margin-bottom:1.5rem">
          Cette page n'existe pas ou n'existe plus — l'annonce a peut-être été pourvue.
        </p>
        <a routerLink="/" class="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
           style="background:#1B4438;font-family:Inter,sans-serif;text-decoration:none">Retour à l'accueil</a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
