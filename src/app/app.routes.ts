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
import { Settings } from './components/pages/settings/settings';


export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    {path:'login', component: Login},
    {
        path: 'home', 
        component: Home, 
        children: [

        { path: '', component: Dashboard },
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
            { path:'', component: OfsDashboard },
            { path:'ofs-dashboard', component: OfsDashboard },
            { path:'ofs-residentsdirectory', component: OfsResidentsdirectory },
            { path: 'ofs-createresidentsprofile', component: OfsCreateResidentsProfile },
            { path:'ofs-notification', component: OfsNotification },
            { path:'ofs-profile', component: OfsProfile },
            { path: 'ofs-settings', component: OfsSettings},
        ]

    }
];