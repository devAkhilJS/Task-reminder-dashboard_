import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, finalize } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Task } from './task-interface';
import { TaskList } from './task-list/task-list';
import { AddTaskBar } from './add-task-bar/add-task-bar';
import { TaskFirebaseService } from '../../../services/task-firebase.service';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, RouterModule, TaskList, AddTaskBar],
  templateUrl: './task-board.html',
  styleUrl: './task-board.css'
})
export class TaskBoard implements OnInit, OnDestroy {
  title: string = 'My Tasks';
  
  private auth = inject(Auth);
  private taskService = inject(TaskFirebaseService);
  
  private allTasksSubject = new BehaviorSubject<Task[]>([]);
  private filteredTasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$: Observable<Task[]> = this.filteredTasksSubject.asObservable();
  
  currentPeriod: string = '';
  isLoading = false;
  private subscriptions: Subscription[] = [];
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.loadTasks();
    
    const routeSubscription = this.route.params.subscribe(params => {
      const period = params['period'] || '';
      this.currentPeriod = period;
      this.filterTasks(period);
    });
    
    // Also subscribe to route data to get filter from data property
    const routeDataSubscription = this.route.data.subscribe(data => {
      if (data['filter']) {
        this.currentPeriod = data['filter'];
        this.filterTasks(data['filter']);
      }
    });
    
    this.subscriptions.push(routeSubscription);
    this.subscriptions.push(routeDataSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadTasks() {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    this.isLoading = true;
    
    const taskSubscription = this.taskService.getUserTasks().subscribe({
      next: (tasks) => {
        // Ensure all task dates are properly converted to Date objects
        const processedTasks = tasks.map(task => ({
          ...task,
          dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
          createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt)
        }));
        
        this.allTasksSubject.next(processedTasks);
        this.filterTasks(this.currentPeriod);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(taskSubscription);
  }

  private filterTasks(period: string) {
    const allTasks = this.allTasksSubject.getValue();
    let filteredTasks = [...allTasks];
    
    if (period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (period) {
        case 'today':
          this.title = "Today's Tasks";
          filteredTasks = allTasks.filter(task => {
            // Convert task.dueDate to Date object if it's not already
            const taskDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
            const taskDate = new Date(taskDueDate.getFullYear(), 
                                     taskDueDate.getMonth(), 
                                     taskDueDate.getDate());
            // Only show tasks that are due today (not future or past)
            return taskDate.getTime() === today.getTime();
          });
          break;
        case 'week':
          this.title = "This Week's Tasks";
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          filteredTasks = allTasks.filter(task => {
            // Convert task.dueDate to Date object if it's not already
            const taskDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
            // Only show tasks that are due this week (not future weeks)
            const taskDate = new Date(taskDueDate.getFullYear(), 
                                     taskDueDate.getMonth(), 
                                     taskDueDate.getDate());
            // Only include tasks from today up to the end of the week
            return taskDate >= today && taskDate <= weekEnd;
          });
          break;
        case 'month':
          this.title = "This Month's Tasks";
          filteredTasks = allTasks.filter(task => {
            // Convert task.dueDate to Date object if it's not already
            const taskDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
            const taskDate = new Date(taskDueDate.getFullYear(), 
                                     taskDueDate.getMonth(), 
                                     taskDueDate.getDate());
            // Only include tasks from today until the end of the month
            return taskDate >= today && 
                   taskDueDate.getMonth() === now.getMonth() && 
                   taskDueDate.getFullYear() === now.getFullYear();
          });
          break;
        default:
          this.title = 'All Tasks';
      }
    } else {
      this.title = 'My Tasks';
    }
    
    this.filteredTasksSubject.next(filteredTasks);
  }

  onTaskAdded(newTask: Task) {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    const taskSubscription = this.taskService.addTask(newTask).subscribe({
      next: (taskId) => {
        // Add task to local state with proper Date objects
        const taskWithId = { 
          ...newTask, 
          id: taskId,
          dueDate: newTask.dueDate instanceof Date ? newTask.dueDate : new Date(newTask.dueDate),
          createdAt: newTask.createdAt instanceof Date ? newTask.createdAt : new Date(newTask.createdAt)
        };
        const currentTasks = this.allTasksSubject.getValue();
        const updatedTasks = [...currentTasks, taskWithId];
        this.allTasksSubject.next(updatedTasks);
        this.filterTasks(this.currentPeriod);
      },
      error: (error) => {
        console.error('Error adding task:', error);
      }
    });
    
    this.subscriptions.push(taskSubscription);
  }

  onToggleTask(task: Task) {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    if (!task.id || task.id.trim() === '') {
      console.error('Invalid task ID for toggle');
      return;
    }

    const newCompletedState = !task.completed;

    const taskSubscription = this.taskService.updateTask(task.id, { completed: newCompletedState }).subscribe({
      next: () => {
        console.log('Task updated successfully in Firebase');
        const allTasks = this.allTasksSubject.getValue();
        const updatedTasks = allTasks.map(t =>
          t.id === task.id ? { ...t, completed: newCompletedState } : t
        );
        this.allTasksSubject.next(updatedTasks);
        this.filterTasks(this.currentPeriod);
      },
      error: (error) => {
        console.error('Error updating task:', error);
        // Optionally, show an error message to the user
      },
      complete: () => {
        const index = this.subscriptions.indexOf(taskSubscription);
        if (index > -1) {
          this.subscriptions.splice(index, 1);
        }
      }
    });

    this.subscriptions.push(taskSubscription);
  }

  onDeleteTask(task: Task) {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    if (!task.id || task.id.trim() === '') {
      console.error('Invalid task ID for delete');
      return;
    }

    const taskSubscription = this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        console.log('Task deleted successfully from Firebase');
        const currentTasks = this.allTasksSubject.getValue();
        const updatedTasks = currentTasks.filter(t => t.id !== task.id);
        this.allTasksSubject.next(updatedTasks);
        this.filterTasks(this.currentPeriod);
      },
      error: (error) => {
        console.error('Error deleting task:', error);
        // Optionally, show an error message to the user
      },
      complete: () => {
        const index = this.subscriptions.indexOf(taskSubscription);
        if (index > -1) {
          this.subscriptions.splice(index, 1);
        }
      }
    });

    this.subscriptions.push(taskSubscription);
  }

  clearAllTasks() {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    const confirmed = confirm('Are you sure you want to delete all tasks? This action cannot be undone.');
    if (confirmed) {
      const taskSubscription = this.taskService.clearAllTasks()
        .subscribe({
          next: () => {
            console.log('All tasks cleared successfully');
            this.allTasksSubject.next([]);
            this.filterTasks(this.currentPeriod);
          },
          error: (error) => {
            console.error('Error clearing tasks:', error);
          }
        });
      
      this.subscriptions.push(taskSubscription);
    }
  }

  getCompletedCount(): number {
    return this.filteredTasksSubject.getValue().filter(t => t.completed).length;
  }

  getPendingCount(): number {
    return this.filteredTasksSubject.getValue().filter(t => !t.completed).length;
  }

  getTotalCount(): number {
    return this.filteredTasksSubject.getValue().length;
  }

  getAllTasksCount(): number {
    return this.allTasksSubject.getValue().length;
  }

  getCurrentTasks(): Task[] {
    return this.filteredTasksSubject.getValue();
  }
}