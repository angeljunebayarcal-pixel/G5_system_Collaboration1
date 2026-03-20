import { Component } from '@angular/core';
import { AdmContent } from "./adm-content/adm-content";
import { AdmSidenav } from "./adm-sidenav/adm-sidenav";
import { AdmTopbar } from "./adm-topbar/adm-topbar";

@Component({
  selector: 'app-home-adm',
  imports: [AdmContent, AdmSidenav, AdmTopbar],
  templateUrl: './home-adm.html',
  styleUrl: './home-adm.scss',
})
export class HomeAdm {

}
