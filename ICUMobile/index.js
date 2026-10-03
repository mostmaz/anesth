/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register a background/quit-state FCM handler before the app mounts.
// Defensive require so a missing native module never blocks startup.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {
    // Notification-type messages are shown by the system tray automatically.
  });
} catch (e) {}

AppRegistry.registerComponent(appName, () => App);
