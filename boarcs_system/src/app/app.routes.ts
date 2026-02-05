import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Home } from './components/home/home';
import { Dashboard } from './components/pages/dashboard/dashboard';
import { Bookappointment } from './components/pages/bookappointment/bookappointment';
import { Certificaterequest } from './components/pages/certificaterequest/certificaterequest';
import { Residentsdirectory } from './components/pages/residentsdirectory/residentsdirectory';
import { Notification } from './components/pages/notification/notification';
import { Profile } from './components/pages/profile/profile';




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
        { path: 'residentsdirectory', component: Residentsdirectory },
        { path: 'notification', component: Notification },
        { path: 'profile', component: Profile },

        ]
  }
];