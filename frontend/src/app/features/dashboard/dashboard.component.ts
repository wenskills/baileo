import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { DashboardOwnerComponent } from './dashboard-owner.component';
import { DashboardCandidateComponent } from './dashboard-candidate.component';
import { DashboardAgencyComponent, DashboardAgentComponent } from './dashboard-agency.component';

/**
 * Aiguillage du tableau de bord par rôle (spec Wendy) :
 *  - candidat → suivi personnel
 *  - propriétaire individuel → cockpit owner
 *  - membre d'agence admin/manager → dashboard AGENCE (pilotage organisation)
 *  - membre d'agence agent/viewer → dashboard AGENT (opérationnel personnel)
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardOwnerComponent, DashboardCandidateComponent, DashboardAgencyComponent, DashboardAgentComponent],
  template: `
    @if (!isOwnerSide()) {
      <app-dashboard-candidate />
    } @else if (!isAgency()) {
      <app-dashboard-owner />
    } @else if (orgRole() === null) {
      <div class="p-6 max-w-4xl mx-auto"><div class="card p-8 animate-pulse"><div class="h-5 bg-gray-100 rounded w-1/2"></div></div></div>
    } @else if (orgRole() === 'admin' || orgRole() === 'manager') {
      <app-dashboard-agency />
    } @else {
      <app-dashboard-agent />
    }
  `,
})
export class DashboardComponent implements OnInit {
  orgRole = signal<string | null>(null);

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    if (this.isAgency()) {
      this.http.get<{ myRole: string | null }>(`${environment.apiUrl}/organizations/current`).subscribe({
        next: (o) => this.orgRole.set(o.myRole ?? 'agent'),
        error: () => this.orgRole.set('agent'), // fallback opérationnel plutôt que rien
      });
    }
  }

  isOwnerSide(): boolean {
    const r = this.auth.currentUser()?.roles ?? [];
    return r.includes('ROLE_OWNER') || r.includes('ROLE_AGENCY');
  }

  isAgency(): boolean {
    return (this.auth.currentUser()?.roles ?? []).includes('ROLE_AGENCY');
  }
}
