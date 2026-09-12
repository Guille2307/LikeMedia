import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { BookingInput, ContactInput, ServicePackageInput } from './app.service.js';

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

  @Post('api/admin/services')
  async createAdminService(@Headers('authorization') authorization: string | undefined, @Body() body: ServicePackageInput) {
    return this.appService.createAdminService(this.adminToken(authorization), body);
  }

  @Patch('api/admin/services/:id')
  async updateAdminService(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: ServicePackageInput) {
    return this.appService.updateAdminService(this.adminToken(authorization), id, body);
  }

  @Delete('api/admin/services/:id')
  async deleteAdminService(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.appService.deleteAdminService(this.adminToken(authorization), id);
  }

  private adminToken(authorization?: string): string | undefined {
    const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
    return match?.[1];
  }
}
