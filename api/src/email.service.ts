import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { BookingInput, ContactInput } from './app.service.js';

interface BookingEmail extends Required<BookingInput> {
  id: string;
  provider: string;
  meetingUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
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
    });
  }

  isConfigured(): boolean { return Boolean(this.transporter); }

  async sendBooking(booking: BookingEmail): Promise<void> {
    await this.send({
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
    });

    await this.send({
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
    });
  }

  async sendContact(contact: Required<ContactInput> & { id: string }): Promise<void> {
    await this.send({
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
    });

    await this.send({
      to: contact.email,
      subject: 'Hemos recibido tu mensaje · Like Media',
      text: [
        `Hola ${contact.name},`,
        '',
        'Hemos recibido tu mensaje y te responderemos pronto.',
        '',
        'Like Media',
      ].join('\n'),
    });
  }

  private async send(message: { to: string; subject: string; text: string; replyTo?: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS para activar notificaciones.');
      return;
    }

    try {
      await this.transporter.sendMail({ ...message, from: this.from });
    } catch (error) {
      this.logger.error(`No se pudo enviar el email "${message.subject}"`, error instanceof Error ? error.stack : undefined);
    }
  }
}
