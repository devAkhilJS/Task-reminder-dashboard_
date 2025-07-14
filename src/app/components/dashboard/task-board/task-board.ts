import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Task } from './task-interface';
import { TaskList } from './task-list/task-list';
import { AddTaskBar } from './add-task-bar/add-task-bar';
import { TaskFirebaseService } from '../../../services/task-firebase.service';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, TaskList, AddTaskBar],
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
    
    this.subscriptions.push(routeSubscription);
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
        this.allTasksSubject.next(tasks);
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
            const taskDate = new Date(task.dueDate.getFullYear(), 
                                     task.dueDate.getMonth(), 
                                     task.dueDate.getDate());
            return taskDate.getTime() === today.getTime();
          });
          break;
        case 'week':
          this.title = "This Week's Tasks";
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          filteredTasks = allTasks.filter(task => 
            task.dueDate >= weekStart && task.dueDate <= weekEnd
          );
          break;
        case 'month':
          this.title = "This Month's Tasks";
          filteredTasks = allTasks.filter(task => 
            task.dueDate.getMonth() === now.getMonth() && 
            task.dueDate.getFullYear() === now.getFullYear()
          );
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
        const taskWithId = { ...newTask, id: taskId };
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

    const updatedTask = { ...task, completed: !task.completed };
    
    const taskSubscription = this.taskService.updateTask(task.id, { completed: !task.completed }).subscribe({
      next: () => {
        const allTasks = this.allTasksSubject.getValue();
        const updatedTasks = allTasks.map(t => 
          t.id === task.id ? updatedTask : t
        );
        this.allTasksSubject.next(updatedTasks);
        this.filterTasks(this.currentPeriod);
      },
      error: (error) => {
        console.error('Error updating task:', error);
      }
    });
    
    this.subscriptions.push(taskSubscription);
  }

  onDeleteTask(task: Task) {
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      return;
    }

    const taskSubscription = this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        const allTasks = this.allTasksSubject.getValue();
        const updatedTasks = allTasks.filter(t => t.id !== task.id);
        this.allTasksSubject.next(updatedTasks);
        this.filterTasks(this.currentPeriod);
      },
      error: (error) => {
        console.error('Error deleting task:', error);
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
      const taskSubscription = this.taskService.clearAllTasks().subscribe({
        next: () => {
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