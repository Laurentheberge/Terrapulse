import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyD6-kVmCeEB1ZT-kDY2oegjqcwN5GMbpKg",
  authDomain: "hackartonic.firebaseapp.com",
  projectId: "hackartonic",
  storageBucket: "hackartonic.firebasestorage.app",
  messagingSenderId: "303833436070",
  appId: "1:303833436070:web:8ef13c202144c5b39f0967",
  measurementId: "G-YXJ1JLJ2GZ",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export default app
