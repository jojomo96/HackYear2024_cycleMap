import { Component } from '@angular/core';
import { MapComponent } from '../map/map.component';
import { SwipeVoteComponent } from '../swipe-vote/swipe-vote.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MapComponent, SwipeVoteComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

}
