import { AfterViewInit, Component } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import 'lrm-graphhopper';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: any;

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

  private addRoute(): void {
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(50.06143, 19.93658),  // Starting point
        L.latLng(50.049683, 19.944544)  // Destination point
      ],
      // router: new L.Routing.GraphHopper('3c4ee12e-a6c1-4915-a4d5-0bebcbde7a6a', {
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
      routeWhileDragging: true,  // Allow route to be updated while dragging waypoints
      addWaypoints: false,   // Disable the draggable waypoints UI
    });

    routingControl.addTo(this.map);
    // Log successful routing responses
    routingControl.on('routesfound', function(e) {
      const routes = e.routes;
      console.log('Routes found:', routes);
    });

    // Log any errors during routing
    routingControl.on('routingerror', function(e) {
      console.error('Routing error:', e);
    });
  }

  constructor() { }

  ngAfterViewInit(): void {
    this.initMap();
    this.addRoute();
  }
}
