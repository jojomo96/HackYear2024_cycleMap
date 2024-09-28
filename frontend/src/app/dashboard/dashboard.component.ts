import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ButtonModule, TableModule, CardModule, DialogModule, CommonModule, CheckboxModule, FormsModule, LeafletModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  ngOnInit(): void {
    // Initialize the map
    const map = L.map('map', {
      center: [39.95, -75.16],  // Center the map near Philadelphia
      zoom: 14
    });

    // Add base map layer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '©OpenStreetMap'
    }).addTo(map);

    // Accident location
    const accidentCoords = [39.9488, -75.1620];  // Example accident location (Philadelphia)
    const radius = 500;  // 500 meters radius

    // Draw a circle representing the accident zone
    L.circle(accidentCoords, { radius: radius, color: 'red', fillColor: '#f03', fillOpacity: 0.5 }).addTo(map);

    // Fetch roads around the accident using Overpass API
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];way["highway"](around:${radius},${accidentCoords[0]},${accidentCoords[1]});out tags geom;`;
    
    fetch(overpassUrl)
      .then(response => response.json())
      .then(data => {
        // Process each road (way) from the Overpass API response
        data.elements.forEach((element: any) => {
          if (element.type === "way" && element.geometry) {
            const latlngs = element.geometry.map((geom: any) => [geom.lat, geom.lon]);
            
            // Draw the road as a polyline and set the color to red
            L.polyline(latlngs, { color: 'red', weight: 6, opacity: 0.8 }).addTo(map);
            
            // If the road has a name, display it
            if (element.tags && element.tags.name) {
              const middleIndex = Math.floor(latlngs.length / 2);
              const middleLatLng = latlngs[middleIndex];
              
              L.marker(middleLatLng)
                .bindTooltip(element.tags.name, { permanent: true, direction: 'top' })
                .addTo(map);
            }
          }
        });
      })
      .catch(err => {
        console.error("Error fetching road data from Overpass API: ", err);
      });

    // Adding navigation (Leaflet Routing Machine)
    const routeControl = L.Routing.control({
      waypoints: [
        L.latLng(39.95, -75.16),  // Start point
        L.latLng(39.9488, -75.1620)  // Accident location
      ],
      routeWhileDragging: true,
      showAlternatives: true,
      createMarker: (i: any, waypoint: any, n: any) => {
        return L.marker(waypoint.latLng).bindPopup(`Waypoint ${i + 1}`);
      },
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      })
    }).addTo(map);
  }
}