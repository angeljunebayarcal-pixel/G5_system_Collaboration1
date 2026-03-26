import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Home } from './components/home/home';
import { Dashboard } from './components/pages/dashboard/dashboard';
import { Bookappointment } from './components/pages/bookappointment/bookappointment';
import { Certificaterequest } from './components/pages/certificaterequest/certificaterequest';
import { Notification } from './components/pages/notification/notification';
import { Profile } from './components/pages/profile/profile';
import { OfsHome } from './components/ofs-home/ofs-home';
import { OfsDashboard } from './components/pages_officials/ofs-dashboard/ofs-dashboard';
import { OfsResidentsdirectory } from './components/pages_officials/ofs-residentsdirectory/ofs-residentsdirectory';
import { OfsNotification } from './components/pages_officials/ofs-notification/ofs-notification';
import { OfsProfile } from './components/pages_officials/ofs-profile/ofs-profile';
import { OfsCreateResidentsProfile } from './components/pages_officials/ofs-create-residents-profile/ofs-create-residents-profile';
import { OfsSettings } from './components/pages_officials/ofs-settings/ofs-settings';
import { Controlcenter } from './components/pages_adm/controlcenter/controlcenter';
import { Approvalqueue } from './components/pages_adm/approvalqueue/approvalqueue';
import { Userdirectory } from './components/pages_adm/userdirectory/userdirectory';
import { AdmProfile } from './components/pages_adm/adm-profile/adm-profile';
import { AdmSettings } from './components/pages_adm/adm-settings/adm-settings';
import { HomeAdm } from './components/home-adm/home-adm';
import { Settings } from './components/pages/settings/settings';


export const routes: Routes = [
     { path: '', component: Login },
    {path:'login', component: Login},
    {
        path: 'home', 
        component: Home, 
        children: [

        { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        { path: 'dashboard', component: Dashboard },
        { path: 'bookappointment', component:  Bookappointment},
        { path: 'certificaterequest', component: Certificaterequest },
        { path: 'notification', component: Notification },
        { path: 'profile', component: Profile },
        { path: 'settings', component: Settings },

        ]
  },
  {
        path: 'ofs-home',
        component: OfsHome,
        children: [
            { path: '', redirectTo: 'ofs-dashboard', pathMatch: 'full' },
            { path:'ofs-dashboard', component: OfsDashboard },
            { path:'ofs-residentsdirectory', component: OfsResidentsdirectory },
            { path: 'ofs-createresidentsprofile', component: OfsCreateResidentsProfile },
            { path:'ofs-notification', component: OfsNotification },
            { path:'ofs-profile', component: OfsProfile },
            { path: 'ofs-settings', component: OfsSettings},
        ]

    },
{
    path: 'home-adm',
        component: HomeAdm,
        children: [
            { path: '', redirectTo: 'controlcenter', pathMatch: 'full' },
            { path:'controlcenter', component: Controlcenter },
            { path:'approvalqueue', component: Approvalqueue },
            { path:'userdirectory', component: Userdirectory },
            { path:'adm-profile', component: AdmProfile },
            { path: 'adm-settings', component: AdmSettings },
        ]
}
];