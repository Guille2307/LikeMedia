import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{
        provide: AppService,
        useValue: { getHello: () => ({ name: 'Like Media API', docs: '/api/health' }) },
      }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns the API identity and health endpoint', () => {
      expect(appController.getHello()).toEqual({ name: 'Like Media API', docs: '/api/health' });
    });
  });
});
