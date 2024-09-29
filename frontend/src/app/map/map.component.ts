import { Component, AfterViewInit } from '@angular/core';
import { InputNumberModule } from 'primeng/inputnumber';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import 'lrm-graphhopper';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoordinateService } from '../coordinate.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [InputNumberModule, CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})


export class MapComponent implements AfterViewInit {
  private map: any;
  private routingControl: L.Routing.Control | null = null;
  latitudeStart: number = 50.06143;
  longitudeStart: number = 19.93658;
  latitudeFinish: number = 50.049683;
  longitudeFinish: number = 19.944544;
  private radius: number = 10;
  private accidentCoords: [number, number] = [50.055, 19.945]; // Sample accident coordinates, adjust as needed

  constructor(private coordinateService: CoordinateService) {}

  // Initialize the map
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

  // Method to convert filtered coordinates to GeoJSON Point features in a FeatureCollection
  private filteredCoordinatesToGeoJSON(filteredCoordinates: any[]): any {
    console.log('Converting coordinates to GeoJSON Point Features');

    return {
      type: 'FeatureCollection',
      features: filteredCoordinates.map((coord: any, index: number) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [coord.lng, coord.lat]  // Ensure coordinates are in [lng, lat] order
        },
        properties: {
          name: `Sample Location ${index + 1}`  // Optionally add a name or other properties
        }
      }))
    };
  }

  // Add a route and filter the coordinates
  public addRoute(): void {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      console.log('Removed previous route');
    }

    this.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(this.latitudeStart, this.longitudeStart),
        L.latLng(this.latitudeFinish, this.longitudeFinish)
      ],
      router: new (L.Routing as any).GraphHopper('3c4ee12e-a6c1-4915-a4d5-0bebcbde7a6a', {
        urlParameters: { vehicle: 'bike' }
      }),
      lineOptions: {
        styles: [{ color: 'blue', opacity: 0.6, weight: 5 }],
        extendToWaypoints: true,
        missingRouteTolerance: 1
      },
      routeWhileDragging: true,
      addWaypoints: false
    }).addTo(this.map);

    // Filter the coordinates after the route is found
    this.routingControl.on('routesfound', (e) => {
      const routes = e.routes;
      const thresholdDistance = 50;
      const thresholdAngle = 30;

      const coordinates = routes[0].coordinates;
      const filteredCoordinates: any[] = [coordinates[0]];

      const getAngleBetweenPoints = (p1: any, p2: any, p3: any): number => {
        const dx1 = p2.lng - p1.lng;
        const dy1 = p2.lat - p1.lat;
        const dx2 = p3.lng - p2.lng;
        const dy2 = p3.lat - p2.lat;

        const dotProduct = dx1 * dx2 + dy1 * dy2;
        const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        return Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI);
      };

      const getDistanceBetweenPoints = (p1: any, p2: any): number => {
        const latlng1 = L.latLng(p1.lat, p1.lng);
        const latlng2 = L.latLng(p2.lat, p2.lng);
        return latlng1.distanceTo(latlng2);
      };

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
          if (environment.debug_display) {
            L.circle(L.latLng(currentPoint.lat, currentPoint.lng), {
              color: 'red',
              fillColor: '#f03',
              fillOpacity: 0.5,
              radius: 35
            }).addTo(this.map);
          }
        }
      }

      filteredCoordinates.push(coordinates[coordinates.length - 1]);

      if (filteredCoordinates) {
        console.log('Filtered coordinates:', filteredCoordinates);
        // Convert filtered coordinates to GeoJSON
        const geoJSONRoute = this.filteredCoordinatesToGeoJSON(filteredCoordinates);
        console.log('GeoJSON Route:', geoJSONRoute);
        // Store the GeoJSON in the CoordinateService
        this.coordinateService.setGeoJSON(geoJSONRoute);
      }

      const routingContainer = document.querySelector('.leaflet-routing-container');
      if (routingContainer) {
        (routingContainer as HTMLElement).style.display = 'none';
      }
    });

    this.routingControl.on('routingerror', (e) => {
      console.error('Routing error:', e);
    });
  }

  // Fetch roads around the accident using Overpass API
  private fetchNearbyRoads(): void {
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];way["highway"](around:${this.radius},${this.accidentCoords[0]},${this.accidentCoords[1]});out tags geom;`;

    fetch(overpassUrl)
      .then((response) => response.json())
      .then((data) => {
        // Process each road (way) from the Overpass API response
        data.elements.forEach((element: any) => {
          if (element.type === 'way' && element.geometry) {
            const latlngs = element.geometry.map((geom: any) => [geom.lat, geom.lon]);

            // Draw the road as a polyline and set the color to red
            L.polyline(latlngs, { color: 'red', weight: 6, opacity: 0.8 }).addTo(this.map);

          }
        });
      })
      .catch((err) => {
        console.error('Error fetching road data from Overpass API: ', err);
      });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.addRoute();
    this.fetchNearbyRoads(); // Call the function after initializing the map and adding routes
  }
}
