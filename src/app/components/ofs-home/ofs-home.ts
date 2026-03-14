import { Component } from '@angular/core';
import { OfsTopbar } from './ofs-topbar/ofs-topbar';
import { OfsSidenav } from "./ofs-sidenav/ofs-sidenav";
import { OfsContent } from "./ofs-content/ofs-content";

@Component({
  selector: 'app-ofs-home',
  imports: [OfsTopbar, OfsSidenav, OfsContent],
  templateUrl: './ofs-home.html',
  styleUrl: './ofs-home.scss',
})
export class OfsHome {

}
