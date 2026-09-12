import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { EmailService } from './email.service.js';

export type ServiceCategory = 'Presencia' | 'Venta' | 'Soporte';

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

export interface BookingInput {
  name?: string;
  email?: string;
  date?: string;
  time?: string;
}

export interface AvailabilityDay {
  date: string;
  times: string[];
}

export interface ContactInput {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
}

const SERVICES: ServicePackage[] = [
  {
    id: 'landing', category: 'Presencia', eyebrow: '01 · PRESENCIA', title: 'Landing Page',
    price: { usd: '$200–300', eur: '€200–300' },
    description: 'Una página enfocada en una campaña, servicio o captación de contactos.',
    includes: ['Responsive', 'WhatsApp y formulario', 'SEO básico', 'Analítica inicial'],
  },
  {
    id: 'negocio', category: 'Presencia', eyebrow: '02 · PRESENCIA', title: 'Web Negocio',
    price: { usd: '$400–600', eur: '€400–600' },
    description: 'Presencia digital clara para presentar la empresa, servicios y canales de contacto.',
    includes: ['3–5 páginas orientativas', 'Panel de contenido', 'SEO técnico básico', 'Mapa y redes'],
  },
  {
    id: 'profesional', category: 'Presencia', eyebrow: '03 · PRESENCIA', title: 'Web Profesional',
    price: { usd: '$600–800', eur: '€600–800' },
    description: 'Una web más completa para marcas con más contenido y necesidades de gestión.',
    includes: ['5–8 páginas orientativas', 'Diseño más personalizado', 'SEO inicial ampliado', 'Analítica y eventos'],
  },
  {
    id: 'tienda', category: 'Venta', eyebrow: '04 · VENTA', title: 'Tienda Online',
    price: { usd: '$800–1,200', eur: '€800–1,200' },
    description: 'Catálogo y proceso de compra para comenzar a vender por internet.',
    includes: ['Catálogo y categorías', 'Carrito y checkout', 'Pago compatible', 'Panel de pedidos'],
    featured: true,
  },
  {
    id: 'ecommerce', category: 'Venta', eyebrow: '05 · VENTA', title: 'E-commerce Pro',
    price: { usd: '$1,200–1,800', eur: '€1,200–1,800' },
    description: 'Una operación de venta online con más personalización, medición e integraciones.',
    includes: ['Variantes y stock', 'Cupones y reglas', 'Pagos y envíos avanzados', 'Conversión y analítica'],
  },
  {
    id: 'custom', category: 'Venta', eyebrow: '06 · SOLUCIÓN', title: 'Desarrollo a medida',
    price: { usd: '$2,000–2,500', eur: '€2,000–2,500' },
    description: 'Software web construido alrededor de procesos, usuarios e integraciones específicas.',
    includes: ['Alcance funcional', 'Frontend y backend', 'APIs e integraciones', 'Panel administrativo'],
  },
  {
    id: 'basic-maintenance', category: 'Soporte', eyebrow: '07 · SOPORTE', title: 'Mantenimiento básico',
    price: { usd: '$30–50 / mes', eur: '€30–50 / mes' },
    description: 'Continuidad técnica para mantener tu sitio actualizado después de publicar.',
    includes: ['Actualizaciones', 'Copias si el hosting lo permite', 'Incidencias menores', 'Cambios pequeños'],
  },
  {
    id: 'pro-maintenance', category: 'Soporte', eyebrow: '08 · SOPORTE', title: 'Mantenimiento Pro',
    price: { usd: '$70–120 / mes', eur: '€70–120 / mes' },
    description: 'Más capacidad para cambios de contenido, productos y seguimiento técnico.',
    includes: ['Todo lo básico', 'Cambios de productos', 'Revisión de rendimiento', 'Atención prioritaria'],
  },
];

const AVAILABLE_TIMES = ['09:30', '11:00', '16:00'];

function buildAvailability(): AvailabilityDay[] {
  const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const today = new Date();
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() + index);
    return { date: formatter.format(date).replace(/\./g, ''), times: [...AVAILABLE_TIMES] };
  });
}

@Injectable()
export class AppService {
  private readonly bookings: Array<Record<string, string>> = [];
  private readonly contacts: Array<Record<string, string>> = [];

  constructor(private readonly database: DatabaseService, private readonly email: EmailService) {}

  async getServices(): Promise<ServicePackage[]> {
    const result = await this.database.query<{
      id: string; category: ServiceCategory; eyebrow: string; title: string;
      price_usd: string; price_eur: string; description: string; includes: string[]; featured: boolean;
    }>('SELECT id, category, eyebrow, title, price_usd, price_eur, description, includes, featured FROM service_packages ORDER BY CAST(SUBSTRING(eyebrow FROM \'^[0-9]+\') AS INTEGER), id');
    if (!result?.rows.length) {
      if (this.database.isConnected) await this.seedServices();
      return SERVICES;
    }
    return result.rows.map((row) => ({
      id: row.id, category: row.category, eyebrow: row.eyebrow, title: row.title,
      price: { usd: row.price_usd, eur: row.price_eur }, description: row.description,
      includes: row.includes, featured: row.featured,
    }));
  }

