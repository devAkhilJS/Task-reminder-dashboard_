// src/app/components/dashboard/task-board/task-board.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, filter, finalize, take } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { Task } from './task-interface';
import { TaskList } from './task-list/task-list';
import { AddTaskBar } from './add-task-bar/add-task-bar';
import { TaskFirebaseService } from '../../../services/task-firebase.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, RouterModule, TaskList, AddTaskBar, MatSnackBarModule],
  templateUrl: './task-board.html',
  styleUrl: './task-board.css'
})
export class TaskBoard implements OnInit, OnDestroy {
  public title: string = 'My Tasks';

  private auth = inject(Auth);
  private taskService = inject(TaskFirebaseService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  private allTasksSubject = new BehaviorSubject<Task[]>([]);
  private filteredTasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$: Observable<Task[]> = this.filteredTasksSubject.asObservable();

  
  private deletingTasks = new Set<string>();
  private togglingTasks = new Set<string>();

  public currentPeriod: string = '';
  public isLoading = false;
  private subscriptions: Subscription[] = [];

  constructor() {}

  public ngOnInit(): void {
    this.waitForAuthThenLoadTasks();

    const routeSubscription = this.route.params.subscribe(params => {
      const period = params['period'] || 'all';
      this.currentPeriod = period;
      this.filterTasks(period);
    });

    const routeDataSubscription = this.route.data.subscribe(data => {
      if (data['filter']) {
        this.currentPeriod = data['filter'];
        this.filterTasks(data['filter']);
      }
    });

    this.subscriptions.push(routeSubscription, routeDataSubscription);
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private waitForAuthThenLoadTasks(): void {
    const authSubscription = authState(this.auth).pipe(
      filter((user): user is NonNullable<typeof user> => user !== null),
      take(1)
    ).subscribe({
      next: (user) => {
        console.log('Auth ready, loading tasks for user:', user.uid);
        this.loadTasks();
      },
      error: (error) => {
        console.error('Auth state error:', error);
      }
    });
    this.subscriptions.push(authSubscription);
  }

  private loadTasks(): void {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }
    this.isLoading = true;
    const taskSubscription = this.taskService.getUserTasks().pipe(
        finalize(() => this.isLoading = false)
    ).subscribe({
      next: (tasks) => {
        const processedTasks = tasks.map(task => ({
          ...task,
          dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
          createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt)
        }));
        this.allTasksSubject.next(processedTasks);
        this.filterTasks(this.currentPeriod);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.snackBar.open('Failed to load tasks.', 'Close', { duration: 3000 });
      }
    });
    this.subscriptions.push(taskSubscription);
  }

  private filterTasks(period: string): void {
    const allTasks = this.allTasksSubject.getValue();
    let filteredTasks = [...allTasks];

    if (period && period !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (period) {
        case 'today':
          this.title = "Today's Tasks";
          filteredTasks = allTasks.filter(task => {
            const taskDueDate = new Date(task.dueDate);
            return taskDueDate.getFullYear() === today.getFullYear() &&
                   taskDueDate.getMonth() === today.getMonth() &&
                   taskDueDate.getDate() === today.getDate();
          });
          break;
        case 'week':
          this.title = "This Week's Tasks";
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          filteredTasks = allTasks.filter(task => {
            const taskDueDate = new Date(task.dueDate);
            return taskDueDate >= weekStart && taskDueDate <= weekEnd;
          });
          break;
        case 'month':
          this.title = "This Month's Tasks";
          filteredTasks = allTasks.filter(task => {
            const taskDueDate = new Date(task.dueDate);
            return taskDueDate.getFullYear() === now.getFullYear() &&
                   taskDueDate.getMonth() === now.getMonth();
          });
          break;
        default:
          this.title = 'All Tasks';
      }
    } else {
      this.title = 'All Tasks';
    }
    this.filteredTasksSubject.next(filteredTasks);
  }

