import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, finalize, switchMap, filter, take } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth'; // Import authState
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
this.waitForAuthThenLoadTasks();

const routeSubscription = this.route.params.subscribe(params => {
const period = params['period'] || '';
this.currentPeriod = period;
this.filterTasks(period);
});

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


private waitForAuthThenLoadTasks() {
const authSubscription = authState(this.auth).pipe(
filter(user => user !== null),
take(1)
).subscribe({
next: (user) => {
if (user) {
console.log('Auth ready, loading tasks for user:', user.uid);
this.loadTasks();
}
},
error: (error) => {
console.error('Auth state error:', error);
}
});

this.subscriptions.push(authSubscription);
}

private loadTasks() {
if (!this.auth.currentUser) {
console.error('User not authenticated');
return;
}

this.isLoading = true;

const taskSubscription = this.taskService.getUserTasks().subscribe({
next: (tasks) => {
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
const taskDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
const taskDate = new Date(taskDueDate.getFullYear(),
taskDueDate.getMonth(),
taskDueDate.getDate());
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
const taskDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
const taskDate = new Date(taskDueDate.getFullYear(),
taskDueDate.getMonth(),
taskDueDate.getDate());
return taskDate >= today && taskDate <= weekEnd;
});
break;
case 'month':
this.title = "This Month's Tasks";
filteredTasks = allTasks.filter(task => {
const taskDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
const taskDate = new Date(taskDueDate.getFullYear(),
taskDueDate.getMonth(),
taskDueDate.getDate());
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
authState(this.auth).pipe(
filter(user => user !== null),
take(1),
switchMap(user => this.taskService.addTask(newTask))
).subscribe({
next: (taskId) => {
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
}

onToggleTask(task: Task) {
if (!task.id || task.id.trim() === '') {
console.error('Invalid task ID for toggle');
return;
}

const newCompletedState = !task.completed;

authState(this.auth).pipe(
filter(user => user !== null),
take(1),
switchMap(user => this.taskService.updateTask(task.id, { completed: newCompletedState }))
).subscribe({
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
}
});
}

onDeleteTask(task: Task) {
if (!task.id || task.id.trim() === '') {
console.error('Invalid task ID for delete');
return;
}

console.log('Attempting to delete task:', task.id);


authState(this.auth).pipe(
filter(user => user !== null),
take(1),
switchMap(user => {
console.log('User authenticated, proceeding with delete for user:', user.uid);
return this.taskService.deleteTask(task.id);
})
).subscribe({
next: () => {
console.log('Task deleted successfully from Firebase');
const currentTasks = this.allTasksSubject.getValue();
const updatedTasks = currentTasks.filter(t => t.id !== task.id);
this.allTasksSubject.next(updatedTasks);
this.filterTasks(this.currentPeriod);
},
error: (error) => {
console.error('Error deleting task:', error);

}
});
}

clearAllTasks() {
const confirmed = confirm('Are you sure you want to delete all tasks? This action cannot be undone.');
if (!confirmed) return;

authState(this.auth).pipe(
filter(user => user !== null),
take(1),
switchMap(user => this.taskService.clearAllTasks())
).subscribe({
next: () => {
console.log('All tasks cleared successfully');
this.allTasksSubject.next([]);
this.filterTasks(this.currentPeriod);
},
error: (error) => {
console.error('Error clearing tasks:', error);
}
});
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
