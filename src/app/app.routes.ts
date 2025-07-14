import { Routes } from '@angular/router';
import { WelcomePage } from './components/welcome-page/welcome-page';
import {AuthGuard, redirectUnauthorizedTo } from '@angular/fire/auth-guard';
import { UserResolver } from './services/user.resolver';

const redirectToLogin = () => redirectUnauthorizedTo('/auth/sign-in');
export const routes: Routes = [
    {
    path:'',
    component: WelcomePage
    },
    {
        path:'auth',
        loadChildren: () => import('./components/auth/auth-module')
        .then(m => m.AuthModule)
    },
     {
        path:'dashboard',
        loadChildren: () => import('./components/dashboard/dashboard-module')
        .then(m => m.DashboardModule),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectToLogin 

        },
        resolve:{
            user: UserResolver
        }
    }
];
