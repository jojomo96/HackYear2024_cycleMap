import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import PocketBase from 'pocketbase';
import { environment } from '../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class MainService {
  public pb;
  constructor(public http: HttpClient, public router: Router) {
    this.pb = new PocketBase(environment.pocketBaseUrl);
  }
  isLoggedIn() {
    return this.pb.authStore.isValid;
  }
  userAvatar() {
    if (this.pb.authStore.model?.['avatar'])
      return `${environment.pocketBaseUrl}api/files/counselor/${this.pb.authStore.model['id']}/${this.pb.authStore.model['avatar']}`;
    else
      return null;
  }
  logout() {
    this.pb.authStore.clear();
    this.router.navigate(['/login']);
  }

  isMobile(): boolean {
    return window.innerWidth <= 576;
  }
  
  isTablet(): boolean {
    return window.innerWidth > 768 && window.innerWidth <= 992;
  }
  
  isDesktop(): boolean {
    return window.innerWidth > 992;
  }
}
