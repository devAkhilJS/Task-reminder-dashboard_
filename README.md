# Task Reminder Dashboard

A simple and intuitive web-based task reminder dashboard built with Angular and Firebase. This application allows users to manage their daily, weekly, and monthly tasks, mark them as complete, and keep track of their productivity.

## Features

*   **User Authentication:** Secure sign-up and sign-in using Firebase Authentication.
*   **Task Management:**
    *   Add new tasks with titles, descriptions, and due dates.
    *   View all tasks.
    *   Mark tasks as completed.
    *   Delete individual tasks.
*   **Task Filtering:** Filter tasks by "Today", "This Week", "This Month", and "All Tasks".
*   **Responsive Design:** A clean and user-friendly interface that adapts to various screen sizes.

## Technologies Used

*   **Frontend:** Angular (TypeScript)
*   **Backend/Database:** Firebase (Authentication, Firestore)
*   **Styling:** (Assuming Material Design/Angular Material based on `mat-` prefixes)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js) or Yarn
*   Angular CLI (`npm install -g @angular/cli`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd task-reminder-dashboard
    ```

2.  **Install npm packages:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Create a new Firebase project.
    *   Enable **Firebase Authentication** (e.g., Email/Password provider).
    *   Enable **Cloud Firestore** and choose a location.
    *   **Configure Firestore Security Rules:** Ensure your rules allow authenticated users to read, create, update, and delete their own tasks. Based on our previous discussion, your rules should look something like this:
        ```firestore
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId}/tasks/{taskId} {
              allow read: if request.auth != null && request.auth.uid == userId;
              allow create, update: if request.auth != null &&
                                      request.auth.uid == userId &&
                                      request.resource.data.userId == userId;
              allow delete: if request.auth != null && request.auth.uid == userId;
            }
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            match /{document=**} {
              allow read, write: if false;
            }
          }
        }
        o run the development server:

```
bash
ng serve
```
