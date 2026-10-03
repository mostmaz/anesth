import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtAgo, Patient } from '../../data/mockICU';
import { Card, CardHead } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { TabRail } from '../../components/Tabs';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { BodyMap } from '../../components/BodyMap';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

export function NursingTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [side, setSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [region, setRegion] = useState<{ part: string; side: 'FRONT' | 'BACK' } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<'lesion' | 'dressing'>('lesion');
  const [skinNotes, setSkinNotes] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);

  const openRegion = (r: { part: string; side: 'FRONT' | 'BACK' }) => {
    setSkinType('lesion');
    setSkinNotes('');
    setAsset(null);
    setRegion(r);
  };

  const pick = async (source: 'camera' | 'gallery') => {
    const picker = source === 'camera' ? launchCamera : launchImageLibrary;
    const res = await picker({ mediaType: 'photo', quality: 0.8, maxWidth: 2000, maxHeight: 2000, saveToPhotos: source === 'camera' });
    if (res.didCancel) return;
    if (res.errorCode) { ICU.pushToast({ tone: 'crit', msg: res.errorMessage || 'Could not open camera' }); return; }
    if (res.assets?.[0]) setAsset(res.assets[0]);
  };

  const saveSkin = async () => {
    if (!region) return;
    setSaving(true);
    try {
      if (ICU.mode === 'live') {
        let imageUrl: string | undefined;
        if (asset?.uri) {
          ICU.pushToast({ tone: 'info', msg: 'Uploading photo…' });
          const up = await api.uploadImage({ uri: asset.uri, name: asset.fileName || `skin-${Date.now()}.jpg`, type: asset.type || 'image/jpeg' });
          imageUrl = up.url;
        }
        await ICU.addSkinLive(patient.id, {
          bodyPart: region.part,
          view: region.side,
          type: skinType === 'lesion' ? 'LESION' : 'DRESSING',
          notes: skinNotes.trim() || 'Documented from body map.',
          imageUrl,
        });
      } else {
        patient.skinAssessments.unshift({
          id: 'sk' + Date.now(), part: region.part, side: region.side,
          type: skinType === 'lesion' ? 'Lesion' : 'Dressing', t: new Date(),
          by: ICU.user!.name, notes: skinNotes.trim() || 'Documented from body map.',
          imageUrl: asset?.uri,
        });
        ICU.pushToast({ tone: 'ok', msg: 'Assessment saved' });
        ICU.bump();
      }
      setRegion(null);
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const assessedSet = useMemo(() => {
    const s = new Set<string>();
    patient.skinAssessments.forEach(a => s.add(`${a.part}|${a.side}`));
    return s;
  }, [patient.skinAssessments]);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Nursing · skin & lines</Text>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>Body map</Text>
          <View style={{ minWidth: 140 }}>
            <TabRail value={side} onChange={(v) => setSide(v as any)} items={[
              { value: 'FRONT', label: 'Front' }, { value: 'BACK', label: 'Back' },
            ]} />
          </View>
        </View>
        <View style={{ alignItems: 'center', padding: 8 }}>
          <BodyMap side={side} assessedSet={assessedSet} onPick={(part) => openRegion({ part, side })} />
        </View>
        <Text style={{ fontSize: 11, textAlign: 'center', color: t.ink3, marginTop: 6 }}>
          Tap a region to document. <Text style={{ fontWeight: '700', color: t.accentInk }}>{assessedSet.size}</Text> documented.
        </Text>
      </Card>

      <Card tight>
        <CardHead title="Skin assessments" subtitle={`${patient.skinAssessments.length} records`} icon="user" />
        {patient.skinAssessments.length === 0
          ? <Text style={{ textAlign: 'center', fontSize: 12, color: t.ink3, paddingVertical: 16 }}>
              No skin assessments. Select a body part to start.
            </Text>
          : <View style={{ gap: 8 }}>
              {patient.skinAssessments.map(a => (
                <Pressable
                  key={a.id}
                  onPress={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  style={({ pressed }) => [
                    styles.aRow,
                    { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pill tone={a.type === 'Lesion' ? 'crit' : 'muted'}>{a.type === 'Lesion' ? 'LESION' : 'DRESSING'}</Pill>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>{a.part}</Text>
                    <Text style={{ fontSize: 10, color: t.ink3 }}>({a.side})</Text>
                    <Text style={{ marginLeft: 'auto', fontSize: 10, color: t.ink3 }}>{fmtAgo(a.t)} ago</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontStyle: 'italic', color: t.ink3, marginTop: 4 }}>
                    "{expandedId === a.id ? a.notes : (a.notes.length > 60 ? a.notes.slice(0, 60) + '…' : a.notes)}"
                  </Text>
                  <Text style={{ fontSize: 10, color: t.ink4, marginTop: 4 }}>By {a.by}</Text>
                  {a.imageUrl ? (
                    <Button variant="outline" icon="camera" fullWidth style={{ marginTop: 8 }}
                      onPress={() => Linking.openURL(getFileUrl(a.imageUrl!)).catch(() => ICU.pushToast({ tone: 'crit', msg: 'Could not open photo' }))}>
                      View photo
                    </Button>
                  ) : null}
                </Pressable>
              ))}
            </View>
        }
      </Card>

      <Sheet open={!!region} onClose={() => !saving && setRegion(null)}
        title={region ? `Skin: ${region.part} (${region.side})` : ''}
        footer={<>
          <Button variant="outline" onPress={() => setRegion(null)} disabled={saving}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={saveSkin} loading={saving} disabled={saving}>Save</Button>
        </>}
      >
        <View style={{ gap: 10 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Type</Text>
            <TabRail value={skinType} onChange={(v) => setSkinType(v as any)} items={[
              { value: 'lesion', label: 'Lesion / Pressure' },
              { value: 'dressing', label: 'Dressing' },
            ]} />
          </View>
          <Field label="Clinical notes" multiline numberOfLines={3} placeholder="Describe appearance, size, or dressing state…" style={{ minHeight: 70, textAlignVertical: 'top' }} value={skinNotes} onChangeText={setSkinNotes} />
          <View>
            <Text style={styles.pickLabel}>Photo (optional)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" icon="camera" onPress={() => pick('camera')} disabled={saving} style={{ flex: 1 }}>Camera</Button>
              <Button variant="outline" icon="fileText" onPress={() => pick('gallery')} disabled={saving} style={{ flex: 1 }}>Gallery</Button>
            </View>
            {asset && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon name="check_circle" size={14} color={t.okFg} />
                <Text style={{ fontSize: 12, color: t.ink2, flex: 1 }} numberOfLines={1}>{asset.fileName || 'Photo selected'}</Text>
                <Pressable onPress={() => setAsset(null)} hitSlop={8}><Text style={{ fontSize: 12, color: t.critFg, fontWeight: '600' }}>Remove</Text></Pressable>
              </View>
            )}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  aRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
});
