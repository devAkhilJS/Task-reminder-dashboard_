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
import { HttpClient } from '@angular/common/http'; 
import { Task } from '../components/dashboard/task-board/task-interface';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskFirebaseService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private http = inject(HttpClient); 

  
  private webhookUrl = 'https://pleasant-macaw-deadly.ngrok-free.app/webhook-test/8f6008b3-6540-4045-986d-2014bdbbf594';

  
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
      map(docRef => {
        
        this.sendWebhookData({
          userEmail: user.email,
          userUid: user.uid,
          taskId: docRef.id,
          taskTitle: task.title,
          taskDescription: task.description,
          taskDueDate: task.dueDate.toISOString(),
          taskCreatedAt: task.createdAt.toISOString(),
          taskCompleted: task.completed,
          taskcity: task.city,
          timestamp: new Date().toISOString()
        });
        
        return docRef.id;
      })
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

    return from(updateDoc(taskDoc, updateData)).pipe(
      map(() => {
        console.log(`Task ${taskId} updated in Firebase`);
        return void 0;
      })
    );
  }

  
  deleteTask(taskId: string): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const taskDoc = doc(this.firestore, 'users', user.uid, 'tasks', taskId);
    return from(deleteDoc(taskDoc)).pipe(
      map(() => {
        console.log(`Task ${taskId} deleted from Firebase`);
        return void 0;
      })
    );
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

  
  private sendWebhookData(data: any): void {
    console.log('Sending task webhook data:', data);
    
    this.http.post(this.webhookUrl, data).subscribe({
      next: (response) => {
        console.log(' Task webhook success:', response);
      },
      error: (error) => {
        console.error(' Task webhook failed:', error);
       
      }
    });
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