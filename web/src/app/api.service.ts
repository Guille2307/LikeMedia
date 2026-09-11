import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ServiceCategory = 'Presencia' | 'Venta' | 'Soporte';
export type Currency = 'USD' | 'EUR';

export interface ServicePackage {
  id: string;
  category: ServiceCategory;
  eyebrow: string;
  title: string;
  price: { usd: string; eur: string };
  description: string;
  includes: string[];
  featured?: boolean;
}

export interface BookingRequest { name: string; email: string; date: string; time: string; }
export interface BookingResponse extends BookingRequest {
  id: string;
  provider: string;
  meetingUrl: string;
  message: string;
}
export interface ContactRequest { name: string; email: string; company: string; message: string; }
export interface ContactResponse extends ContactRequest { id: string; status: string; message: string; }

interface LikeMediaRuntimeConfig {
  __LIKE_MEDIA_API_URL__?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = ((globalThis as LikeMediaRuntimeConfig).__LIKE_MEDIA_API_URL__ ?? 'http://localhost:3000/api').replace(/\/$/, '');

  getServices(): Observable<ServicePackage[]> {
    return this.http.get<ServicePackage[]>(`${this.baseUrl}/services`);
  }

  createBooking(payload: BookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/bookings`, payload);
  }

  createContact(payload: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${this.baseUrl}/contact`, payload);
  }
}
