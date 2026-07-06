import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Application {
  id: string;
  campaignId?: string;
  status: string;
  score?: number;
  scoreLabel?: string;
  scoreColor?: string;
  scoreBreakdown?: ScoreBreakdown[];
  coverLetter?: string;
  ownerNote?: string;
  tags?: string[];
  compatibilityHint?: string;
  viewedAt?: string | null;
  documentsRequired?: string[];
  createdAt: string;
  updatedAt?: string;
  statusChangedAt?: string;
  campaign?: {
    ownerName?: string | null;
    id: string; title: string; address: string;
    rent: number; charges: number; surface?: number;
    rooms?: number; propertyType: string;
    photos?: string[]; availableAt?: string;
  };
  candidate?: { id: string; firstName: string; lastName: string; email: string };
  passport?: {
    completionRate: number; contractType: string; employer: string;
    monthlyIncome?: number; guarantorRelation: string; guarantorIncome?: number;
    availabilityDate?: string; documentsCount: number; preferredCity?: string;
    documents?: { type: string; name: string; url: string; uploadedAt?: string | null;
                  status: string; reviewComment?: string | null }[];
  };
}

export interface ScoreBreakdown {
  label: string;
  weight: number;
  score: number;
  max: number;
  reason: string;
}

export type PipelineColumn = {
  status: string;
  label: string;
  color: string;
  applications: Application[];
};

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Candidat : mes candidatures (paginé) */
  myApplications(page = 1, limit = 20): Observable<{ data: Application[]; meta: any }> {
    return this.http.get<{ data: Application[]; meta: any }>(
      `${this.base}/my-applications?page=${page}&limit=${limit}`
    );
  }

  /** Propriétaire : candidatures d'une campagne (paginé) */
  byCampaign(campaignId: string, page = 1, limit = 50): Observable<{ data: Application[]; meta: any }> {
    return this.http.get<{ data: Application[]; meta: any }>(
      `${this.base}/campaigns/${campaignId}/applications?page=${page}&limit=${limit}`
    );
  }

  /** Détail */
  get(id: string): Observable<Application> {
    return this.http.get<Application>(`${this.base}/applications/${id}`);
  }

  /** Postuler à une campagne */
  apply(campaignId: string, coverLetter?: string): Observable<Application> {
    return this.http.post<Application>(`${this.base}/campaigns/${campaignId}/apply`, { coverLetter });
  }

  /** Changer le statut (propriétaire) */
  updateStatus(id: string, status: string): Observable<{ id: string; status: string }> {
    return this.http.patch<{ id: string; status: string }>(`${this.base}/applications/${id}/status`, { status });
  }

  /** Note privée */
  updateNote(id: string, note: string): Observable<{ id: string; ownerNote: string }> {
    return this.http.patch<{ id: string; ownerNote: string }>(`${this.base}/applications/${id}/note`, { note });
  }

  /** Recalculer le score */
  recalcScore(id: string): Observable<{ score: number; label: string; breakdown: ScoreBreakdown[] }> {
    return this.http.post<any>(`${this.base}/applications/${id}/score`, {});
  }

  /** Organiser en colonnes Kanban */
  static toPipeline(applications: Application[]): PipelineColumn[] {
    const columns = [
      { status: 'new',             label: 'Nouveaux',       color: '#6B7280' },
      { status: 'prequalification', label: 'Préqualification', color: '#3B82F6' },
      { status: 'documents',       label: 'Documents',      color: '#F97316' },
      { status: 'visite',          label: 'Visites',        color: '#8B5CF6' },
      { status: 'decision',        label: 'Décision',       color: '#EAB308' },
      { status: 'signature',       label: 'Signature',      color: '#2C7A5E' },
    ];

    return columns.map(col => ({
      ...col,
      applications: applications.filter(a => a.status === col.status),
    }));
  }

  static statusLabel(status: string): string {
    const map: Record<string, string> = {
      new: 'Nouveau', prequalification: 'Préqualification', documents: 'Documents',
      visite: 'Visite', decision: 'Décision', signature: 'Signature',
      accepted: 'Accepté', waitlist: 'Liste d\'attente',
      refused: 'Refusé', cancelled: 'Annulé',
    };
    return map[status] ?? status;
  }

  static statusColor(status: string): string {
    const map: Record<string, string> = {
      new: '#6B7280', prequalification: '#3B82F6', documents: '#F97316',
      visite: '#8B5CF6', decision: '#EAB308', signature: '#2C7A5E',
      accepted: '#2C7A5E', waitlist: '#F59E0B', cancelled: '#9CA3AF', refused: '#EF4444',
    };
    return map[status] ?? '#6B7280';
  }
}
