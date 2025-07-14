import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from '@angular/fire/firestore';
import { Task } from '../components/dashboard/task-board/task-interface';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskFirebaseService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  getUserTasks(): Observable<Task[]> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return from(Promise.resolve([]));
    }

    const tasksCollection = collection(this.firestore, 'users', user.uid, 'tasks');
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dueDate: data['dueDate'].toDate(),
            createdAt: data['createdAt'].toDate()
          } as Task;
        })
      )
    );
  }

  addTask(task: Omit<Task, 'id'>): Observable<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const tasksCollection = collection(this.firestore, 'users', user.uid, 'tasks');
    
    const taskData = {
      ...task,
      dueDate: Timestamp.fromDate(task.dueDate),
      createdAt: Timestamp.fromDate(task.createdAt),
      userId: user.uid
    };

    return from(addDoc(tasksCollection, taskData)).pipe(
      map(docRef => docRef.id)
    );
  }

  updateTask(taskId: string, updates: Partial<Task>): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const taskDoc = doc(this.firestore, 'users', user.uid, 'tasks', taskId);
    
    const updateData: any = { ...updates };
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    }
    if (updates.createdAt) {
      updateData.createdAt = Timestamp.fromDate(updates.createdAt);
    }

    return from(updateDoc(taskDoc, updateData));
  }

  deleteTask(taskId: string): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const taskDoc = doc(this.firestore, 'users', user.uid, 'tasks', taskId);
    return from(deleteDoc(taskDoc));
  }

  clearAllTasks(): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.getUserTasks().pipe(
      map(tasks => {
        const deletePromises = tasks.map(task => 
          deleteDoc(doc(this.firestore, 'users', user.uid, 'tasks', task.id))
        );
        return Promise.all(deletePromises);
      }),
      map(() => void 0)
    );
  }

  getTaskCount(): Observable<number> {
    return this.getUserTasks().pipe(
      map(tasks => tasks.length)
    );
  }

  getCompletedTaskCount(): Observable<number> {
    return this.getUserTasks().pipe(
      map(tasks => tasks.filter(task => task.completed).length)
    );
  }

  getPendingTaskCount(): Observable<number> {
    return this.getUserTasks().pipe(
      map(tasks => tasks.filter(task => !task.completed).length)
    );
  }
}