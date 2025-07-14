import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../task-interface';

@Component({
  selector: 'app-add-task-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-task-bar.html',
  styleUrl: './add-task-bar.css'
})
export class AddTaskBar {
  @Output() taskAdded = new EventEmitter<Task>();

  newTaskTitle: string = '';
  newTaskDate: string = new Date().toISOString().split('T')[0];
  newTaskCity: string = '';

  get todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  addTask() {
    if (this.newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: this.newTaskTitle.trim(),
        completed: false,
        dueDate: new Date(this.newTaskDate),
        createdAt: new Date(),
         city: this.newTaskCity.trim()
      };

      this.taskAdded.emit(newTask);
      this.resetForm();
    }
  }

  private resetForm() {
    this.newTaskTitle = '';
    this.newTaskDate = new Date().toISOString().split('T')[0];
     this.newTaskCity = '';
  }
}