import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { Toolbar } from './toolbar/toolbar';
import { Sidebar } from '../sidebar/sidebar';
// import { Auth , User } from 'firebase/auth';
// import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [MatSidenavModule, Toolbar, Sidebar, RouterOutlet ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class Layout {
  

}