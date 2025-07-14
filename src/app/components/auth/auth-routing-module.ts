import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sign } from 'crypto';
import { SignIn } from './sign-in/sign-in';
import { SignUp } from './sign-up/sign-up';
import { ForgetPassword } from './forget-password/forget-password';

const routes: Routes = [
  {
    path: '',
    component: SignIn,
  },
   {
    path: 'sign-in',
    component: SignIn,
  },
   {
    path: 'sign-up',
    component: SignUp,
  },
   {
    path: 'forgot-password',
    component: ForgetPassword,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
