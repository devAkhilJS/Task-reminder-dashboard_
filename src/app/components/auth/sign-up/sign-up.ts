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
import { LocationService, LocationInfo } from '../../../services/location.service';
import { HttpClientModule } from '@angular/common/http';
import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-sign-up',
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
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css'],
})
export class SignUp {
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
        await setDoc(userDocRef, {
          location: {
            latitude: this.currentLocation.latitude,
            longitude: this.currentLocation.longitude,
            placeName: this.currentLocation.placeName,
            city: this.currentLocation.city,
            state: this.currentLocation.state,
            country: this.currentLocation.country,
            lastUpdated: new Date()
          },
          email: this.authForm.value.email,
          createdAt: new Date(),
        });
        console.log('User data with location stored successfully');
      } catch (error) {
        console.error('Error storing user data:', error);
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

    createUserWithEmailAndPassword(
      this.auth,
      this.authForm.value.email!,
      this.authForm.value.password!
    )
      .then(async (userCredential) => {
        // Store user data with location after successful sign-up
        await this.storeUserLocation(userCredential.user.uid);
        this.redirectToDashboardPage();
      })
      .catch((error) => {
        this.isSubmissionInProgress = false;

        switch (error.code) {
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email format.';
            break;
          case 'auth/email-already-in-use':
            this.errorMessage = 'Email is already registered.';
            break;
          case 'auth/weak-password':
            this.errorMessage = 'Password should be at least 6 characters.';
            break;
          case 'auth/too-many-requests':
            this.errorMessage = 'Too many attempts. Please try again later.';
            break;
          default:
            this.errorMessage = 'Sign-up failed. Please try again.';
        }
      });
  }

  onSignInWithGoogle() {
    signInWithPopup(this.auth, this.googleAuthProvider)
      .then(async (userCredential: any) => {
        // Store user data with location after successful Google sign-up
        await this.storeUserLocation(userCredential.user.uid);
        this.redirectToDashboardPage();
      })
      .catch((error: any) => {
        console.error('Google sign-up error:', error);
        this.errorMessage = 'Google sign-up failed. Please try again.';
      });
  }

  redirectToDashboardPage() {
    this.router.navigate(['/dashboard']);
  }
}