import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBooking, AdminContact, AdminOverview, ApiService, ServicePackage } from './api.service';

function emptyService(): ServicePackage {
  return {
    id: '', category: 'Presencia', eyebrow: '', title: '',
    price: { usd: '', eur: '' }, description: '', includes: [], featured: false, active: true,
  };
}

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
  editingServiceId: string | null = null;
  serviceEditorOpen = false;
  serviceForm: ServicePackage = emptyService();
  serviceIncludesText = '';
  serviceSaving = false;
  serviceError = '';
  serviceMessage = '';

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
    this.cancelServiceEdit();
  }

  startCreateService(): void {
    this.editingServiceId = null;
    this.serviceEditorOpen = true;
    this.serviceForm = emptyService();
    this.serviceIncludesText = '';
    this.serviceError = '';
    this.serviceMessage = '';
  }

  editService(service: ServicePackage): void {
    this.editingServiceId = service.id;
    this.serviceEditorOpen = true;
    this.serviceForm = { ...service, price: { ...service.price }, includes: [...service.includes] };
    this.serviceIncludesText = service.includes.join('\n');
    this.serviceError = '';
    this.serviceMessage = '';
  }

  cancelServiceEdit(): void {
    this.editingServiceId = null;
    this.serviceEditorOpen = false;
    this.serviceForm = emptyService();
    this.serviceIncludesText = '';
    this.serviceError = '';
  }

  saveService(): void {
    const title = this.serviceForm.title.trim();
    if (!title || !this.serviceForm.category || !this.serviceForm.eyebrow.trim() || !this.serviceForm.price.usd.trim() || !this.serviceForm.price.eur.trim() || !this.serviceForm.description.trim()) {
      this.serviceError = 'Completa categoría, etiqueta, título, precios y descripción.';
      return;
    }
    const payload: ServicePackage = {
      ...this.serviceForm,
      id: this.serviceForm.id.trim(),
      title,
      eyebrow: this.serviceForm.eyebrow.trim(),
      description: this.serviceForm.description.trim(),
      price: { usd: this.serviceForm.price.usd.trim(), eur: this.serviceForm.price.eur.trim() },
      includes: this.serviceIncludesText.split('\n').map((item) => item.trim()).filter(Boolean),
    };
    this.serviceSaving = true;
    this.serviceError = '';
    this.serviceMessage = '';
    const request = this.editingServiceId
      ? this.api.updateAdminService(this.token, this.editingServiceId, payload)
      : this.api.createAdminService(this.token, payload);
    request.subscribe({
      next: () => {
        this.serviceSaving = false;
        this.serviceMessage = this.editingServiceId ? 'Paquete actualizado.' : 'Paquete creado y publicado.';
        this.cancelServiceEdit();
        this.load();
      },
      error: (response: { error?: { message?: string } }) => {
        this.serviceSaving = false;
        this.serviceError = response.error?.message ?? 'No se pudo guardar el paquete.';
      },
    });
  }

  toggleService(service: ServicePackage): void {
    this.serviceSaving = true;
    this.serviceError = '';
    this.api.updateAdminService(this.token, service.id, { ...service, active: service.active === false }).subscribe({
      next: () => { this.serviceSaving = false; this.serviceMessage = service.active === false ? 'Paquete activado.' : 'Paquete archivado.'; this.load(); },
      error: (response: { error?: { message?: string } }) => { this.serviceSaving = false; this.serviceError = response.error?.message ?? 'No se pudo cambiar el estado.'; },
    });
  }

  deleteService(service: ServicePackage): void {
    if (!window.confirm(`¿Eliminar «${service.title}»? Esta acción no se puede deshacer.`)) return;
    this.serviceSaving = true;
    this.serviceError = '';
    this.api.deleteAdminService(this.token, service.id).subscribe({
      next: () => { this.serviceSaving = false; this.serviceMessage = 'Paquete eliminado.'; this.load(); },
      error: (response: { error?: { message?: string } }) => { this.serviceSaving = false; this.serviceError = response.error?.message ?? 'No se pudo eliminar el paquete.'; },
    });
  }

  displayDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}
