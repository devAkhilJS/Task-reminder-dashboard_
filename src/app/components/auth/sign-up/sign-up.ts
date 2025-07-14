import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from '@angular/fire/auth';

@Component({
  selector: 'app-sign-up',
  imports: [ CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css'
})
export class SignUp {
   authForm!: FormGroup;

  auth = inject(Auth);
  router = inject(Router);
  googleAuthProvider = new GoogleAuthProvider();

  isSubmissionInProgress = false;
  errorMessage: string = '';

  constructor() {
    this.initForm();
  }

  initForm() {
    this.authForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    });
  }

  onSubmit() {
    if (this.authForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    this.isSubmissionInProgress = true;
    this.errorMessage = '';

    createUserWithEmailAndPassword(
      this.auth,
      this.authForm.value.email!,
      this.authForm.value.password!
    )
      .then(() => {
        this.redirectToDashboardPage();
      })
      .catch((error) => {
        this.isSubmissionInProgress = false;

        switch (error.code) {
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email format.';
            break;
          case 'auth/user-not-found':
            this.errorMessage = 'No user found with this email.';
            break;
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password.';
            break;
          case 'auth/too-many-requests':
            this.errorMessage = 'Too many attempts. Please try again later.';
            break;
          default:
            this.errorMessage = 'Sign-in failed. Please try again.';
        }
      });
  }
  onSignInWithGoogle() {
    signInWithPopup(this.auth, this.googleAuthProvider)
    .then((response: any) => {
  this.redirectToDashboardPage();
})
    .catch((error: any) => {
      console.error('Google sign-in error:', error);
      this.errorMessage = 'Google sign-in failed. Please try again.';
      
    });
  }

  redirectToDashboardPage() {
    this.router.navigate(['/dashboard']);
  }


}
