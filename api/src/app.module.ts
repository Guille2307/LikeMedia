import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseService } from './database.service.js';
import { EmailService } from './email.service.js';
import { CalendarService } from './calendar.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DatabaseService, EmailService, CalendarService],
})
export class AppModule {}
