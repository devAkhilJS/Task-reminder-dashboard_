import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatListModule, MatIconModule, MatButtonModule, RouterModule]
})
export class Sidebar {
  public user: { displayName?: string; email?: string } | null = null;

 

  
}