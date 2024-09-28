import { Routes } from '@angular/router';
import { AuthGuard } from './auth-guard.guard';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', component: DashboardComponent, canActivate: [AuthGuard]},
];