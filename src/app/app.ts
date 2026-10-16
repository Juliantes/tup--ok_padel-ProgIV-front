import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './login/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('tup-padel-match');
  protected readonly authService = inject(AuthService);
  private readonly documentTitle = inject(Title);
  private readonly translate = inject(TranslateService);

  ngOnInit(): void {
    this.translate.get('APP.TITLE').subscribe((title) => {
      this.documentTitle.setTitle(title);
    });
  }
}
