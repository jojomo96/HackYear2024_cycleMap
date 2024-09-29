import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface GeoJSON {
  type: string;
  features: any[]; // Use a more specific type if you have a defined structure
}

@Injectable({
  providedIn: 'root'
})
export class CoordinateService {
  // BehaviorSubject to hold and emit GeoJSON data
  private geojsonSource = new BehaviorSubject<GeoJSON | null>(null);
  geojson$ = this.geojsonSource.asObservable();

  // Method to update GeoJSON data
  setGeoJSON(data: GeoJSON) {
    this.geojsonSource.next(data);
  }
}
