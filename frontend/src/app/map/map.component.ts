import { Component, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { InputNumberModule } from 'primeng/inputnumber';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import 'lrm-graphhopper';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoordinateService } from '../coordinate.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [InputNumberModule, CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: any;
  private routingControl: L.Routing.Control| null = null;
  latitudeStart: number = 50.06143;
  longitudeStart: number = 19.93658;
  latitudeFinish: number = 50.049683;
  longitudeFinish: number = 19.944544;

  private initMap(): void {
    this.map = L.map('map', {
      center: [50.06143, 19.93658],
      zoom: 14
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    tiles.addTo(this.map);
  }

  constructor (private coordinateService: CoordinateService) {}
    
  calculateGeoJSON() {
    // Replace this with your actual GeoJSON fetching or calculating logic
    const geojsonData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [19.9450955, 50.0716554],
          },
          properties: {
            name: 'Sample Location 1',
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [19.939628, 50.062622],
          },
          properties: {
            name: 'Sample Location 2',
          },
        },
        // Add more features as needed
      ],
    };

    // Update the shared GeoJSON service with the new data
    this.coordinateService.setGeoJSON(geojsonData);
  }


  public addRoute(): void {
    if (this.routingControl) {
        this.map.removeControl(this.routingControl);
        console.log('Removed previous route');
    }

    this.routingControl = L.Routing.control({
        waypoints: [
            L.latLng(this.latitudeStart, this.longitudeStart),  // Starting point
            L.latLng(this.latitudeFinish, this.longitudeFinish)  // Destination point
        ],
        router: new (L.Routing as any).GraphHopper('3c4ee12e-a6c1-4915-a4d5-0bebcbde7a6a', {
            urlParameters: {
                vehicle: 'bike'
            }
        }),
        lineOptions: {
            styles: [{ color: 'blue', opacity: 0.6, weight: 5 }],
            extendToWaypoints: true,
            missingRouteTolerance: 1
        },
        routeWhileDragging: true,
        addWaypoints: false
    }).addTo(this.map);

    this.routingControl.on('routesfound', (e) => {
        const routes = e.routes;
        const thresholdDistance = 50;  // Threshold distance in meters for overlap removal
        const thresholdAngle = 30;     // Threshold angle in degrees to detect significant turns

        // Helper function to calculate the angle between two vectors
        const getAngleBetweenPoints = (p1: any, p2: any, p3: any): number => {
            const dx1 = p2.lng - p1.lng;
            const dy1 = p2.lat - p1.lat;
            const dx2 = p3.lng - p2.lng;
            const dy2 = p3.lat - p2.lat;

            const dotProduct = dx1 * dx2 + dy1 * dy2;
            const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            const angle = Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI);
            return angle;
        };

        // Helper function to calculate the distance between two points
        const getDistanceBetweenPoints = (p1: any, p2: any): number => {
            const latlng1 = L.latLng(p1.lat, p1.lng);
            const latlng2 = L.latLng(p2.lat, p2.lng);
            return latlng1.distanceTo(latlng2);  // Returns distance in meters
        };

        const coordinates = routes[0].coordinates;
        const filteredCoordinates: any[] = [coordinates[0]]; // Start with the first point

        // for (let i = 1; i < coordinates.length - 1; i++) {
        //    // Mark significant direction changes with a red circle
        //    L.circle(L.latLng(coordinates[i], coordinates[i]), {
        //     color: 'red',
        //     fillColor: '#f03',
        //     fillOpacity: 0.5,
        //     radius: 15
        //   }).addTo(this.map);
        // }

        for (let i = 1; i < coordinates.length - 1; i++) {
            const prevPoint = filteredCoordinates[filteredCoordinates.length - 1];
            const currentPoint = coordinates[i];
            const nextPoint = coordinates[i + 1];
            const distance = getDistanceBetweenPoints(prevPoint, currentPoint);
            const angle = getAngleBetweenPoints(prevPoint, currentPoint, nextPoint);

            // Only keep the point if it is farther than the threshold distance and the angle change is significant
            if (distance > thresholdDistance && angle >= thresholdAngle) {
                filteredCoordinates.push(currentPoint);

                // Mark significant direction changes with a red circle
                L.circle(L.latLng(currentPoint.lat, currentPoint.lng), {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.5,
                    radius: 35
                }).addTo(this.map);
            }
        }

        // Always add the last point (the destination)
        filteredCoordinates.push(coordinates[coordinates.length - 1]);

        // Plot the final filtered points
        console.log('Filtered coordinates:', filteredCoordinates);

        // Hide the default routing container
        const routingContainer = document.querySelector('.leaflet-routing-container');
        if (routingContainer) {
            (routingContainer as HTMLElement).style.display = 'none';
        }
    });
    // Log successful routing responses
    this.routingControl.on('routesfound', (e: any) => {
      this.calculateGeoJSON();
      const routes = e.routes;
      console.log('Routes found:', routes);
    });

    this.routingControl.on('routingerror', function(e) {
        console.error('Routing error:', e);
    });
}

  ngAfterViewInit(): void {
    this.initMap();
    this.addRoute();
  }
}
