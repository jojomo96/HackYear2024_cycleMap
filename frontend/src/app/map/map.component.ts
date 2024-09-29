import { Component, OnInit, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleButtonModule } from 'primeng/togglebutton';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import 'lrm-graphhopper';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CoordinateService } from '../coordinate.service';
import { CentredMapService } from '../centred_map.service';
import { environment } from '../../environments/environment';

import PocketBase from 'pocketbase';

const pb = new PocketBase(environment.pocketBaseUrl);

async function fetchAllOSMWays() {
  let page = 1;
  const perPage = 50;
  let allOSMWays: any[] = [];

  try {
    while (true) {
      const result = await pb.collection('osm_ways').getList(page, perPage, {
        expand: 'featuresId,featuresId.geometry,featuresId.properties'
      });

      allOSMWays = allOSMWays.concat(result.items);

      if (result.items.length < perPage) {
        break;
      }

      page++;
    }

    console.log('All OSM ways have been successfully fetched with expanded feature (geometry and properties).');
    console.log(allOSMWays);

    return allOSMWays;
  } catch (error) {
    console.error('Error fetching OSM ways data:', error);
    return [];
  }
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [InputNumberModule, CommonModule, FormsModule, ToggleButtonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  private map: any;
  private routingControl: L.Routing.Control | null = null;
  private centerMarker: L.Marker | null = null; // Center marker
  latitudeStart: number = 50.06143;
  longitudeStart: number = 19.93658;
  latitudeFinish: number = 50.049683;
  longitudeFinish: number = 19.944544;
  showRoute: boolean = true;
  private centredMapSubscription!: Subscription;
  private lastCenterCoordinates: [number, number] = [50.06143, 19.93658]; // Store the last known center

  constructor(private coordinateService: CoordinateService, private centredMapService: CentredMapService) {}

  ngOnInit() {
    this.map = L.map('map', {
      center: this.lastCenterCoordinates, // Initial center
      zoom: 14
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    tiles.addTo(this.map);

    this.addRoute();

    // Add the marker at the initial center of the map
    this.centerMarker = L.marker(this.lastCenterCoordinates, { draggable: false }).addTo(this.map);

    this.centredMapSubscription = this.centredMapService.coordinates$.subscribe(
      (newCoordinates: [number, number] | null) => {
        if (newCoordinates) {
          this.updateMapCenter(newCoordinates);
        }
      }
    );
  }

  OnToggleChange() {
    if (this.showRoute) {
      // Show the route and marker
      this.addRoute();

      // Add the marker back to the map if it's not already there
      if (this.centerMarker && !this.map.hasLayer(this.centerMarker)) {
        this.centerMarker.addTo(this.map);
      }
    } else {
      // Remove the route and marker
      if (this.routingControl) {
        this.map.removeControl(this.routingControl);
      }

      // Remove the marker from the map
      if (this.centerMarker && this.map.hasLayer(this.centerMarker)) {
        this.map.removeLayer(this.centerMarker);
      }
    }
  }

  updateMapCenter(newCoordinates: [number, number]): void {
    const currentZoom = this.map.getZoom();
    console.log('Updating map center to:', newCoordinates);
    
    // Update the last known center coordinates
    this.lastCenterCoordinates = newCoordinates;
    
    // Move the map to the new center
    this.map.setView(newCoordinates, currentZoom);

    // Update the marker position to the new center
    if (this.centerMarker) {
      this.centerMarker.setLatLng(newCoordinates);
    }
  }

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

        if (distance > thresholdDistance && angle >= thresholdAngle) {
          filteredCoordinates.push(currentPoint);

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
        const geoJSONRoute = this.filteredCoordinatesToGeoJSON(filteredCoordinates);
        console.log('GeoJSON Route:', geoJSONRoute);
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

  private filteredCoordinatesToGeoJSON(filteredCoordinates: any[]): any {
    console.log('Converting coordinates to GeoJSON Point Features');
    return {
      type: 'FeatureCollection',
      features: filteredCoordinates.map((coord: any, index: number) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [coord.lng, coord.lat]
        },
        properties: {
          name: `Sample Location ${index + 1}`
        }
      }))
    };
  }

  private async fetchNearbyRoads(): Promise<void> {
    try {
      const osmWays = await fetchAllOSMWays();

      osmWays.forEach((way: any) => {
        console.log('Processing way:', way);
        const score = way.expand.featuresId.expand.properties.score || 0;
        const normalizedScore = (score + 255) / 510;
        const color = `rgb(${Math.round(255 * (1 - normalizedScore))}, ${Math.round(255 * normalizedScore)}, 0)`;

        if (way.geometry) {
          const latlngs = way.geometry.map((geom: any) => [geom.lat, geom.lon]);
          L.polyline(latlngs, { color: color, weight: 6, opacity: 0.8 }).addTo(this.map);
        }
      });
    } catch (err) {
      console.error('Error fetching road data from PocketBase: ', err);
    }
  }

  ngAfterViewInit(): void {
    this.fetchNearbyRoads();
  }
}
