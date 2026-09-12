import { Injectable, Logger } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';

interface CalendarBooking {
  id: string;
  name: string;
  email: string;
  date: string;
  time: string;
  meetingUrl: string;
}

export type CalendarEventStatus = 'created' | 'not_configured' | 'failed';

const MONTH_NUMBERS: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
  dic: 12, diciembre: 12,
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  private readonly client?: calendar_v3.Calendar;

  constructor() {
    const credentialsValue = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    if (!this.calendarId || !credentialsValue) return;

    try {
      const credentials = JSON.parse(credentialsValue) as { client_email?: string; private_key?: string };
      if (!credentials.client_email || !credentials.private_key) throw new Error('Faltan client_email o private_key');
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
      });
      this.client = google.calendar({ version: 'v3', auth });
    } catch (error) {
      this.logger.warn(`Credenciales de Google Calendar inválidas: ${error instanceof Error ? error.message : 'formato no válido'}`);
    }
  }

  async createBookingEvent(booking: CalendarBooking): Promise<CalendarEventStatus> {
    if (!this.client || !this.calendarId) return 'not_configured';

    try {
      const { start, end } = this.eventTimes(booking);
      await this.client.events.insert({
        calendarId: this.calendarId,
        sendUpdates: 'all',
        requestBody: {
          summary: `Videollamada con Like Media · ${booking.name}`,
          description: [
            'Reserva de videollamada con Like Media.',
            '',
            `Cliente: ${booking.name}`,
            `Email: ${booking.email}`,
            `Sala Jitsi: ${booking.meetingUrl}`,
            `ID de reserva: ${booking.id}`,
          ].join('\n'),
          location: booking.meetingUrl,
          start: { dateTime: start, timeZone: 'Europe/Madrid' },
          end: { dateTime: end, timeZone: 'Europe/Madrid' },
          attendees: [{ email: booking.email }],
        },
      });
      return 'created';
    } catch (error) {
      this.logger.error(`No se pudo crear el evento de Google Calendar para ${booking.id}`, error instanceof Error ? error.message : undefined);
      return 'failed';
    }
  }

  private eventTimes(booking: CalendarBooking): { start: string; end: string } {
    const match = /(?:^|,\s*)(\d{1,2})\s+([a-záéíóú]+)/i.exec(booking.date);
    const day = match ? Number(match[1]) : NaN;
    const month = match ? MONTH_NUMBERS[match[2].toLowerCase()] : undefined;
    const [hour, minute] = booking.time.split(':').map(Number);
    if (!day || !month || !Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new Error(`No se pudo interpretar la fecha ${booking.date} ${booking.time}`);
    }

    const now = new Date();
    const madridMonth = Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'Europe/Madrid' }).format(now));
    const madridYear = Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Europe/Madrid' }).format(now));
    const year = month < madridMonth ? madridYear + 1 : madridYear;
    const endMinutes = hour * 60 + minute + 30;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;
    const localStamp = (h: number, m: number): string =>
      `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

    return { start: localStamp(hour, minute), end: localStamp(endHour, endMinute) };
  }
}
