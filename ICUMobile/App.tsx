/**
 * ICU Manager Mobile — bedside-first redesign.
 */

import React, { useEffect } from 'react';
import { StatusBar, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTokens } from './src/theme/ThemeContext';
import { useICU } from './src/data/mockICU';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { PatientDetailScreen } from './src/screens/PatientDetailScreen';
import { TweaksScreen } from './src/screens/TweaksScreen';
import { Toasts } from './src/components/Toasts';
import { initFcm } from './src/notifications/fcm';

function AppShell() {
  const t = useTokens();
  const view = useICU(s => s.view);
  const isAuthed = useICU(s => !!s.user);
  const user = useICU(s => s.user);
  const mode = useICU(s => s.mode);
  const pushToast = useICU(s => s.pushToast);
  const tickVitals = useICU(s => s.tickVitals);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  // Live vitals ticker — 1.5s drift
  useEffect(() => {
    if (!isAuthed) return;
    const handle = setInterval(() => tickVitals(), 1500);
    return () => clearInterval(handle);
  }, [isAuthed, tickVitals]);

  // Register for push notifications once signed in (live mode only).
  useEffect(() => {
    if (!user || mode !== 'live') return;
    initFcm(user.id, (title, body) => pushToast({ tone: 'info', msg: body ? `${title}: ${body}` : title }));
  }, [user, mode, pushToast]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={t.surface}
      />
      {(() => {
        if (!isAuthed) return <LoginScreen />;
        if (view === 'patient') return <PatientDetailScreen />;
        if (view === 'tweaks') return <TweaksScreen />;
        return <DashboardScreen />;
      })()}
      <Toasts />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
