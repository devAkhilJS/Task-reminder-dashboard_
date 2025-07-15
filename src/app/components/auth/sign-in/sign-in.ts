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
import { LocationService, LocationInfo } from '../../../services/location.service';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientModule } from '@angular/common/http';
import {
  Auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    HttpClientModule,
  ],
  templateUrl: './sign-in.html',
  styleUrls: ['./sign-in.css'],
})
export class SignIn {
  authForm!: FormGroup;

  auth = inject(Auth);
  firestore = inject(Firestore);
  router = inject(Router);
  googleAuthProvider = new GoogleAuthProvider();

  isSubmissionInProgress = false;
  errorMessage: string = '';
  locationDisplay: string = 'Fetching location...';
  currentLocation: LocationInfo | null = null;

  constructor(private locationService: LocationService) {
    this.initForm();
    this.getLocation();
  }

  getLocation() {
    this.locationService.getLocation().subscribe(
      (locationInfo: LocationInfo) => {
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
        this.locationService.setLocation(locationInfo);
      },
      (error) => {
        this.locationDisplay = 'Unable to retrieve location.';
        console.error(error);
      }
    );
  }

  initForm() {
    this.authForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    });
  }

  async storeUserLocation(userId: string) {
    if (this.currentLocation) {
      try {
        const userDocRef = doc(this.firestore, 'users', userId);
        await updateDoc(userDocRef, {
          location: {
            latitude: this.currentLocation.latitude,
            longitude: this.currentLocation.longitude,
            placeName: this.currentLocation.placeName,
            city: this.currentLocation.city,
            state: this.currentLocation.state,
            country: this.currentLocation.country,
            lastUpdated: new Date()
          }
        });
        console.log('Location stored successfully');
      } catch (error) {
        console.error('Error storing location:', error);
      }
    }
  }

  onSubmit() {
    if (this.authForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    this.isSubmissionInProgress = true;
    this.errorMessage = '';

    signInWithEmailAndPassword(
      this.auth,
      this.authForm.value.email!,
      this.authForm.value.password!
    )
      .then(async (userCredential) => {
        // Store location after successful sign-in
        await this.storeUserLocation(userCredential.user.uid);
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
      .then(async (userCredential: any) => {
        // Store location after successful Google sign-in
        await this.storeUserLocation(userCredential.user.uid);
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