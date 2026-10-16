import { Component } from '@angular/core';

import { Header } from '../header/header';

@Component({
  selector: 'app-shell',
  imports: [Header],
  template: '<app-header />',
})
export class Shell {}
