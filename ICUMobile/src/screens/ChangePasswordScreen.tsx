import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { useICU } from '../data/mockICU';
import { useT } from '../i18n';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Field } from '../components/Field';

const MIN_LENGTH = 8;

// Opened from Tweaks, and shown automatically (forced) right after sign-in
// while the account still uses the shared default password. In forced mode the
// only ways out are setting a new password or signing out.
export function ChangePasswordScreen({ forced = false }: { forced?: boolean }) {
  const t = useTokens();
  const { t: tr } = useT();
  const ICU = useICU();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!current) return setErr(tr('password.enterCurrent'));
    if (next.length < MIN_LENGTH) return setErr(tr('password.tooShort'));
    if (next.toLowerCase() === 'password') return setErr(tr('password.notDefault'));
    if (next !== confirm) return setErr(tr('password.mismatch'));

    setBusy(true);
    try {
      await ICU.changePasswordLive(current, next);
      ICU.pushToast({ tone: 'ok', msg: tr('password.changed') });
    } catch (e: any) {
      setErr(e?.message || tr('password.failed'));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.frame, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
        {forced ? (
          <View style={styles.iconBtn}>
            <Icon name="shield" size={20} color={t.ink2} />
          </View>
        ) : (
          <Pressable onPress={() => ICU.setView('tweaks')} hitSlop={10} style={styles.iconBtn} disabled={busy}>
            <Icon name="chevL" size={20} color={t.ink2} />
          </Pressable>
        )}
        <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>{tr('password.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {forced ? (
          <View style={[styles.notice, { backgroundColor: t.warnBg, borderColor: t.warnLine }]}>
            <Icon name="alert" size={16} color={t.warnFg} />
            <Text style={[styles.noticeText, { color: t.warnFg }]}>{tr('password.forcedNotice')}</Text>
          </View>
        ) : null}

        <Card>
          <View style={{ gap: 14 }}>
            <Field label={tr('password.current')} value={current} onChangeText={setCurrent}
              secureTextEntry autoCapitalize="none" autoCorrect={false} />
            <Field label={tr('password.new')} value={next} onChangeText={setNext}
              secureTextEntry autoCapitalize="none" autoCorrect={false} />
            <Field label={tr('password.confirm')} value={confirm} onChangeText={setConfirm}
              secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={submit} />
            {err ? (
              <View style={[styles.notice, { backgroundColor: t.critBg, borderColor: t.critLine }]}>
                <Icon name="alert" size={16} color={t.critFg} />
                <Text style={[styles.noticeText, { color: t.critFg }]}>{err}</Text>
              </View>
            ) : null}
            <Button onPress={submit} loading={busy} fullWidth style={{ paddingVertical: 14 }}>
              {tr('password.save')}
            </Button>
          </View>
        </Card>

        {forced ? (
          <Button variant="outline" icon="logout" onPress={() => ICU.signOut()} disabled={busy} style={{ marginTop: 12 }}>
            {tr('nav.signOut')}
          </Button>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 14, gap: 12, paddingBottom: 30 },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  noticeText: { fontSize: 13, flex: 1 },
});
