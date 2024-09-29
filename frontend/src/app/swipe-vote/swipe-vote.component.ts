import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button'; // PrimeNG Button Module
import { environment } from '../../environments/environment';
import PocketBase from 'pocketbase';
import { HttpClient } from '@angular/common/http';
import { GeoJSON, CoordinateService } from '../coordinate.service';

const pb = new PocketBase(environment.pocketBaseUrl);

@Component({
  selector: 'app-swipe-vote',
  standalone: true,
  imports: [CommonModule, ButtonModule], // Import PrimeNG Button Module
  templateUrl: './swipe-vote.component.html',
  styleUrls: ['./swipe-vote.component.scss'],
})
export class SwipeVoteComponent implements OnInit {
  geojson: GeoJSON | null = null; // Variable to store the GeoJSON data
  currentIndex = 0; // Current index of the feature being displayed
  imageError = false; // Placeholder for the error state

  constructor(public http: HttpClient, private coordinateService: CoordinateService) {}

  ngOnInit() {
    // Subscribe to the GeoJSON data updates from the service
    this.coordinateService.geojson$.subscribe((data: GeoJSON | null) => {
      this.geojson = data;
      if (this.geojson && this.geojson.features.length > 0) {
        this.currentIndex = 0; // Reset index when new data is received
      }
    });
  }

  // Function to calculate the updated score based on limits and proximity
  updateScoreLimitBased(currentScore: number, vote: number, maxScore = 255, minScore = -255, k = 0.2): number {
    let scoreChange;
    if (vote === 1) {
      // Upvote - Increase score towards +10
      scoreChange = k * (maxScore - currentScore);
    } else {
      // Downvote - Decrease score towards -10
      scoreChange = k * (currentScore - minScore);
    }

    // Calculate new score and clamp it within min and max scores
    let newScore = currentScore + (vote === 1 ? scoreChange : -scoreChange);
    return Math.max(Math.min(newScore, maxScore), minScore);
  }

  // Function to update or create an entry
  async updateOrCreateEntry(latitude: number, longitude: number, vote: number): Promise<void> {
    try {
      // Step 1: Check if an existing geometry entry matches the provided latitude and longitude
      const existingGeometry = await pb.collection('geometry').getList(1, 1, {
        filter: `latitude = ${latitude} && longitude = ${longitude}`,
      });

      if (existingGeometry.items.length > 0) {
        const geometryEntry = existingGeometry.items[0];

        // Step 2: Find the related Swipe_to_ride entry
        const existingFeature = await pb.collection('features').getList(1, 1, {
          filter: `geometry = "${geometryEntry.id}"`,
        });

        if (existingFeature.items.length > 0) {
          const featureEntry = existingFeature.items[0];
          const propertiesId = featureEntry['properties'];

          // Step 3: Update the properties entry with the new score using the scoring function
          const existingProperty = await pb.collection('properties').getOne(propertiesId);
          const currentScore = existingProperty['score'] || 0; // Handle missing score as zero
          const newScore = this.updateScoreLimitBased(currentScore, vote);

          await pb.collection('properties').update(propertiesId, {
            score: newScore,
          });
          console.log(`Updated score to ${newScore} for existing properties entry.`);
        } else {
          console.log('No related feature entry found for existing geometry entry.');
        }
      } else {
        // Create new geometry, properties, and feature entries
        const geometryRes: any = await this.http.post('http://localhost:8090/api/collections/geometry/records', {
          type: 'default',
          longitude: longitude,
          latitude: latitude,
        }).toPromise();

        if (!geometryRes || !geometryRes.id) {
          throw new Error('Failed to create new geometry entry.');
        }

        const newGeometry: any = geometryRes;

        // Create new properties entry with an initial score adjusted by the vote
        const initialScore = vote === 1 ? 51 : -51;
        const propertiesRes: any = await this.http.post('http://localhost:8090/api/collections/properties/records', {
          name: 'default',
          score: initialScore,
        }).toPromise();

        if (!propertiesRes || !propertiesRes.id) {
          throw new Error('Failed to create new properties entry.');
        }

        const newProperties = propertiesRes;

        // Create new features entry
        await this.http.post('http://localhost:8090/api/collections/features/records', {
          type: 'default',
          geometry: newGeometry.id,
          properties: newProperties.id,
        }).toPromise();

        console.log('Created new geometry, properties, and linked them in features.');
      }
    } catch (error) {
      console.error('Error updating or creating entry:', error);
    }
  }

  // Method to get the current coordinates from the GeoJSON data
  getCurrentCoordinates() {
    if (this.geojson && this.geojson.features.length > 0) {
      const currentFeature = this.geojson.features[this.currentIndex];
      const [longitude, latitude] = currentFeature.geometry.coordinates;
      return { lat: latitude, lng: longitude };
    }
    return null;
  }

  // Method to get the current image URL based on the current coordinates
  getImageUrl(): string {
    const coordinates = this.getCurrentCoordinates();
    if (coordinates) {
      return `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${coordinates.lat},${coordinates.lng}&heading=120&pitch=0&key=${environment.googleMapsApiKey}`;
    }
    return '';
  }

  // Handler for the Upvote button
  upvote() {
    const coordinates = this.getCurrentCoordinates();
    if (coordinates) {
      const { lat, lng } = coordinates;
      console.log('Upvote clicked for coordinates:', lat, lng);
      this.updateOrCreateEntry(lat, lng, 1); // Pass vote = 1 for upvote
      this.nextCoordinate();
    }
  }

  // Handler for the Downvote button
  downvote() {
    const coordinates = this.getCurrentCoordinates();
    if (coordinates) {
      const { lat, lng } = coordinates;
      console.log('Downvote clicked for coordinates:', lat, lng);
      this.updateOrCreateEntry(lat, lng, -1); // Pass vote = -1 for downvote
      this.nextCoordinate();
    }
  }

  // Method to move to the next coordinate in the list
  nextCoordinate() {
    if (this.geojson && this.geojson.features.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.geojson.features.length;
      this.imageError = false; // Reset error state when moving to the next image
    }
  }

  // Method to handle image loading error
  onImageError() {
    this.imageError = true;
  }
}
