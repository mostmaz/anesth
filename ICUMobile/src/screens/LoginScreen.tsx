import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { useICU, MockUser } from '../data/mockICU';
import { Icon } from '../components/Icon';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';

export function LoginScreen() {
  const t = useTokens();
  const ICU = useICU();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (uname?: string, pwd?: string) => {
    setErr('');
    const u = (uname ?? username).trim();
    const p = pwd ?? password;
    if (!u || !p) {
      setErr('Enter username and password.');
      return;
    }
    setLoading(true);
    try {
      if (ICU.mode === 'live') {
        await ICU.realLogin(u, p);
        ICU.pushToast({ tone: 'ok', msg: 'Signed in' });
      } else {
        const target = ICU.users.find(x => x.name.toLowerCase().includes(u.toLowerCase())
          || u.toLowerCase() === x.role.toLowerCase());
        if (!target || p !== 'password') {
          throw new Error('Invalid credentials (demo mode).');
        }
        ICU.signIn(target);
        ICU.pushToast({ tone: 'ok', msg: `Demo · ${target.role.toLowerCase()}` });
      }
    } catch (e: any) {
      setErr(e?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Role shortcut button. In live mode it hits the real backend using
  // the seeded username for that role (nurse / resident / senior, pwd "password").
  // In demo mode it uses the local mock fixtures.
  const quickLogin = (role: 'NURSE' | 'RESIDENT' | 'SENIOR') => {
    if (ICU.mode === 'live') {
      submit(role.toLowerCase(), 'password');
    } else {
      const u = ICU.users.find(x => x.role === role);
      if (u) {
        ICU.signIn(u);
        ICU.pushToast({ tone: 'ok', msg: `Demo · ${u.role.toLowerCase()}` });
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoBox, { backgroundColor: t.accent }]}>
            <Icon name="dna" size={32} color="#ffffff" />
            <View style={styles.greenDot} />
          </View>
          <Text style={[styles.title, { color: t.ink }]}>ICU Manager</Text>
          <Text style={[styles.subtitle, { color: t.ink3 }]}>Sign in to access patient records</Text>
        </View>

        {/* Form */}
        <View style={{ gap: 14 }}>
          <Field label="Username" value={username} onChangeText={setUsername} placeholder="e.g. sara.ahmed" autoCapitalize="none" autoCorrect={false} />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {err ? (
            <View style={[styles.error, { backgroundColor: t.critBg, borderColor: t.sigHr }]}>
              <Icon name="alert" size={16} color={t.critFg} />
              <Text style={[styles.errorText, { color: t.critFg }]}>{err}</Text>
            </View>
          ) : null}
          <Button onPress={() => submit()} loading={loading} fullWidth iconRight="arrowRight" style={{ paddingVertical: 14 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </View>

        {/* Quick-login shortcuts */}
        <View style={{ marginTop: 22 }}>
          <Text style={[styles.demoLabel, { color: t.ink3 }]}>
            {ICU.mode === 'live' ? 'QUICK SIGN-IN AS' : 'DEMO · SIGN IN AS'}
          </Text>
          <View style={styles.demoRow}>
            {(['NURSE', 'RESIDENT', 'SENIOR'] as const).map(role => {
              const fixture = ICU.users.find(x => x.role === role);
              return (
                <Button
                  key={role}
                  variant="outline"
                  onPress={() => quickLogin(role)}
                  style={styles.demoBtn}
                  disabled={loading}
                >
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Avatar initials={fixture?.initials || role.slice(0, 2)} color={fixture?.color} size="sm" />
                    <Text style={[styles.demoRole, { color: t.ink3 }]}>{role}</Text>
                  </View>
                </Button>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: t.ink4 }]}>
            {ICU.mode === 'live'
              ? `Live · ${ICU.users[0]?.name ? 'real users' : 'prod backend'} · default password: `
              : 'Default password: '}
            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>password</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  greenDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 6 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  demoLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 10,
  },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoBtn: { flex: 1, height: 76, paddingVertical: 12 },
  demoRole: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.5,
  },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 16 },
});
