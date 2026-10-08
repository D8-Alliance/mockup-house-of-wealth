import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const hasConfig = Object.values(config).every(Boolean) && Boolean(vapidKey);

function getMessagingClient(): Messaging {
  const app = getApps().length ? getApp() : initializeApp(config);
  return getMessaging(app);
}

export async function enableFirebasePush(): Promise<string | null> {
  if (!hasConfig || typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return null;
  if (!(await isSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config as Record<string, string>)}`);
  return getToken(getMessagingClient(), { vapidKey, serviceWorkerRegistration: registration });
}
