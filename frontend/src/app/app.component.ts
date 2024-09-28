import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { MainService } from './main.service';
import { BadgeModule } from 'primeng/badge';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OverlayPanelModule } from 'primeng/overlaypanel';

@Component({
  selector: 'app-root',
  standalone: true,
  providers: [MessageService],
  imports: [RouterOutlet, ButtonModule, MenubarModule, InputTextModule, DividerModule, AvatarModule, AvatarGroupModule, CommonModule, StyleClassModule, MenubarModule, BadgeModule, ToastModule, OverlayPanelModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'frontend';
  public menuItems: any[];
  showMenu: boolean = true;
  public user: any;

  ngOnInit(): void {
    
  }


  constructor(public router: Router, public main: MainService, public route: ActivatedRoute) {
    this.user = this.main.pb.authStore.model;
    this.menuItems = [
      {
          label: 'Dashboard',
          icon: 'pi pi-home',
          routerLink: '/'
      },
    ];
  }
}