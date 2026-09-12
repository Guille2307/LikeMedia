import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { BookingInput, ContactInput } from './app.service.js';

interface BookingEmail extends Required<BookingInput> {
  id: string;
  provider: string;
  meetingUrl: string;
}

export type EmailDeliveryStatus = 'sent' | 'partial' | 'failed' | 'not_configured';

export interface EmailDeliveryResult {
  status: EmailDeliveryStatus;
  ownerSent: boolean;
  visitorSent: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider = (process.env.MAIL_PROVIDER?.trim().toLowerCase() || 'brevo') as 'brevo' | 'smtp' | 'auto';
  private readonly brevoApiKey = process.env.BREVO_API_KEY?.trim();
  private readonly brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'info@likemedia.es';
  private readonly brevoSenderName = process.env.BREVO_SENDER_NAME?.trim() || 'Like Media';
  private readonly recipient = process.env.MAIL_TO?.trim() || 'info@likemedia.es';
  private readonly from = process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || 'info@likemedia.es';
  private readonly transporter?: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASS;
    if (!host || !user || !password) return;

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  isConfigured(): boolean {
    if (this.provider === 'brevo') return Boolean(this.brevoApiKey);
    if (this.provider === 'smtp') return Boolean(this.transporter);
    return Boolean(this.brevoApiKey || this.transporter);
  }

  async sendBooking(booking: BookingEmail): Promise<EmailDeliveryResult> {
    const calendarInvite = this.createCalendarInvite(booking);
    const attachment = {
      filename: 'like-media-videollamada.ics',
      content: calendarInvite,
      contentType: 'text/calendar; method=REQUEST',
    };

    const [ownerSent, visitorSent] = await Promise.all([
      this.send({
        to: this.recipient,
        replyTo: booking.email,
        subject: `[Like Media] Nueva solicitud de videollamada · ${booking.name}`,
        text: [
          'Nueva solicitud de videollamada',
          '',
          `Nombre: ${booking.name}`,
          `Email: ${booking.email}`,
          `Fecha: ${booking.date}`,
          `Hora: ${booking.time}`,
          `Sala Jitsi: ${booking.meetingUrl}`,
          '',
          `ID: ${booking.id}`,
        ].join('\n'),
        attachments: [attachment],
      }),
      this.send({
        to: booking.email,
        subject: 'Hemos recibido tu solicitud · Like Media',
        text: [
          `Hola ${booking.name},`,
          '',
          `Hemos recibido tu solicitud para el ${booking.date} a las ${booking.time}.`,
          `Puedes acceder a la sala Jitsi desde este enlace: ${booking.meetingUrl}`,
          '',
          'Si necesitas cambiar la hora, responde a este correo.',
          '',
          'Like Media',
        ].join('\n'),
        attachments: [attachment],
      }),
    ]);

    return this.result(ownerSent, visitorSent);
  }

  async sendContact(contact: Required<ContactInput> & { id: string }): Promise<EmailDeliveryResult> {
    const [ownerSent, visitorSent] = await Promise.all([
      this.send({
        to: this.recipient,
        replyTo: contact.email,
        subject: `[Like Media] Nuevo contacto · ${contact.name}`,
        text: [
          'Nuevo mensaje desde likemedia.es',
          '',
          `Nombre: ${contact.name}`,
          `Email: ${contact.email}`,
          `Empresa o proyecto: ${contact.company || 'No indicado'}`,
          '',
          contact.message,
          '',
          `ID: ${contact.id}`,
        ].join('\n'),
      }),
      this.send({
        to: contact.email,
        subject: 'Hemos recibido tu mensaje · Like Media',
        text: [
          `Hola ${contact.name},`,
          '',
          'Hemos recibido tu mensaje y te responderemos pronto.',
          '',
          'Like Media',
        ].join('\n'),
      }),
    ]);

    return this.result(ownerSent, visitorSent);
  }

  private async send(message: { to: string; subject: string; text: string; replyTo?: string; attachments?: Array<{ filename: string; content: string; contentType: string }> }): Promise<boolean> {
    if (this.provider === 'brevo' || (this.provider === 'auto' && this.brevoApiKey)) return this.sendWithBrevo(message);
    if (this.provider === 'smtp' || (this.provider === 'auto' && this.transporter)) return this.sendWithSmtp(message);

    this.logger.warn('Email no configurado: define BREVO_API_KEY o las variables SMTP_* para activar notificaciones.');
    return false;
  }

  private async sendWithSmtp(message: { to: string; subject: string; text: string; replyTo?: string; attachments?: Array<{ filename: string; content: string; contentType: string }> }): Promise<boolean> {
    if (!this.transporter) return false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.transporter.sendMail({ ...message, from: this.from }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('SMTP timeout')), 20_000);
        }),
      ]);
      return true;
    } catch (error) {
      this.logger.error(`No se pudo enviar el email "${message.subject}"`, error instanceof Error ? error.stack : undefined);
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async sendWithBrevo(message: { to: string; subject: string; text: string; replyTo?: string; attachments?: Array<{ filename: string; content: string; contentType: string }> }): Promise<boolean> {
    if (!this.brevoApiKey) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const payload = {
      sender: { email: this.brevoSenderEmail, name: this.brevoSenderName },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
      ...(message.attachments?.length ? {
        attachment: message.attachments.map((attachment) => ({
          name: attachment.filename,
          content: Buffer.from(attachment.content, 'utf8').toString('base64'),
        })),
      } : {}),
    };

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': this.brevoApiKey, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 240);
        this.logger.error(`Brevo rechazó el email "${message.subject}" (${response.status}): ${detail}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`No se pudo enviar el email "${message.subject}" mediante Brevo`, error instanceof Error ? error.message : undefined);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private result(ownerSent: boolean, visitorSent: boolean): EmailDeliveryResult {
    const status: EmailDeliveryStatus = ownerSent && visitorSent
      ? 'sent'
      : ownerSent || visitorSent
        ? 'partial'
        : this.isConfigured() ? 'failed' : 'not_configured';
    return { status, ownerSent, visitorSent };
  }

  private createCalendarInvite(booking: BookingEmail): string {
    const monthNumbers: Record<string, number> = {
      ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
      may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
      sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
      dic: 12, diciembre: 12,
    };
    const match = /(?:^|,\s*)(\d{1,2})\s+([a-záéíóú]+)/i.exec(booking.date);
    const day = match ? Number(match[1]) : new Date().getDate();
    const month = match ? monthNumbers[match[2].toLowerCase()] ?? new Date().getMonth() + 1 : new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const [hour, minute] = booking.time.split(':').map(Number);
    const endMinutes = hour * 60 + minute + 30;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;
    const localStamp = (y: number, m: number, d: number, h: number, min: number): string =>
      `${String(y).padStart(4, '0')}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;
    const utcStamp = (value: Date): string => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const escape = (value: string): string => value.replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Like Media//Videollamada//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${escape(booking.id)}@likemedia.es`,
      `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART;TZID=Europe/Madrid:${localStamp(year, month, day, hour, minute)}`,
      `DTEND;TZID=Europe/Madrid:${localStamp(year, month, day, endHour, endMinute)}`,
      `SUMMARY:${escape('Videollamada con Like Media')}`,
      `DESCRIPTION:${escape(`Reunión de 30 minutos. Entra aquí: ${booking.meetingUrl}`)}`,
      `LOCATION:${escape(booking.meetingUrl)}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n';
  }
}
