import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AdminApp } from './app/admin';
import { LegalApp } from './app/legal';

const path = window.location.pathname.replace(/\/+$/, '');
const isLegalPage = /^\/legal\/(aviso-legal|privacidad|cookies|terminos)$/.test(path);
const rootComponent = path === '/admin' ? AdminApp : isLegalPage ? LegalApp : App;

bootstrapApplication(rootComponent, appConfig)
  .catch((err) => console.error(err));
