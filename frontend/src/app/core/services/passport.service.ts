import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PassportDocument {
  type: string; name: string; uploadedAt?: string; verified?: boolean; size?: number;
}

export interface RentalPassport {
  exists: boolean;
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  nationality?: string;
  phone?: string;
  currentAddress?: string;
  contractType?: string;
  employer?: string;
  monthlyIncome?: number;
  employmentDuration?: string;
  guarantorRelation?: string;
  guarantorName?: string;
  guarantorIncome?: number;
  maxRent?: number;
  minSurface?: number;
  preferredCity?: string;
  availabilityDate?: string;
  projectDuration?: string;
  documents?: PassportDocument[];
  completionRate?: number;
  cachedScore?: number;
  visibleToOwners?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DOCUMENT_TYPES = [
  { value: 'identity',         label: 'Pièce d\'identité',     required: true },
  { value: 'domicile',         label: 'Justificatif de domicile', required: true },
  { value: 'contract',         label: 'Contrat de travail',     required: true },
  { value: 'payslips',         label: '3 dernières fiches de paie', required: true },
  { value: 'tax',              label: 'Avis d\'imposition',     required: false },
  { value: 'rib',              label: 'RIB',                    required: false },
  { value: 'insurance',        label: 'Attestation d\'assurance', required: false },
  { value: 'guarantor_id',     label: 'Pièce d\'identité garant', required: false },
  { value: 'guarantor_income', label: 'Justificatifs revenus garant', required: false },
];

export const CONTRACT_TYPES = [
  { value: 'cdi',       label: 'CDI' },
  { value: 'cdd',       label: 'CDD' },
  { value: 'freelance', label: 'Indépendant / Freelance' },
  { value: 'student',   label: 'Étudiant' },
  { value: 'retired',   label: 'Retraité' },
  { value: 'unemployed',label: 'Sans emploi' },
];

@Injectable({ providedIn: 'root' })
export class PassportService {
  private readonly base = `${environment.apiUrl}/rental-passport`;

  constructor(private http: HttpClient) {}

  get(): Observable<RentalPassport> {
    return this.http.get<RentalPassport>(this.base);
  }

  save(data: Partial<RentalPassport>): Observable<RentalPassport> {
    return this.http.put<RentalPassport>(this.base, data);
  }

  getForOwner(userId: string): Observable<RentalPassport> {
    return this.http.get<RentalPassport>(`${this.base}/${userId}`);
  }

  delete(): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(this.base);
  }

  static scoreLabel(score: number): string {
    if (score >= 85) return 'Très bon profil';
    if (score >= 70) return 'Bon profil';
    if (score >= 55) return 'Profil à compléter';
    return 'Profil incomplet';
  }

  static scoreColor(score: number): string {
    if (score >= 85) return '#2C7A5E';
    if (score >= 70) return '#3B82F6';
    if (score >= 55) return '#F97316';
    return '#EF4444';
  }
}
