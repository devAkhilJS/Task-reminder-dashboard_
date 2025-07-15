import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface LocationInfo {
  latitude: number;
  longitude: number;
  placeName: string;
  city: string;
  state: string;
  country: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private locationSubject = new Subject<LocationInfo>();
  location$ = this.locationSubject.asObservable();

  constructor(private http: HttpClient) { }

  getLocation(): Observable<LocationInfo> {
    return new Observable(observer => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Get place name from coordinates
            this.getPlaceName(lat, lon).subscribe(
              (locationInfo) => {
                observer.next(locationInfo);
                observer.complete();
              },
              (error) => {
                // If reverse geocoding fails, still return coordinates
                const fallbackLocation: LocationInfo = {
                  latitude: lat,
                  longitude: lon,
                  placeName: `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`,
                  city: 'Unknown',
                  state: 'Unknown',
                  country: 'Unknown'
                };
                observer.next(fallbackLocation);
                observer.complete();
              }
            );
          },
          (error) => {
            observer.error(error);
          }
        );
      } else {
        observer.error('Geolocation is not supported by this browser.');
      }
    });
  }

  private getPlaceName(lat: number, lon: number): Observable<LocationInfo> {
    // Using OpenStreetMap Nominatim API (free)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    return new Observable(observer => {
      this.http.get(url).subscribe(
        (response: any) => {
          const address = response.address || {};
          const locationInfo: LocationInfo = {
            latitude: lat,
            longitude: lon,
            placeName: response.display_name || `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`,
            city: address.city || address.town || address.village || 'Unknown',
            state: address.state || 'Unknown',
            country: address.country || 'Unknown'
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
    this.locationSubject.next(location);
  }
}