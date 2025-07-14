import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../task-interface';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-item.html',
  styleUrl: './task-item.css'
})
export class TaskItem {
  @Input() task!: Task;
  @Output() toggle = new EventEmitter<Task>();
  @Output() delete = new EventEmitter<Task>();

  onToggle() {
    this.toggle.emit(this.task);
  }

  onDelete() {
    const confirmed = confirm(`Are you sure you want to delete "${this.task.title}"?`);
    if (confirmed) {
      this.delete.emit(this.task);
    }
  }
}