import { Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
@Component({
  selector: 'app-forget-password',
  imports: [MatFormFieldModule, MatInputModule, RouterModule, CommonModule, ReactiveFormsModule, MatProgressSpinner],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.css'
})
export class ForgetPassword {
  auth = inject(Auth);
  router= inject(RouterModule);
  form!: FormGroup;

  errorMessage: string = '';
  isSubmissionInProgess: boolean = false;
  isPasswordResetEmailSent: boolean = false;


  constructor(){
    this.initForm();
  }
  initForm() {
    this.form = new FormGroup({
      email: new FormControl('', Validators.required),
    });
  }
  onSubmit(){
    if (this.form.invalid) 
      return;
    this.isSubmissionInProgess = true;
    
    sendPasswordResetEmail(this.auth, this.form.value.email)
      .then(() => {
        this.isPasswordResetEmailSent = true;

      })
      .catch((error) => {
        this.isSubmissionInProgess = false;
        this.errorMessage = "An error occurred while sending the password reset email. Please try again.";
      });

  }

}
