import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  data: AppNotification[];
  meta: { page: number; limit: number; total: number; totalPages: number; unread: number };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  list(page = 1, limit = 20): Observable<NotificationList> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<NotificationList>(this.base, { params });
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.http.get<{ unread: number }>(`${this.base}/unread-count`);
  }

  markRead(id: string): Observable<{ read: boolean }> {
    return this.http.post<{ read: boolean }>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<{ read: boolean }> {
    return this.http.post<{ read: boolean }>(`${this.base}/read-all`, {});
  }

}
