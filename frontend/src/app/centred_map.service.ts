// centred-map.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CentredMapService {
  private coordinatesSubject = new BehaviorSubject<[number, number] | null>(null);
  public coordinates$ = this.coordinatesSubject.asObservable();

  // Method to emit new coordinates for map centering
  setCenterCoordinates(lat: number, lng: number): void {
    this.coordinatesSubject.next([lat, lng]);
  }
}
