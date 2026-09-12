import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseService } from './database.service.js';
import { EmailService } from './email.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DatabaseService, EmailService],
})
export class AppModule {}
