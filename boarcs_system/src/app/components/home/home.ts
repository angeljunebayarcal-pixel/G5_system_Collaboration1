import { Component } from '@angular/core';
import { Topbar } from './topbar/topbar';
import { Sidenav } from './sidenav/sidenav';
import { Content } from './content/content';


@Component({
  selector: 'app-home',
  imports: [Topbar, Sidenav,Content],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
