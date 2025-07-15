import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationInfo, LocationService } from '../../../../services/location.service';
import { Auth, User, signOut } from '@angular/fire/auth';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule, 
    MatIconModule, 
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    CommonModule
  ],
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.css'],
})
export class Toolbar implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  user: User = this.activatedRoute.snapshot.data['user'];
  currentLocation: LocationInfo | null = null;
  locationDisplay: string = 'Unknown Location';
  isLocationLoading: boolean = false;

  constructor(private locationService: LocationService) {
    console.log('logged in user', this.user);
  }

  ngOnInit() {
    // Subscribe to location changes
    this.locationService.location$.subscribe(
      (locationInfo: LocationInfo) => {
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
      }
    );

    // Get initial location
    this.getCurrentLocation();
  }

  getCurrentLocation() {
    this.isLocationLoading = true;
    this.locationService.getLocation().subscribe(
      (locationInfo: LocationInfo) => {
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
        this.locationService.setLocation(locationInfo);
        this.isLocationLoading = false;
      },
      (error) => {
        this.locationDisplay = 'Unable to retrieve location';
        this.isLocationLoading = false;
        console.error('Location error:', error);
      }
    );
  }

  async onChangeLocation() {
    this.isLocationLoading = true;
    
    this.locationService.getLocation().subscribe(
      async (locationInfo: LocationInfo) => {
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
        this.locationService.setLocation(locationInfo);
        
        // Update location in Firebase
        await this.updateLocationInFirebase(locationInfo);
        
        this.isLocationLoading = false;
        // Better user feedback than alert
        console.log(`Location updated: ${locationInfo.placeName}`);
      },
      (error) => {
        this.isLocationLoading = false;
        console.error('Location update error:', error);
        // You could show a toast notification here instead of alert
      }
    );
  }

  private async updateLocationInFirebase(locationInfo: LocationInfo) {
    if (this.user && this.user.uid) {
      try {
        const userDocRef = doc(this.firestore, 'users', this.user.uid);
        await updateDoc(userDocRef, {
          location: {
            latitude: locationInfo.latitude,
            longitude: locationInfo.longitude,
            placeName: locationInfo.placeName,
            city: locationInfo.city,
            state: locationInfo.state,
            country: locationInfo.country,
            lastUpdated: new Date()
          }
        });
        console.log('Location updated in Firebase successfully');
      } catch (error) {
        console.error('Error updating location in Firebase:', error);
      }
    }
  }

  onSignOut() {
    signOut(this.auth).then(() => {
      this.router.navigate(['/auth/sign-in']);
    }).catch((error) => {
      console.error('Sign-out error:', error);
    });
  }
}