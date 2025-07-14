import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Layout } from './layout/layout';
import { Toolbar } from './layout/toolbar/toolbar';

import { TaskBoard } from './task-board/task-board';
import { TaskList } from './task-board/task-list/task-list';
import { TaskItem } from './task-board/task-list/task-item/task-item';
import { AddTaskBar } from './task-board/add-task-bar/add-task-bar';

import { DashboardRoutingModule } from './dashboard-routing-module';


@NgModule({
  declarations: [
    
  ],
  imports: [
    Layout,Toolbar, TaskBoard,
    MatToolbarModule,TaskList, TaskItem, AddTaskBar,
    CommonModule,
    DashboardRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatSnackBarModule

  ]
})
export class DashboardModule { }
