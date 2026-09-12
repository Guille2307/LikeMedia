import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type LegalPage = 'aviso-legal' | 'privacidad' | 'cookies' | 'terminos';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
})
export class LegalApp {
  readonly page: LegalPage = this.resolvePage();
  readonly updatedAt = '12 de septiembre de 2026';

  private resolvePage(): LegalPage {
    const slug = window.location.pathname.split('/').filter(Boolean).at(-1);
    return slug === 'privacidad' || slug === 'cookies' || slug === 'terminos' ? slug : 'aviso-legal';
  }
}
