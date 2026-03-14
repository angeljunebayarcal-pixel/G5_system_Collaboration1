import { Component } from '@angular/core';

import { Sidenav } from './sidenav/sidenav';
import { Content } from './content/content';
import { Topbar } from './topbar/topbar';


@Component({
  selector: 'app-home',
  imports: [Topbar, Sidenav,Content],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
