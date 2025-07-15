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
    this.locationService.location$.subscribe(
      (locationInfo: LocationInfo) => {
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
        this.isLocationLoading = false;
      }
    );

    this.getCurrentLocation();
  }

  getCurrentLocation() {
    this.isLocationLoading = true;
    
    const loadingTimeout = setTimeout(() => {
      if (this.isLocationLoading) {
        this.isLocationLoading = false;
        if (!this.currentLocation) {
          this.locationDisplay = 'Location service timed out';
        }
      }
    }, 15000);
    
    this.locationService.getLocation().subscribe(
      (locationInfo: LocationInfo) => {
        clearTimeout(loadingTimeout);
        
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
        this.locationService.setLocation(locationInfo);
        this.isLocationLoading = false;
      },
      (error) => {
        clearTimeout(loadingTimeout);
        
        this.locationDisplay = 'Unable to retrieve location';
        this.isLocationLoading = false;
        console.error('Location error:', error);
      }
    );
  }

  async onChangeLocation() {
    this.isLocationLoading = true;
    
    const loadingTimeout = setTimeout(() => {
      if (this.isLocationLoading) {
        this.isLocationLoading = false;
        console.log('Location update timed out');
      }
    }, 15000);
    
    this.locationService.getLocation().subscribe(
      async (locationInfo: LocationInfo) => {
        this.currentLocation = locationInfo;
        this.locationDisplay = `${locationInfo.city}, ${locationInfo.state}`;
        this.locationService.setLocation(locationInfo);
        
        try {
          const updateSuccess = await this.updateLocationInFirebase(locationInfo);
          
          if (updateSuccess) {
            console.log(`Location updated in Firebase: ${locationInfo.placeName}`);
          } else {
            console.warn('Firebase update was not successful after retries');
          }
        } catch (error) {
          console.error('Firebase update error:', error);
        } finally {
          clearTimeout(loadingTimeout);
          this.isLocationLoading = false;
        }
      },
      (error) => {
        clearTimeout(loadingTimeout);
        this.isLocationLoading = false;
        console.error('Location update error:', error);
      }
    );
  }

  private async updateLocationInFirebase(locationInfo: LocationInfo) {
    if (this.user && this.user.uid) {
      try {
        const userDocRef = doc(this.firestore, 'users', this.user.uid);
        
        const locationData = {
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude,
          placeName: locationInfo.placeName || '',
          city: locationInfo.city || '',
          state: locationInfo.state || '',
          country: locationInfo.country || '',
          lastUpdated: new Date().toISOString()
        };
        
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000;
        
        const updateWithRetry = async () => {
          try {
            await updateDoc(userDocRef, { location: locationData });
            console.log('Location updated in Firebase successfully');
            return true;
          } catch (err) {
            retryCount++;
            console.error(`Firebase update attempt ${retryCount} failed:`, err);
            
            if (retryCount < maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount - 1) * (0.5 + Math.random() * 0.5);
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return updateWithRetry();
            } else {
              console.error('Max retries reached. Firebase update failed.');
              return false;
            }
          }
        };
        
        return updateWithRetry();
      } catch (error) {
        console.error('Error updating location in Firebase:', error);
        return false;
      }
    }
    return false;
  }

  onSignOut() {
    signOut(this.auth).then(() => {
      this.router.navigate(['/auth/sign-in']);
    }).catch((error) => {
      console.error('Sign-out error:', error);
    });
  }
}