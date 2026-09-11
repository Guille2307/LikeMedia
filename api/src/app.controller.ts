import { Body, Controller, Get, Post } from '@nestjs/common';
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
  getServices() {
    return this.appService.getServices();
  }

  @Post('api/bookings')
  createBooking(@Body() body: BookingInput) {
    return this.appService.createBooking(body);
  }

  @Post('api/contact')
  createContact(@Body() body: ContactInput) {
    return this.appService.createContact(body);
  }
}
