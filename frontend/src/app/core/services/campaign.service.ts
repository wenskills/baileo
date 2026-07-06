import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number; limit: number; total: number;
    totalPages: number; hasNext: boolean; hasPrev: boolean;
  };
}

export interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  address: string;
  propertyType: string;
  rentalType?: string;
  rent: number;
  charges: number;
  deposit?: number;
  surface?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  minDuration?: number;
  description?: string;
  amenities?: string[];
  photos?: string[];
  documentsRequired?: string[];
  availableAt?: string;
  status: string;
  createdAt: string;
  publishedAt?: string;
  slug?: string | null;
  preciseAddressVisible?: boolean;
  dpe?: string | null;
  ges?: string | null;
  floor?: number | null;
  hasElevator?: boolean;
  heatingType?: string | null;
  extras?: { label: string; value: string }[];
  updatedAt?: string;
  applicationCount?: number;
  myApplicationId?: string;
  myApplicationStatus?: string;
}

export interface CampaignStats {
  totalApplications: number;
  byStatus: Record<string, number>;
  averageScore?: number;
  highCompatibility: number;
}

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly base = `${environment.apiUrl}/campaigns`;

  constructor(private http: HttpClient) {}

  list(filters?: { q?: string; maxRent?: number; type?: string; page?: number; limit?: number }): Observable<PaginatedResponse<Campaign>> {
    let params = new HttpParams();
    if (filters?.q)      params = params.set('q', filters.q);
    if (filters?.maxRent) params = params.set('maxRent', filters.maxRent.toString());
    if (filters?.type)   params = params.set('type', filters.type);
    if (filters?.page)   params = params.set('page', filters.page.toString());
    if (filters?.limit)  params = params.set('limit', (filters.limit ?? 20).toString());
    return this.http.get<PaginatedResponse<Campaign>>(this.base, { params });
  }

  get(id: string): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.base}/${id}`);
  }

  create(data: Partial<Campaign>): Observable<Campaign> {
    return this.http.post<Campaign>(this.base, data);
  }

  update(id: string, data: Partial<Campaign>): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.base}/${id}`, data);
  }

  publish(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.base}/${id}/publish`, {});
  }

  pause(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/${id}/pause`, {});
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }

  stats(id: string): Observable<CampaignStats> {
    return this.http.get<CampaignStats>(`${this.base}/${id}/stats`);
  }

  /** Labels lisibles pour les statuts */
  static statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Brouillon', active: 'Publiée', paused: 'En pause', closed: 'Fermée'
    };
    return map[status] ?? status;
  }

  static statusColor(status: string): string {
    const map: Record<string, string> = {
      draft: '#6B7280', active: '#2C7A5E', paused: '#F97316', closed: '#EF4444'
    };
    return map[status] ?? '#6B7280';
  }

  static propertyTypeLabel(type: string): string {
    const map: Record<string, string> = {
      apartment: 'Appartement', house: 'Maison', colocation: 'Colocation',
      studio: 'Studio', bureau: 'Bureau', commerce: 'Commerce'
    };
    return map[type] ?? type;
  }
}
