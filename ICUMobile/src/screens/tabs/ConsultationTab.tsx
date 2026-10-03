import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtDate, fmtTime, Patient } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

export function ConsultationTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);

  const list = [...patient.consultations].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());

  const pick = async (source: 'camera' | 'gallery') => {
    const picker = source === 'camera' ? launchCamera : launchImageLibrary;
    const res = await picker({ mediaType: 'photo', quality: 0.8, maxWidth: 2000, maxHeight: 2000, saveToPhotos: source === 'camera' });
    if (res.didCancel) return;
    if (res.assets?.[0]) setAsset(res.assets[0]);
  };

  const save = async () => {
    if (ICU.mode !== 'live') { ICU.pushToast({ tone: 'warn', msg: 'Switch to Live mode to save' }); return; }
    if (!doctorName.trim() || !specialty.trim()) { ICU.pushToast({ tone: 'crit', msg: 'Enter doctor name and specialty' }); return; }
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (asset?.uri) {
        ICU.pushToast({ tone: 'info', msg: 'Uploading report…' });
        const up = await api.uploadImage({ uri: asset.uri, name: asset.fileName || `consult-${Date.now()}.jpg`, type: asset.type || 'image/jpeg' });
        imageUrl = up.url;
      }
      await ICU.addConsultationLive(patient.id, { doctorName: doctorName.trim(), specialty: specialty.trim(), notes: notes.trim(), imageUrl });
      setShowAdd(false);
      setDoctorName(''); setSpecialty(''); setNotes(''); setAsset(null);
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Save failed' });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Consultations</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{list.length} specialist consult{list.length === 1 ? '' : 's'}</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowAdd(true)}>Add</Button>
      </View>

      {list.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No consultation reports yet.</Text></Card>
        : <View style={{ gap: 8 }}>
            {list.map(c => (
              <Card key={c.id} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: t.infoBg }}>
                    <Icon name="stetho" size={14} color={t.infoFg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{c.specialty} Consultation</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }}>By {c.doctorName} · {fmtDate(c.t)} {fmtTime(c.t)}</Text>
                  </View>
                </View>
                {c.notes ? (
                  <Text style={{ fontSize: 13, fontStyle: 'italic', color: t.ink2, backgroundColor: t.surface2, padding: 10, borderRadius: 8 }}>"{c.notes}"</Text>
                ) : null}
                {c.imageUrl && (
                  <Button variant="outline" icon="fileText" fullWidth style={{ marginTop: 8 }}
                    onPress={() => Linking.openURL(getFileUrl(c.imageUrl!)).catch(() => ICU.pushToast({ tone: 'crit', msg: 'Could not open report' }))}>
                    View full report
                  </Button>
                )}
              </Card>
            ))}
          </View>
      }

      <Sheet open={showAdd} onClose={() => !busy && setShowAdd(false)} title="Add consultation"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={save} loading={busy} disabled={busy}>Save</Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <Field label="Doctor name" placeholder="Dr. Name" value={doctorName} onChangeText={setDoctorName} />
          <Field label="Specialty" placeholder="e.g. Cardiology" value={specialty} onChangeText={setSpecialty} />
          <Field label="Notes / recommendation" placeholder="Consultant's notes" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} value={notes} onChangeText={setNotes} />
          <View>
            <Text style={styles.pickLabel}>Report image / PDF (optional)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" icon="camera" onPress={() => pick('camera')} disabled={busy} style={{ flex: 1 }}>Camera</Button>
              <Button variant="outline" icon="fileText" onPress={() => pick('gallery')} disabled={busy} style={{ flex: 1 }}>Gallery</Button>
            </View>
            {asset && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon name="check_circle" size={14} color={t.okFg} />
                <Text style={{ fontSize: 12, color: t.ink2 }} numberOfLines={1}>{asset.fileName || 'Image selected'}</Text>
              </View>
            )}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  pickLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
});
