import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBooking, AdminContact, AdminOverview, ApiService } from './api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminApp implements OnInit {
  private readonly api = inject(ApiService);
  token = '';
  authenticated = false;
  loading = false;
  error = '';
  overview: AdminOverview | null = null;
  bookings: AdminBooking[] = [];
  contacts: AdminContact[] = [];

  ngOnInit(): void {
    const saved = sessionStorage.getItem('like-media-admin-token');
    if (saved) { this.token = saved; this.load(); }
  }

  load(): void {
    const token = this.token.trim();
    if (!token) { this.error = 'Introduce el token privado de administración.'; return; }
    this.loading = true;
    this.error = '';
    this.api.getAdminOverview(token).subscribe({
      next: (overview) => {
        this.overview = overview;
        this.bookings = overview.recentBookings;
        this.contacts = overview.recentContacts;
        this.authenticated = true;
        this.loading = false;
        sessionStorage.setItem('like-media-admin-token', token);
      },
      error: (response: { status?: number; error?: { message?: string } }) => {
        this.loading = false;
        this.authenticated = false;
        if (response.status === 401) this.error = 'El token no es válido.';
        else if (response.status === 503) this.error = 'El panel aún no está activado en el servidor.';
        else this.error = response.error?.message ?? 'No se pudo cargar el panel.';
      },
    });
  }

  logout(): void {
    sessionStorage.removeItem('like-media-admin-token');
    this.token = '';
    this.authenticated = false;
    this.overview = null;
    this.bookings = [];
    this.contacts = [];
  }

  displayDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}
