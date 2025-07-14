import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../task-interface'; 
import { TaskItem } from './task-item/task-item';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TaskItem],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css'
})
export class TaskList {
  @Input() tasks: Task[] = [];
  @Input() title: string = 'My Tasks';
  @Output() toggleTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();

  onToggleTask(task: Task) {
    this.toggleTask.emit(task);
  }

  onDeleteTask(task: Task) {
    this.deleteTask.emit(task);
  }

  trackByFn(index: number, task: Task): string {
    return task.id;
  }
}