import { Injectable } from '@angular/core';
import { Observable, Subject, of, throwError, timer } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';

export interface LocationInfo {
  latitude: number;
  longitude: number;
  placeName: string;
  city: string;
  state: string;
  country: string;
  timestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private locationSubject = new Subject<LocationInfo>();
  location$ = this.locationSubject.asObservable();
  
  private cachedLocation: LocationInfo | null = null;
  private readonly CACHE_EXPIRY_TIME = 5 * 60 * 1000;
  private readonly LOCATION_TIMEOUT = 10000;

  constructor(private http: HttpClient) {
    this.loadCachedLocation();
  }

  getLocation(): Observable<LocationInfo> {
    if (this.cachedLocation && 
        this.cachedLocation.timestamp && 
        (Date.now() - this.cachedLocation.timestamp) < this.CACHE_EXPIRY_TIME) {
      console.log('Using cached location data');
      return of(this.cachedLocation);
    }
    
    return new Observable(observer => {
      const timeoutId = setTimeout(() => {
        if (this.cachedLocation) {
          console.log('Location request timed out, using cached data');
          observer.next(this.cachedLocation);
          observer.complete();
        } else {
          observer.error('Location request timed out');
        }
      }, this.LOCATION_TIMEOUT);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            this.getPlaceName(lat, lon).subscribe(
              (locationInfo) => {
                locationInfo.timestamp = Date.now();
                this.cacheLocation(locationInfo);
                
                clearTimeout(timeoutId);
                observer.next(locationInfo);
                observer.complete();
              },
              (error) => {
                console.error('Error getting place name:', error);
                const fallbackLocation: LocationInfo = {
                  latitude: lat,
                  longitude: lon,
                  placeName: `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`,
                  city: 'Unknown',
                  state: 'Unknown',
                  country: 'Unknown',
                  timestamp: Date.now()
                };
                
                this.cacheLocation(fallbackLocation);
                clearTimeout(timeoutId);
                observer.next(fallbackLocation);
                observer.complete();
              }
            );
          },
          (error) => {
            console.error('Geolocation error:', error);
            if (this.cachedLocation) {
              observer.next(this.cachedLocation);
              observer.complete();
            } else {
              clearTimeout(timeoutId);
              observer.error(error);
            }
          },
          { timeout: this.LOCATION_TIMEOUT - 1000 }
        );
      } else {
        clearTimeout(timeoutId);
        observer.error('Geolocation is not supported by this browser.');
      }
    });
  }

  private getPlaceName(lat: number, lon: number): Observable<LocationInfo> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    return new Observable(observer => {
      this.http.get(url)
        .pipe(
          timeout(5000),
          catchError(error => {
            console.error('Nominatim API error:', error);
            return throwError(() => error);
          })
        )
        .subscribe(
          (response: any) => {
            const address = response.address || {};
            const locationInfo: LocationInfo = {
              latitude: lat,
              longitude: lon,
              placeName: response.display_name || `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`,
              city: address.city || address.town || address.village || 'Unknown',
              state: address.state || 'Unknown',
              country: address.country || 'Unknown',
              timestamp: Date.now()
            };
            observer.next(locationInfo);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }
  

  setLocation(location: LocationInfo) {
    if (!location.timestamp) {
      location.timestamp = Date.now();
    }
    this.locationSubject.next(location);
    this.cacheLocation(location);
  }
  
  private cacheLocation(location: LocationInfo) {
    this.cachedLocation = location;
    try {
      localStorage.setItem('cachedLocation', JSON.stringify(location));
    } catch (error) {
      console.error('Error saving location to localStorage:', error);
    }
  }
  
  private loadCachedLocation() {
    try {
      const cachedData = localStorage.getItem('cachedLocation');
      if (cachedData) {
        this.cachedLocation = JSON.parse(cachedData);
        if (this.cachedLocation) {
          this.locationSubject.next(this.cachedLocation);
        }
      }
    } catch (error) {
      console.error('Error loading cached location:', error);
    }
  }
}