  public onTaskAdded(taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>): void {
    const now = new Date();
    
    
    const dataToSave = {
        title: taskData.title,
        dueDate: taskData.dueDate,
        city: taskData.city,
        createdAt: now,
        completed: false
    };

    this.taskService.addTask(dataToSave).subscribe({
      next: (realId: string) => {

        const newTask: Task = {
          ...dataToSave,
          id: realId, 
          userId: this.auth.currentUser?.uid || '',
        };

        const currentTasks = this.allTasksSubject.getValue();
        this.allTasksSubject.next([newTask, ...currentTasks]);
        this.filterTasks(this.currentPeriod);
        console.log(`Task added with Document ID: '${realId}'`);
      },
      error: (err: any) => {
        console.error('Firebase mein task add nahi hua:', err);
        this.snackBar.open('Error: Task could not be saved .', 'Close', { duration: 3000 });
      }
    });
  }

  public onDeleteTask(taskToDelete: Task): void {
    const taskId = taskToDelete.id;
    if (!taskId || this.deletingTasks.has(taskId)) {
      return;
    }

    const originalTasks = this.allTasksSubject.getValue();
    this.deletingTasks.add(taskId);

    this.allTasksSubject.next(originalTasks.filter(task => task.id !== taskId));
    this.filterTasks(this.currentPeriod);

    this.taskService.deleteTask(taskId).pipe(
      finalize(() => {
        this.deletingTasks.delete(taskId);
      })
    ).subscribe({
      next: () => {
        this.snackBar.open('Task is deleted!', 'Close', { duration: 2000 });
      },
      error: (err: any) => {
        const message = err.message || '';
        if (message.toLowerCase().includes('not found')) {
            console.warn(`Trying to delete a task that has already been deleted (ID: ${taskId}).`);
        } else {
            console.error('The task was not deleted in Firebase:', err);
            this.snackBar.open('Error: Task could not be deleted. Reverting.', 'Close', { duration: 5000 });
            this.allTasksSubject.next(originalTasks);
            this.filterTasks(this.currentPeriod);
        }
      }
    });
  }

  public onToggleTask(task: Task): void {
    const taskId = task.id;
    if (!taskId || this.togglingTasks.has(taskId) || this.deletingTasks.has(taskId)) {
      return;
    }

    const originalTasks = this.allTasksSubject.getValue();
    const newCompletedState = !task.completed;
    this.togglingTasks.add(taskId);

    
    const updatedTasks = originalTasks.map(t =>
      t.id === taskId ? { ...t, completed: newCompletedState } : t
    );
    this.allTasksSubject.next(updatedTasks);
    this.filterTasks(this.currentPeriod);

    this.taskService.updateTask(taskId, { completed: newCompletedState }).pipe(
        finalize(() => {
            this.togglingTasks.delete(taskId);
        })
    ).subscribe({
      error: (error: any) => {
        console.error('Error while updating the task:', error);
        const message = error.message || '';
        if (message.toLowerCase().includes('no document to update')) {
            console.warn(`The task got deleted during the toggle (ID: ${taskId}). Removed from the list.`);
            this.allTasksSubject.next(originalTasks.filter(t => t.id !== taskId));
        } else {
            this.snackBar.open('Error:Task could not be updated. Reverting.', 'Close', { duration: 3000 });
            this.allTasksSubject.next(originalTasks);
        }
        this.filterTasks(this.currentPeriod);
      }
    });
  }

  public clearAllTasks(): void {
    if (confirm('Do you really want to delete all tasks?')) {
      this.taskService.clearAllTasks().subscribe({
        next: () => {
          this.allTasksSubject.next([]);
          this.filterTasks(this.currentPeriod);
          this.snackBar.open('All tasks have been cleared!', 'Close', { duration: 2000 });
        },
        error: (error: any) => {
          console.error('Error while clearing tasks:', error);
          this.snackBar.open('Error: Unable to clear tasks.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  public getCompletedCount(): number {
    return this.filteredTasksSubject.getValue().filter(t => t.completed).length;
  }

  public getPendingCount(): number {
    return this.filteredTasksSubject.getValue().filter(t => !t.completed).length;
  }

  public getTotalCount(): number {
    return this.filteredTasksSubject.getValue().length;
  }

  public getAllTasksCount(): number {
    return this.allTasksSubject.getValue().length;
  }
}
