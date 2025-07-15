import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideFirebaseApp(() => initializeApp({
      projectId: "task-reminder-dashboard",
      appId: "1:784866186604:web:746c734f8364662f858f49",
      storageBucket: "task-reminder-dashboard.firebasestorage.app",
      apiKey: "AIzaSyBOoNfT0nJ65veLyG3DwngZrZo9WlEct70",
      authDomain: "task-reminder-dashboard.firebaseapp.com",
      messagingSenderId: "784866186604",
      measurementId: "G-J6DGJ1NKJP"
    })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ],
  
  
};