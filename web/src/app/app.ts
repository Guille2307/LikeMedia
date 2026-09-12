import { AfterViewInit, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, AvailabilityDay, BookingResponse, ContactResponse, Currency, ServiceCategory, ServicePackage } from './api.service';

type FilterCategory = 'Todos' | ServiceCategory;

const LOCAL_SERVICES: ServicePackage[] = [
  { id: 'landing', category: 'Presencia', eyebrow: '01 · PRESENCIA', title: 'Landing Page', price: { usd: '$200–300', eur: '€200–300' }, description: 'Una página enfocada en una campaña, servicio o captación de contactos.', includes: ['Responsive', 'WhatsApp y formulario', 'SEO básico', 'Analítica inicial'] },
  { id: 'negocio', category: 'Presencia', eyebrow: '02 · PRESENCIA', title: 'Web Negocio', price: { usd: '$400–600', eur: '€400–600' }, description: 'Presencia digital clara para presentar la empresa, servicios y canales de contacto.', includes: ['3–5 páginas orientativas', 'Panel de contenido', 'SEO técnico básico', 'Mapa y redes'] },
  { id: 'profesional', category: 'Presencia', eyebrow: '03 · PRESENCIA', title: 'Web Profesional', price: { usd: '$600–800', eur: '€600–800' }, description: 'Una web más completa para marcas con más contenido y necesidades de gestión.', includes: ['5–8 páginas orientativas', 'Diseño más personalizado', 'SEO inicial ampliado', 'Analítica y eventos'] },
  { id: 'tienda', category: 'Venta', eyebrow: '04 · VENTA', title: 'Tienda Online', price: { usd: '$800–1,200', eur: '€800–1,200' }, description: 'Catálogo y proceso de compra para comenzar a vender por internet.', includes: ['Catálogo y categorías', 'Carrito y checkout', 'Pago compatible', 'Panel de pedidos'], featured: true },
  { id: 'ecommerce', category: 'Venta', eyebrow: '05 · VENTA', title: 'E-commerce Pro', price: { usd: '$1,200–1,800', eur: '€1,200–1,800' }, description: 'Una operación de venta online con más personalización, medición e integraciones.', includes: ['Variantes y stock', 'Cupones y reglas', 'Pagos y envíos avanzados', 'Conversión y analítica'] },
  { id: 'custom', category: 'Venta', eyebrow: '06 · SOLUCIÓN', title: 'Desarrollo a medida', price: { usd: '$2,000–2,500', eur: '€2,000–2,500' }, description: 'Software web construido alrededor de procesos, usuarios e integraciones específicas.', includes: ['Alcance funcional', 'Frontend y backend', 'APIs e integraciones', 'Panel administrativo'] },
  { id: 'basic-maintenance', category: 'Soporte', eyebrow: '07 · SOPORTE', title: 'Mantenimiento básico', price: { usd: '$30–50 / mes', eur: '€30–50 / mes' }, description: 'Continuidad técnica para mantener tu sitio actualizado después de publicar.', includes: ['Actualizaciones', 'Copias si el hosting lo permite', 'Incidencias menores', 'Cambios pequeños'] },
  { id: 'pro-maintenance', category: 'Soporte', eyebrow: '08 · SOPORTE', title: 'Mantenimiento Pro', price: { usd: '$70–120 / mes', eur: '€70–120 / mes' }, description: 'Más capacidad para cambios de contenido, productos y seguimiento técnico.', includes: ['Todo lo básico', 'Cambios de productos', 'Revisión de rendimiento', 'Atención prioritaria'] },
];

// Fallback local alineado con la API: solo laborables, 15:00–20:00.
const BOOKING_TIMES = Array.from({ length: 10 }, (_, index) => {
  const minutes = 15 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function buildLocalAvailability(): AvailabilityDay[] {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid',
  });
  const baseDate = new Date();
  baseDate.setHours(12, 0, 0, 0);
  const availability: AvailabilityDay[] = [];

  for (let offset = 0; availability.length < 5 && offset < 14; offset += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + offset);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    availability.push({ date: formatter.format(date).replace(/\./g, ''), times: [...BOOKING_TIMES] });
  }

  return availability;
}

