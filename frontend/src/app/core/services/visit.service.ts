import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VisitSlot {
  id: string;
  campaignId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: string;
  isBookable: boolean;
  location?: string | null;
  // owner only
  bookings?: {
    status: string; id: string; applicationId: string; candidateName: string; bookedAt: string }[];
  // candidate only
  myBookingId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class VisitService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  slots(campaignId: string): Observable<{ data: VisitSlot[] }> {
    return this.http.get<{ data: VisitSlot[] }>(`${this.api}/campaigns/${campaignId}/visit-slots`);
  }

  createSlot(campaignId: string, payload: { startsAt: string; endsAt: string; capacity: number; location?: string }): Observable<VisitSlot> {
    return this.http.post<VisitSlot>(`${this.api}/campaigns/${campaignId}/visit-slots`, payload);
  }

  cancelSlot(slotId: string): Observable<{ cancelled: boolean }> {
    return this.http.delete<{ cancelled: boolean }>(`${this.api}/visit-slots/${slotId}`);
  }

  book(slotId: string): Observable<{ id: string; startsAt: string; location?: string }> {
    return this.http.post<{ id: string; startsAt: string; location?: string }>(`${this.api}/visit-slots/${slotId}/book`, {});
  }

  cancelBooking(bookingId: string): Observable<{ cancelled: boolean }> {
    return this.http.post<{ cancelled: boolean }>(`${this.api}/visit-bookings/${bookingId}/cancel`, {});
  }

  upcoming(): Observable<{ data: { bookingId: string; startsAt: string; endsAt: string; campaignTitle: string; campaignId: string; candidateName?: string; location?: string }[] }> {
    return this.http.get<{ data: { bookingId: string; startsAt: string; endsAt: string; campaignTitle: string; campaignId: string; candidateName?: string; location?: string }[] }>(`${this.api}/visits/upcoming`);
  }

  timeline(applicationId: string): Observable<{ data: TimelineEvent[] }> {
    return this.http.get<{ data: TimelineEvent[] }>(`${this.api}/applications/${applicationId}/timeline`);
  }
}

export interface TimelineEvent {
  id: string;
  type: string;
  message: string;
  actorRole: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}
