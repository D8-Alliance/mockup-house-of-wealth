/* Firebase background notification worker. Runtime config is supplied by the app registration URL. */
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const config = Object.fromEntries(params.entries());

firebase.initializeApp(config);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'House of Wealth';
  const options = {
    body: payload.notification?.body || '',
    icon: '/favicon.svg',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});
