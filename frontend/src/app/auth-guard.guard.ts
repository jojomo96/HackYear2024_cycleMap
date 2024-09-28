import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { MainService } from './main.service';
import { LocalStorageService } from './local-storage.service';
import PocketBase from 'pocketbase';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private main: MainService, private router: Router, private localStorage: LocalStorageService) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return true;
    const pb = new PocketBase(environment.pocketBaseUrl);

    if (pb.authStore.isValid) {
      return true;
    }
    else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}