import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { BookingInput, ContactInput } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): Record<string, string> {
    return { name: 'Like Media API', docs: '/api/health' };
  }

  @Get('api/health')
  getHealth(): Record<string, string> {
    return this.appService.getHealth();
  }

  @Get('api/services')
  async getServices() {
    return this.appService.getServices();
  }

  @Get('api/availability')
  async getAvailability() {
    return this.appService.getAvailability();
  }

  @Post('api/bookings')
  async createBooking(@Body() body: BookingInput) {
    return this.appService.createBooking(body);
  }

  @Post('api/contact')
  async createContact(@Body() body: ContactInput) {
    return this.appService.createContact(body);
  }

  @Get('api/admin/overview')
  async getAdminOverview(@Headers('authorization') authorization?: string) {
    return this.appService.getAdminOverview(this.adminToken(authorization));
  }

  @Get('api/admin/bookings')
  async getAdminBookings(@Headers('authorization') authorization?: string) {
    return this.appService.getAdminBookings(this.adminToken(authorization));
  }

  @Get('api/admin/contacts')
  async getAdminContacts(@Headers('authorization') authorization?: string) {
    return this.appService.getAdminContacts(this.adminToken(authorization));
  }

  private adminToken(authorization?: string): string | undefined {
    const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
    return match?.[1];
  }
}
