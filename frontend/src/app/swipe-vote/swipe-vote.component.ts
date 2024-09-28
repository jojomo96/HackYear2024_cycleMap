import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button'; // PrimeNG Button Module
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-swipe-vote',
  standalone: true,
  imports: [CommonModule, ButtonModule], // Import PrimeNG Button Module
  templateUrl: './swipe-vote.component.html',
  styleUrls: ['./swipe-vote.component.scss'],
})
export class SwipeVoteComponent {
  // List of coordinates (latitude, longitude) to cycle through
  coordinates = [
    { lat: 50.0716554, lng: 19.9450955 },
    { lat: 50.062622, lng: 19.939628 },
    { lat: 50.060342, lng: 19.930246 },
  ];

  // Current index of the coordinate being displayed
  currentIndex = 0;

  // Placeholder for the error state
  imageError = false;

  // Method to get the current image URL based on the current coordinates
  getImageUrl(): string {
    const apiKey = ''
    const currentCoordinate = this.coordinates[this.currentIndex];
    return `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${currentCoordinate.lat},${currentCoordinate.lng}&heading=120&pitch=0&key=${environment.googleMapsApiKey}`;
  }

  // Handler for the Upvote button with latitude and longitude parameters
  upvote(lat: number, lng: number) {
    console.log('Upvote clicked for coordinates:', lat, lng);
    this.nextCoordinate();
  }

  // Handler for the Downvote button with latitude and longitude parameters
  downvote(lat: number, lng: number) {
    console.log('Downvote clicked for coordinates:', lat, lng);
    this.nextCoordinate();
  }

  // Method to move to the next coordinate in the list
  nextCoordinate() {
    this.currentIndex = (this.currentIndex + 1) % this.coordinates.length;
    this.imageError = false; // Reset error state when moving to the next image
  }

  // Method to handle image loading error
  onImageError() {
    this.imageError = true;
  }
}