const LOCAL_AVAILABILITY = buildLocalAvailability();

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, AfterViewInit {
  private readonly api = inject(ApiService);
  private revealObserver?: IntersectionObserver;
  private revealSequence = 0;

  readonly currency = signal<Currency>('USD');
  readonly category = signal<FilterCategory>('Todos');
  readonly services = signal<ServicePackage[]>(LOCAL_SERVICES);
  readonly availability = signal<AvailabilityDay[]>(LOCAL_AVAILABILITY);
  readonly filteredServices = computed(() => {
    const selected = this.category();
    const visible = selected === 'Todos' ? [...this.services()] : this.services().filter((service) => service.category === selected);
    return visible.sort((a, b) => this.serviceNumber(a) - this.serviceNumber(b) || a.id.localeCompare(b.id));
  });
  readonly bookingStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly contactStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly bookingResponse = signal<BookingResponse | null>(null);
  readonly contactResponse = signal<ContactResponse | null>(null);
  readonly bookingError = signal('');
  readonly contactError = signal('');

  get availableDates(): string[] { return this.availability().map((slot) => slot.date); }
  get availableTimes(): string[] {
    return this.availability().find((slot) => slot.date === this.booking.date)?.times ?? this.availability()[0]?.times ?? [];
  }

  booking = { name: '', email: '', date: '', time: '', website: '' };
  contact = { name: '', email: '', company: '', message: '', website: '' };

  ngOnInit(): void {
    this.api.getServices().subscribe({ next: (services) => this.services.set(services), error: () => undefined });
    this.api.getAvailability().subscribe({ next: (availability) => this.availability.set(availability), error: () => undefined });
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((item) => item.classList.add('is-visible'));
      return;
    }

    this.revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('is-visible');
        this.revealObserver?.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });

    this.observeRevealItems();
  }

  priceFor(service: ServicePackage): string {
    return this.currency() === 'USD' ? service.price.usd : service.price.eur;
  }

  selectDate(date: string): void {
    this.booking.date = date;
    if (!this.availableTimes.includes(this.booking.time)) this.booking.time = '';
  }
  selectTime(time: string): void { this.booking.time = time; }
  setCategory(category: FilterCategory): void {
    this.category.set(category);
    setTimeout(() => this.observeRevealItems(), 0);
  }
  setCurrency(currency: Currency): void { this.currency.set(currency); }

  private serviceNumber(service: ServicePackage): number {
    const match = /^(\d+)/.exec(service.eyebrow);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  }

  private observeRevealItems(): void {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)'));
    if (!this.revealObserver) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    revealItems.forEach((item) => {
      if (!item.dataset['revealObserved']) {
        item.style.setProperty('--reveal-delay', `${Math.min(this.revealSequence++ * 45, 360)}ms`);
        item.dataset['revealObserved'] = 'true';
        this.revealObserver?.observe(item);
      }
    });
  }

  submitBooking(): void {
    if (!this.booking.name || !this.booking.email || !this.booking.date || !this.booking.time) {
      this.bookingError.set('Completa tu nombre, email, día y hora.');
      this.bookingStatus.set('error');
      return;
    }
    this.bookingStatus.set('loading');
    this.bookingError.set('');
    this.api.createBooking(this.booking).subscribe({
      next: (response) => { this.bookingResponse.set(response); this.bookingStatus.set('success'); },
      error: (error: { error?: { message?: string } }) => {
        this.bookingError.set(error.error?.message ?? 'No pudimos registrar la solicitud. Inténtalo de nuevo.');
        this.bookingStatus.set('error');
      },
    });
  }

  submitContact(): void {
    if (!this.contact.name || !this.contact.email || !this.contact.message) {
      this.contactError.set('Completa nombre, email y mensaje.');
      this.contactStatus.set('error');
      return;
    }
    this.contactStatus.set('loading');
    this.contactError.set('');
    this.api.createContact(this.contact).subscribe({
      next: (response) => { this.contactResponse.set(response); this.contactStatus.set('success'); },
      error: (error: { error?: { message?: string } }) => {
        this.contactError.set(error.error?.message ?? 'No pudimos enviar el mensaje. Inténtalo de nuevo.');
        this.contactStatus.set('error');
      },
    });
  }
}
