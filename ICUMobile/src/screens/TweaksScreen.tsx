import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useTheme, useTokens } from '../theme/ThemeContext';
import { Accent, Density, Shift, ThemeMode } from '../theme/tokens';
import { useICU } from '../data/mockICU';
import { Card } from '../components/Card';
import { SectionTitle } from '../components/SectionTitle';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { Field } from '../components/Field';
import { getBaseUrl, setBaseUrl } from '../api/config';

export function TweaksScreen() {
  const t = useTokens();
  const { mode, setMode, shift, setShift, accent, setAccent, density, setDensity } = useTheme();
  const ICU = useICU();
  const alarmsOn = ICU.alarmsOn;
  const dataMode = ICU.mode;
  const [url, setUrl] = useState(getBaseUrl());

  return (
    <View style={[styles.frame, { backgroundColor: t.bg }]}>
      <View style={[styles.topBar, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
        <Pressable onPress={() => ICU.setView('dashboard')} hitSlop={10} style={styles.iconBtn}>
          <Icon name="chevL" size={20} color={t.ink2} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Tweaks</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle>DATA SOURCE</SectionTitle>
        <Card>
          <Toggle
            value={dataMode}
            options={[
              { value: 'live', label: '🌐 Live · prod backend' },
              { value: 'demo', label: '🧪 Demo · mock data' },
            ]}
            onChange={(v) => {
              if (v === 'live') {
                ICU.setMode('live');
                ICU.signOut();
              } else {
                ICU.setMode('demo');
              }
            }}
          />
          <Text style={{ fontSize: 11, color: t.ink3, marginTop: 8 }}>
            {dataMode === 'live'
              ? 'App reads and writes to the configured backend URL below.'
              : 'App uses 4 fixture patients with simulated live vitals (1.5 s drift).'}
          </Text>
        </Card>

        <SectionTitle>BACKEND URL</SectionTitle>
        <Card>
          <Field
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://example.com/api"
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Button variant="outline" onPress={() => { setUrl(getBaseUrl()); }}>Reset</Button>
            <Button variant="primary" onPress={() => {
              setBaseUrl(url.trim());
              ICU.pushToast({ tone: 'ok', msg: 'Backend URL saved' });
            }}>Save</Button>
          </View>
        </Card>

        <SectionTitle>ROLE (DEMO ONLY)</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ICU.users.filter((u, i, arr) => arr.findIndex(x => x.role === u.role) === i).map(u => {
              const active = ICU.user?.role === u.role;
              return (
                <Pressable
                  key={u.role}
                  onPress={() => ICU.signIn(u)}
                  style={({ pressed }) => [
                    styles.roleBtn,
                    {
                      backgroundColor: active ? t.accentSoft : t.surface,
                      borderColor: active ? t.accent : t.line,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Avatar initials={u.initials} color={u.color} size="sm" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: active ? t.accentInk : t.ink3, letterSpacing: 0.5, marginTop: 4 }}>
                    {u.role}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle>THEME</SectionTitle>
        <Card>
          <Toggle
            value={mode}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark · Bedside' }]}
            onChange={(v) => setMode(v as ThemeMode)}
          />
        </Card>

        <SectionTitle>SHIFT TINT</SectionTitle>
        <Card>
          <Toggle
            value={shift}
            options={[{ value: 'day', label: '☀️ Day' }, { value: 'night', label: '🌙 Night' }]}
            onChange={(v) => setShift(v as Shift)}
          />
        </Card>

        <SectionTitle>ACCENT</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              ['blue', '#2563eb'],
              ['teal', '#0d9488'],
              ['violet', '#7c3aed'],
              ['amber', '#d97706'],
            ] as const).map(([a, color]) => (
              <Pressable
                key={a}
                onPress={() => setAccent(a as Accent)}
                style={({ pressed }) => [
                  styles.swatch,
                  { backgroundColor: color, borderColor: accent === a ? t.ink : 'transparent', opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {accent === a && <Icon name="check" size={18} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionTitle>DENSITY</SectionTitle>
        <Card>
          <Toggle
            value={density}
            options={[{ value: 'comfy', label: 'Comfy' }, { value: 'compact', label: 'Compact' }]}
            onChange={(v) => setDensity(v as Density)}
          />
        </Card>

        <SectionTitle>ALARMS</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>Critical alarms</Text>
              <Text style={{ fontSize: 11, color: t.ink3, marginTop: 2 }}>Show due intervention reminders</Text>
            </View>
            <Pill tone={alarmsOn ? 'crit' : 'muted'}>{alarmsOn ? 'ON' : 'OFF'}</Pill>
          </View>
          <Button variant="outline" style={{ marginTop: 12 }} onPress={() => ICU.toggleAlarms()}>
            {alarmsOn ? 'Disable alarms' : 'Enable alarms'}
          </Button>
        </Card>

        <View style={{ height: 12 }} />
        <Button variant="outline" icon="logout" onPress={() => ICU.signOut()}>Sign out</Button>
      </ScrollView>
    </View>
  );
}

function Toggle({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const t = useTokens();
  return (
    <View style={[styles.toggleRail, { backgroundColor: t.surface3, borderColor: t.line }]}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.toggleBtn, { backgroundColor: active ? t.surface : 'transparent' }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? t.ink : t.ink3 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
  scroll: { padding: 14, gap: 6, paddingBottom: 30 },
  toggleRail: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleBtn: {
    flex: 1,
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  swatch: {
    width: 48, height: 48, borderRadius: 12,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
});
