// Firebase configuration
// Note: Thay thế với config thực tế từ Firebase Console
// https://console.firebase.google.com → Project Settings → Web app

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
}

// Uncomment sau khi có config thực tế:
// import { initializeApp } from 'firebase/app'
// import { getFirestore } from 'firebase/firestore'
// const app = initializeApp(firebaseConfig)
// export const db = getFirestore(app)
