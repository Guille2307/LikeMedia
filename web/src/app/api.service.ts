import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ServiceCategory = 'Presencia' | 'Venta' | 'Soporte';
export type Currency = 'USD' | 'EUR';
export type EmailDeliveryStatus = 'sent' | 'partial' | 'failed' | 'not_configured';

export interface ServicePackage {
  id: string;
  category: ServiceCategory;
  eyebrow: string;
  title: string;
  price: { usd: string; eur: string };
  description: string;
  includes: string[];
  featured?: boolean;
  active?: boolean;
}

export interface BookingRequest { name: string; email: string; date: string; time: string; website?: string; privacyAccepted?: boolean; }
export interface AvailabilityDay { date: string; times: string[]; }
export interface BookingResponse extends BookingRequest {
  id: string;
  provider: string;
  meetingUrl: string;
  emailStatus: EmailDeliveryStatus;
  calendarStatus?: 'created' | 'not_configured' | 'failed';
  message: string;
}
export interface ContactRequest { name: string; email: string; company: string; message: string; website?: string; privacyAccepted?: boolean; }
export interface ContactResponse extends ContactRequest { id: string; status: string; emailStatus: EmailDeliveryStatus; message: string; }

export interface AdminBooking { id: string; name: string; email: string; date: string; time: string; provider: string; meeting_url: string; created_at?: string; }
export interface AdminContact { id: string; name: string; email: string; company: string; message: string; created_at?: string; }
export interface AdminOverview { counts: { bookings: number; contacts: number; services: number }; recentBookings: AdminBooking[]; recentContacts: AdminContact[]; services: ServicePackage[]; }
export interface AdminLoginRequest { email: string; password: string; }
export interface AdminLoginResponse { accessToken: string; tokenType: 'Bearer'; expiresIn: number; user: { email: string; name: string; role: 'admin' }; }

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

  getAvailability(): Observable<AvailabilityDay[]> {
    return this.http.get<AvailabilityDay[]>(`${this.baseUrl}/availability`);
  }

  createBooking(payload: BookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/bookings`, payload);
  }

  createContact(payload: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${this.baseUrl}/contact`, payload);
  }

  loginAdmin(payload: AdminLoginRequest): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  getAdminOverview(token: string): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.baseUrl}/admin/overview`, { headers: this.adminHeaders(token) });
  }

  getAdminBookings(token: string): Observable<AdminBooking[]> {
    return this.http.get<AdminBooking[]>(`${this.baseUrl}/admin/bookings`, { headers: this.adminHeaders(token) });
  }

  getAdminContacts(token: string): Observable<AdminContact[]> {
    return this.http.get<AdminContact[]>(`${this.baseUrl}/admin/contacts`, { headers: this.adminHeaders(token) });
  }

  createAdminService(token: string, payload: ServicePackage): Observable<ServicePackage> {
    return this.http.post<ServicePackage>(`${this.baseUrl}/admin/services`, payload, { headers: this.adminHeaders(token) });
  }

  updateAdminService(token: string, id: string, payload: ServicePackage): Observable<ServicePackage> {
    return this.http.patch<ServicePackage>(`${this.baseUrl}/admin/services/${encodeURIComponent(id)}`, payload, { headers: this.adminHeaders(token) });
  }

  deleteAdminService(token: string, id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.baseUrl}/admin/services/${encodeURIComponent(id)}`, { headers: this.adminHeaders(token) });
  }

  private adminHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
