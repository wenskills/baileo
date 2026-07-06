import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PhotoUploadResult {
  url: string;
  relative: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  mime: string;
  total: number;
}

export interface UploadProgress {
  percent: number;
  done: boolean;
  result?: PhotoUploadResult;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  constructor(private http: HttpClient) {}

  /**
   * Upload une photo pour une campagne.
   * Retourne un Observable avec la progression (0-100%) puis le résultat.
   */
  upload(campaignId: string, file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('photo', file);

    const req = new HttpRequest(
      'POST',
      `${environment.apiUrl}/campaigns/${campaignId}/photos`,
      formData,
      { reportProgress: true }
    );

    return this.http.request(req).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total
            ? Math.round((100 * event.loaded) / event.total)
            : 0;
          return { percent, done: false };
        }
        if (event.type === HttpEventType.Response) {
          return { percent: 100, done: true, result: event.body as PhotoUploadResult };
        }
        return { percent: 0, done: false };
      })
    );
  }

  /** Supprimer une photo */
  delete(campaignId: string, filename: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(
      `${environment.apiUrl}/campaigns/${campaignId}/photos/${filename}`
    );
  }

  /** Réordonner les photos */
  reorder(campaignId: string, order: string[]): Observable<{ photos: string[] }> {
    return this.http.patch<{ photos: string[] }>(
      `${environment.apiUrl}/campaigns/${campaignId}/photos/reorder`,
      { order }
    );
  }

  /** Résoudre l'URL absolue depuis une URL relative */
  static resolveUrl(relative: string): string {
    if (!relative) return '';
    if (relative.startsWith('http')) return relative;
    return environment.apiUrl.replace('/api', '') + relative;
  }

  /** Extraire le nom de fichier depuis une URL relative */
  static filenameFromUrl(url: string): string {
    return url.split('/').pop() ?? '';
  }

  /** Valider un fichier avant upload */
  static validate(file: File): string | null {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxMb   = 5;

    if (!allowed.includes(file.type)) {
      return `Format non supporté : ${file.type}. Utilisez JPG, PNG ou WebP.`;
    }
    if (file.size > maxMb * 1024 * 1024) {
      return `Fichier trop lourd : ${(file.size / 1024 / 1024).toFixed(1)} Mo (max ${maxMb} Mo).`;
    }
    return null;
  }
}
