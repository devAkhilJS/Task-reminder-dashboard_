import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
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
  Timestamp,
  getDoc
} from '@angular/fire/firestore';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Task } from '../components/dashboard/task-board/task-interface';
import { LocationInfo, LocationService } from './location.service';
import { Observable, from, map, switchMap, catchError, of, firstValueFrom, filter, take } from 'rxjs';

import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskFirebaseService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private locationService = inject(LocationService);

  private addWebhookUrl = 'https://pleasant-macaw-deadly.ngrok-free.app/webhook-test/8f6008b3-6540-4045-986d-2014bdbbf594';
  private deleteWebhookUrl = 'https://pleasant-macaw-deadly.ngrok-free.app/webhook-test/c9bd66fa-ae96-4faa-b387-9f5f1ddcd0a7';


  private getUser$() {
    return authState(this.auth).pipe(
      filter((user): user is NonNullable<typeof user> => !!user),
      take(1)
    );
  }

  getUserTasks(): Observable<Task[]> {
    return this.getUser$().pipe(
      switchMap(user => {
        const tasksCollection = collection(this.firestore, 'users', user.uid, 'tasks');
        const q = query(tasksCollection, orderBy('createdAt', 'desc'));
        return from(getDocs(q)).pipe(
          map(snapshot =>
            snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                dueDate: (data['dueDate'] as Timestamp).toDate(),
                createdAt: (data['createdAt'] as Timestamp).toDate()
              } as Task;
            })
          )
        );
      })
    );
  }

  addTask(task: Omit<Task, 'id' | 'userId'>): Observable<string> {
    return this.getUser$().pipe(
      switchMap(user => {
        const tasksCollection = collection(this.firestore, 'users', user.uid, 'tasks');
        const taskData = {
          ...task,
          dueDate: Timestamp.fromDate(task.dueDate),
          createdAt: Timestamp.fromDate(task.createdAt),
          userId: user.uid
        };
        return from(addDoc(tasksCollection, taskData)).pipe(
          switchMap(docRef => {
            const webhookData = {
              type: 'TASK_CREATED',
              userEmail: user.email,
              userUid: user.uid,
              taskId: docRef.id,
              taskTitle: task.title,
              taskDescription: task.description,
              taskDueDate: task.dueDate.toISOString(),
              taskCreatedAt: task.createdAt.toISOString(),
              taskCompleted: task.completed,
              taskCity: task.city,
              timestamp: new Date().toISOString()
            };
            return this.sendWebhook(webhookData, this.addWebhookUrl, 'POST').pipe(
              map(() => {
                console.log(`Webhook for new task '${docRef.id}' sent successfully.`);
                return docRef.id;
              }),
              catchError(error => {
                console.error(`Task '${docRef.id}' ban gaya, lekin webhook fail ho gaya.`, error);
                return of(docRef.id);
              })
            );
          })
        );
      })
    );
  }

  updateTask(taskId: string, updates: Partial<Task>): Observable<void> {
    return this.getUser$().pipe(
      switchMap(user => {
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
      })
    );
  }

  deleteTask(taskId: string): Observable<void> {
    return this.getUser$().pipe(
      switchMap(user => {
        if (!taskId || taskId.trim() === '') {
          return throwError(() => new Error('Invalid task ID provided'));
        }
        const taskDoc = doc(this.firestore, 'users', user.uid, 'tasks', taskId);
        
        return from(getDoc(taskDoc)).pipe(
          switchMap(docSnapshot => {
            if (!docSnapshot.exists()) {
              const warning = `Task with ID '${taskId}' not found. It may have already been deleted.`;
              console.warn(warning);
              return throwError(() => new Error(warning));
            }
            
            const deletedTaskData = docSnapshot.data();
            
            return from(deleteDoc(taskDoc)).pipe(
              switchMap(() => {
                const webhookData = {
                  type: 'TASK_DELETED',
                  userEmail: user.email,
                  userUid: user.uid,
                  taskId: taskId,
                  deletedTask: deletedTaskData,
                  timestamp: new Date().toISOString()
                };
                return this.sendWebhook(webhookData, this.deleteWebhookUrl, 'DELETE').pipe(
                  map(() => {
                    console.log(`Webhook for deleted task '${taskId}' sent successfully.`);
                  }),
                  catchError(error => {
                    console.error(`Task '${taskId}' Task deleted successfully, but webhook execution failed.`, error);
                    return of(void 0);
                  })
                );
              })
            );
          }),
          catchError(error => {
            console.error(`Error during the delete process, task ID ${taskId}:`, error);
            throw error;
          })
        );
      })
    );
  }

  clearAllTasks(): Observable<void> {
    return this.getUser$().pipe(
      switchMap(user =>
        this.getUserTasks().pipe(
          switchMap(tasks => {
            const deletePromises = tasks.map(task =>
              deleteDoc(doc(this.firestore, 'users', user.uid, 'tasks', task.id))
            );
            return from(Promise.all(deletePromises));
          }),
          map(() => void 0)
        )
      )
    );
  }

  private sendWebhook(data: any, url: string, method: 'POST' | 'DELETE'): Observable<void> {
    return this.getUser$().pipe(
      switchMap(user => {
        return this.getCurrentLocation().pipe(
          switchMap(currentLocation => {
            const webhookData = {
              ...data,
              location: currentLocation ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                placeName: currentLocation.placeName,
                city: currentLocation.city,
                state: currentLocation.state,
                country: currentLocation.country,
                locationTimestamp: new Date().toISOString()
              } : {
                message: 'Location not available',
                locationTimestamp: new Date().toISOString()
              }
            };
            console.log(`Webhook data (${method}) sent:`, url, webhookData);

            if (method === 'POST') {
              return this.http.post<void>(url, webhookData);
            } else { // method === 'DELETE'
              const options = {
                headers: new HttpHeaders({
                  'Content-Type': 'application/json',
                }),
                body: webhookData,
              };
              return this.http.delete<void>(url, options);
            }
          })
        );
      })
    );
  }

  private getCurrentLocation(): Observable<LocationInfo | null> {
    return new Observable(observer => {
      this.getUser$().pipe(take(1)).subscribe({
        next: (user) => {
          this.locationService.getLocation().subscribe({
            next: (location) => {
              console.log('Got location from LocationService :', location);
              observer.next(location);
              observer.complete();
            },
            error: (error) => {
              console.error('error during finding loction fromLocationService :', error);
              this.getLocationFromFirebase(user.uid).subscribe({
                next: (firebaseLocation) => {
                  observer.next(firebaseLocation);
                  observer.complete();
                },
                error: (firebaseError) => {
                  console.error('error during get loction from Firebase :', firebaseError);
                  observer.next(null);
                  observer.complete();
                }
              });
            }
          });
        },
        error: () => {
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  private getLocationFromFirebase(uid: string): Observable<LocationInfo | null> {
    const userDoc = doc(this.firestore, 'users', uid);
    return from(getDoc(userDoc)).pipe(
      map(userSnapshot => {
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          return userData['location'] || null;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error while retrieving user location from Firebase:', error);
        return of(null);
      })
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
