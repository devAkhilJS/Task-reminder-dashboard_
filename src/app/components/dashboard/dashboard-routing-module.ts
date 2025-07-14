import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Layout } from './layout/layout';
import { TaskBoard } from './task-board/task-board';

const routes: Routes = [
  
  {
    path: '',
    component: Layout,
     children: [
      { path: 'my-day',   component: TaskBoard, data: { filter: 'day' } },
      { path: 'this-week', component: TaskBoard, data: { filter: 'week' } },
      { path: 'this-month', component: TaskBoard, data: { filter: 'month' } },
      { path: 'all', component: TaskBoard, data: { filter: 'all' } },
      { path: '', redirectTo: 'my-day', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
