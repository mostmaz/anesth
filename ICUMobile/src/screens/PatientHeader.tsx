import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { useICU, Patient } from '../data/mockICU';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { Checkbox } from '../components/Checkbox';
import { Field } from '../components/Field';

interface Props {
  patient: Patient;
  onBack: () => void;
}

export function PatientHeader({ patient, onBack }: Props) {
  const t = useTokens();
  const ICU = useICU();
  const [showCheckin, setShowCheckin] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargeBusy, setDischargeBusy] = useState(false);
  const [airway, setAirway] = useState(true);
  const [breathing, setBreathing] = useState(true);
  const [circulation, setCirculation] = useState(true);

  const day = Math.floor((Date.now() - new Date(patient.admittedAt).getTime()) / (24 * 60 * 60_000)) + 1;

  const onDischarge = async () => {
    setDischargeBusy(true);
    try {
      if (ICU.mode === 'live') {
        await ICU.dischargePatientLive(patient.id);
      } else {
        // Demo mode: just stamp locally
        patient.dischargedAt = new Date();
        ICU.bump();
        ICU.pushToast({ tone: 'ok', msg: 'Patient discharged (demo)' });
      }
      setShowDischarge(false);
      onBack();
    } finally {
      setDischargeBusy(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={10} style={[styles.backBtn]}>
          <Icon name="chevL" size={20} color={t.ink2} />
        </Pressable>
        <Avatar initials={patient.initials} color={patient.color} size="md" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, flexShrink: 1 }} numberOfLines={1}>
              {patient.name}
            </Text>
            <Pressable hitSlop={6}><Icon name="edit" size={12} color={t.ink3} /></Pressable>
          </View>
          <Text style={{ fontSize: 10, color: t.ink3 }} numberOfLines={1}>
            {patient.bed} · {patient.mrn} · {patient.age}{patient.gender}
          </Text>
        </View>
        <Pressable hitSlop={6} style={styles.iconBtn}>
          <Icon name="printer" size={16} color={t.ink2} />
        </Pressable>
        <Button size="sm" variant="success" icon="stetho" onPress={() => setShowCheckin(true)}>
          Check-in
        </Button>
        <Button size="sm" variant="outline" icon="logout" onPress={() => setShowDischarge(true)}>
          Discharge
        </Button>
      </View>

      {/* Status pills + day counter */}
      <View style={[styles.bottomZone, { backgroundColor: t.surface, borderTopColor: t.line }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <Pill tone={patient.code === 'DNR' ? 'warn' : 'crit'}>
            <Icon name="shield" size={10} color={patient.code === 'DNR' ? t.warnFg : t.critFg} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: patient.code === 'DNR' ? t.warnFg : t.critFg, letterSpacing: 0.5 }}>
              {patient.code}
            </Text>
          </Pill>
          <Pill tone={patient.critical ? 'crit' : 'ok'}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: patient.critical ? t.sigHr : t.okLine }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: patient.critical ? t.critFg : t.okFg, letterSpacing: 0.5 }}>
              {patient.critical ? 'Critical' : 'Stable'}
            </Text>
          </Pill>
          {patient.ventilated && (
            <Pill tone="info">
              <Icon name="wind" size={10} color={t.infoFg} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.infoFg, letterSpacing: 0.5 }}>VENTED</Text>
            </Pill>
          )}
          <Text style={{ marginLeft: 'auto', fontSize: 10, color: t.ink3, fontWeight: '600' }}>Day {day}</Text>
        </View>

      </View>

      <Sheet
        open={showCheckin}
        onClose={() => setShowCheckin(false)}
        title="Bedside check-in"
        footer={<>
          <Button variant="outline" onPress={() => setShowCheckin(false)}>Cancel</Button>
          <Button variant="success" icon="check" onPress={() => {
            setShowCheckin(false);
            ICU.pushToast({ tone: 'ok', msg: 'Check-in recorded' });
          }}>Confirm</Button>
        </>}
      >
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 12, color: t.ink3 }}>Quick ABC bedside assessment.</Text>
          <View style={[styles.checkRow, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Checkbox checked={airway} onChange={setAirway}>Airway safe / patent</Checkbox>
          </View>
          <View style={[styles.checkRow, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Checkbox checked={breathing} onChange={setBreathing}>Breathing / Vent OK</Checkbox>
          </View>
          <View style={[styles.checkRow, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Checkbox checked={circulation} onChange={setCirculation}>Circulation / Hemodynamics</Checkbox>
          </View>
          <Field label="Quick note" placeholder="Optional note…" multiline numberOfLines={3} style={{ minHeight: 60, textAlignVertical: 'top' }} />
        </View>
      </Sheet>

      <Sheet
        open={showDischarge}
        onClose={() => !dischargeBusy && setShowDischarge(false)}
        title="Discharge patient"
        footer={<>
          <Button variant="outline" onPress={() => setShowDischarge(false)} disabled={dischargeBusy}>Cancel</Button>
          <Button variant="danger" icon="logout" onPress={onDischarge} loading={dischargeBusy}>
            Discharge
          </Button>
        </>}
      >
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 14, color: t.ink2 }}>
            Discharge <Text style={{ fontWeight: '700', color: t.ink }}>{patient.name}</Text> (MRN {patient.mrn})?
          </Text>
          <Text style={{ fontSize: 12, color: t.ink3 }}>
            The patient will be moved to the Archived tab. Their chart stays accessible from there.
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomZone: {
    padding: 14,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  checkRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
