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
import { HttpClient } from '@angular/common/http';
import { Task } from '../components/dashboard/task-board/task-interface';
import { LocationInfo, LocationService } from './location.service';
import { Observable, from, map, switchMap, catchError, of, firstValueFrom, filter, take } from 'rxjs';

@Injectable({
providedIn: 'root'
})
export class TaskFirebaseService {
private auth = inject(Auth);
private firestore = inject(Firestore);
private http = inject(HttpClient);
private locationService = inject(LocationService);

private webhookUrl = 'https://pleasant-macaw-deadly.ngrok-free.app/webhook-test/8f6008b3-6540-4045-986d-2014bdbbf594';

private getUser$() {
  return authState(this.auth).pipe(
    filter(user => !!user),
    take(1)
  );
}

getUserTasks(): Observable<Task[]> {
  return this.getUser$().pipe(
    switchMap(user => {
      const tasksCollection = collection(this.firestore, 'users', user!.uid, 'tasks');
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
    })
  );
}

addTask(task: Omit<Task, 'id'>): Observable<string> {
  return this.getUser$().pipe(
    switchMap(user => {
      const tasksCollection = collection(this.firestore, 'users', user!.uid, 'tasks');
      const taskData = {
        ...task,
        dueDate: Timestamp.fromDate(task.dueDate),
        createdAt: Timestamp.fromDate(task.createdAt),
        userId: user!.uid
      };
      return from(addDoc(tasksCollection, taskData)).pipe(
        switchMap(docRef => {
          const webhookData = {
            userEmail: user!.email,
            userUid: user!.uid,
            taskId: docRef.id,
            taskTitle: task.title,
            taskDescription: task.description,
            taskDueDate: task.dueDate.toISOString(),
            taskCreatedAt: task.createdAt.toISOString(),
            taskCompleted: task.completed,
            taskcity: task.city,
            timestamp: new Date().toISOString()
          };
          return this.sendWebhookDataWithLocation(webhookData).pipe(
            map(() => docRef.id),
            catchError(error => {
              console.error('Webhook failed, but task was created:', error);
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
      const taskDoc = doc(this.firestore, 'users', user!.uid, 'tasks', taskId);
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
        throw new Error('Invalid task ID provided');
      }
      const taskDoc = doc(this.firestore, 'users', user!.uid, 'tasks', taskId);
      console.log('Attempting to delete task:', {
        userId: user!.uid,
        taskId: taskId,
        fullPath: `users/${user!.uid}/tasks/${taskId}`
      });
      return from(getDoc(taskDoc)).pipe(
        switchMap(docSnapshot => {
          if (!docSnapshot.exists()) {
            console.warn(`Task ${taskId} not found for user ${user!.uid}`);
            return of(void 0);
          }
          console.log('Document exists, proceeding with deletion');
          return from(deleteDoc(taskDoc));
        }),
        map(() => {
          console.log(`Task ${taskId} deleted successfully from Firebase`);
          return void 0;
        }),
        catchError(error => {
          console.error('Error deleting task:', {
            error,
            userId: user!.uid,
            taskId: taskId,
            errorCode: error.code,
            errorMessage: error.message
          });
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
            deleteDoc(doc(this.firestore, 'users', user!.uid, 'tasks', task.id))
          );
          return from(Promise.all(deletePromises));
        }),
        map(() => void 0)
      )
    )
  );
}

private sendWebhookDataWithLocation(taskData: any): Observable<void> {
  return this.getUser$().pipe(
    switchMap(user => {
      return this.getCurrentLocation().pipe(
        switchMap(currentLocation => {
          const webhookData = {
            ...taskData,
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
          console.log('Sending task webhook data with location:', webhookData);
          return this.http.post(this.webhookUrl, webhookData).pipe(
            map(() => {
              console.log('Task webhook success');
              return void 0;
            }),
            catchError(error => {
              console.error('Task webhook failed:', error);
              return of(void 0);
            })
          );
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
            console.log('Got location from LocationService:', location);
            observer.next(location);
            observer.complete();
          },
          error: (error) => {
            console.error('Error getting location from LocationService:', error);
            this.getLocationFromFirebase(user!.uid).subscribe({
              next: (firebaseLocation) => {
                observer.next(firebaseLocation);
                observer.complete();
              },
              error: (firebaseError) => {
                console.error('Error getting location from Firebase:', firebaseError);
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
      console.error('Error getting user location from Firebase:', error);
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