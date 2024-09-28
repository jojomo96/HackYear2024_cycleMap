import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button'; // PrimeNG Button Module
import { environment } from '../../environments/environment';
import PocketBase from 'pocketbase';
import { HttpClient } from '@angular/common/http';
import { co } from '@fullcalendar/core/internal-common';

const pb = new PocketBase(environment.pocketBaseUrl);



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

  constructor(public http: HttpClient) {

  }

  // Function to update or create an entry
async updateOrCreateEntry(latitude: number, longitude: number, newScore: number): Promise<void> {
  try {
    // Step 1: Check if an existing geometry entry matches the provided latitude and longitude
    const existingGeometry = await pb.collection('geometry').getList(1, 1, {
      filter: `latitude = ${latitude} && longitude = ${longitude}`,
    });

    if (existingGeometry.items.length > 0) {
      // If a matching geometry entry exists, retrieve it
      const geometryEntry = existingGeometry.items[0];

      // Step 2: Find the related Swipe_to_ride entry
      const existingFeature = await pb.collection('features').getList(1, 1, {
        filter: `geometry = "${geometryEntry.id}"`,
      });

      if (existingFeature.items.length > 0) {
        // If Swipe_to_ride exists, get the related properties entry using bracket notation
        const featureEntry = existingFeature.items[0];
        const propertiesId = featureEntry['properties']; // Accessing properties_id correctly

        // Step 3: Update the properties entry with the new score
        const existingProperty = await pb.collection('properties').getOne(propertiesId);
        const updatedScore = (existingProperty['score'] || 0) + newScore; // Handle missing score as zero

        await pb.collection('properties').update(propertiesId, {
          score: updatedScore,
        });
        console.log(`Updated score to ${updatedScore} for existing properties entry.`);
      } else {
        console.log('No related feature entry found for existing geometry entry.');
      }
    } else {
      // Create new geometry entry
      const geometryRes: any = await this.http.post('http://localhost:8090/api/collections/geometry/records', {
        type: 'default', // Replace with actual type if required
        longitude: longitude,
        latitude: latitude,
      }).toPromise();

      // Ensure the response contains the geometry data
      if (!geometryRes || !geometryRes.id) {
        throw new Error('Failed to create new geometry entry.');
      }

      const newGeometry: any = geometryRes;

      // Create new properties entry
      const propertiesRes: any = await this.http.post('http://localhost:8090/api/collections/properties/records', {
        name: 'default', // Replace with actual name if required
        score: newScore,
      }).toPromise();

      // Ensure the response contains the properties data
      if (!propertiesRes || !propertiesRes.id) {
        throw new Error('Failed to create new properties entry.');
      }

      const newProperties = propertiesRes;

      // Create new features entry
      await this.http.post('http://localhost:8090/api/collections/features/records', {
        type: 'default', // Replace with actual type if required
        geometry: newGeometry.id, // Correctly use the new geometry ID
        properties: newProperties.id, // Correctly use the new properties ID
      }).toPromise();

      console.log('Created new geometry, properties, and linked them in features.');
    }
  } catch (error) {
    console.error('Error updating or creating entry:', error);
  }
}


  // Method to get the current image URL based on the current coordinates
  getImageUrl(): string {
    const currentCoordinate = this.coordinates[this.currentIndex];
    return `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${currentCoordinate.lat},${currentCoordinate.lng}&heading=120&pitch=0&key=${environment.googleMapsApiKey}`;
  }

  // Handler for the Upvote button with latitude and longitude parameters
  upvote(lat: number, lng: number) {
    console.log('Upvote clicked for coordinates:', lat, lng);
    this.updateOrCreateEntry(lat, lng, 1);
    this.nextCoordinate();
  }

  // Handler for the Downvote button with latitude and longitude parameters
  downvote(lat: number, lng: number) {
    console.log('Downvote clicked for coordinates:', lat, lng);
    this.updateOrCreateEntry(lat, lng, -1);
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