  async getAvailability(): Promise<AvailabilityDay[]> {
    const booked = new Set<string>();
    const result = await this.database.query<{ date: string; time: string }>('SELECT date, time FROM bookings');
    result?.rows.forEach((row) => booked.add(`${row.date}|${row.time}`));
    this.bookings.forEach((booking) => booked.add(`${booking.date}|${booking.time}`));

    return buildAvailability()
      .map((slot) => ({ ...slot, times: slot.times.filter((time) => !booked.has(`${slot.date}|${time}`)) }))
      .filter((slot) => slot.times.length > 0);
  }

  private async seedServices(): Promise<void> {
    for (const service of SERVICES) {
      await this.database.query('INSERT INTO service_packages (id, category, eyebrow, title, price_usd, price_eur, description, includes, featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) ON CONFLICT (id) DO NOTHING', [
        service.id, service.category, service.eyebrow, service.title, service.price.usd, service.price.eur,
        service.description, JSON.stringify(service.includes), service.featured ?? false,
      ]);
    }
  }

  getHealth(): Record<string, string> {
    return { status: 'ok', service: 'like-media-api', version: '0.1.0', database: this.database.status };
  }

  async createBooking(input: BookingInput): Promise<Record<string, string>> {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const date = input.date?.trim();
    const time = input.time?.trim();
    if (!name || !email || !date || !time || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('Nombre, email, día y hora son obligatorios.');
    }
    const available = await this.getAvailability();
    const selectedDay = available.find((slot) => slot.date === date);
    if (!selectedDay || !selectedDay.times.includes(time)) {
      throw new BadRequestException('El día o la hora seleccionados no están disponibles.');
    }
    if (!this.database.isConnected && this.bookings.some((booking) => booking.date === date && booking.time === time)) {
      throw new ConflictException('Ese horario acaba de reservarse. Elige otro, por favor.');
    }
    const id = `LM-${Date.now().toString(36).toUpperCase()}`;
    const room = `like-media-${id.toLowerCase()}`;
    const booking = { id, name, email, date, time, provider: 'Jitsi Meet', meetingUrl: `https://meet.jit.si/${room}` };
    if (this.database.isConnected) {
      try {
        await this.database.query('INSERT INTO bookings (id, name, email, date, time, provider, meeting_url) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, name, email, date, time, booking.provider, booking.meetingUrl]);
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
          throw new ConflictException('Ese horario acaba de reservarse. Elige otro, por favor.');
        }
        throw new InternalServerErrorException('No pudimos guardar la reserva.');
      }
    } else {
      this.bookings.push(booking);
    }
    const delivery = await this.email.sendBooking(booking);
    return {
      ...booking,
      emailStatus: delivery.status,
      message: delivery.status === 'sent'
        ? 'Solicitud recibida y emails enviados. Revisa tu bandeja: incluye la confirmación y la invitación de calendario.'
        : delivery.status === 'partial'
          ? 'La solicitud quedó guardada, pero solo se entregó uno de los emails. Te contactaremos mientras revisamos el envío.'
          : delivery.status === 'not_configured'
            ? 'La solicitud quedó guardada, pero el correo todavía no está configurado. Te contactaremos desde Like Media.'
            : 'La solicitud quedó guardada, pero no pudimos enviar el correo. Te contactaremos desde Like Media.',
    };
  }

  async createContact(input: ContactInput): Promise<Record<string, string>> {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const message = input.message?.trim();
    if (!name || !email || !message || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('Nombre, email y mensaje son obligatorios.');
    }
    const contact = {
      id: `MSG-${Date.now().toString(36).toUpperCase()}`,
      name,
      email,
      company: input.company?.trim() ?? '',
      message,
    };
    if (this.database.isConnected) {
      try {
        await this.database.query('INSERT INTO contacts (id, name, email, company, message) VALUES ($1, $2, $3, $4, $5)', [contact.id, contact.name, contact.email, contact.company, contact.message]);
      } catch {
        throw new InternalServerErrorException('No pudimos guardar el mensaje.');
      }
    } else {
      this.contacts.push(contact);
    }
    const delivery = await this.email.sendContact(contact);
    return {
      ...contact,
      status: 'received',
      emailStatus: delivery.status,
      message: delivery.status === 'sent'
        ? 'Mensaje enviado correctamente. Te hemos enviado una confirmación por email.'
        : delivery.status === 'partial'
          ? 'Mensaje guardado, pero solo se entregó uno de los emails. Te responderemos pronto.'
          : delivery.status === 'not_configured'
            ? 'Mensaje guardado, pero el correo todavía no está configurado. Te responderemos pronto.'
            : 'Mensaje guardado, pero no pudimos enviar el correo. Te responderemos pronto.',
    };
  }
}
