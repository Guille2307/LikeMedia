import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AdminApp } from './app/admin';

const rootComponent = window.location.pathname.replace(/\/+$/, '') === '/admin' ? AdminApp : App;

bootstrapApplication(rootComponent, appConfig)
  .catch((err) => console.error(err));
