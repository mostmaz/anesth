import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtTime, fmtDate, fmtAgo, Patient, Investigation } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { TabRail } from '../../components/Tabs';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { LineChart } from '../../components/LineChart';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

// Extract the leading numeric value from a lab value string (e.g. "48 mmHg" -> 48).
const parseLabNum = (v: string): number | null => {
  const m = String(v).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
};

export function LabsTab({ patient, userRole }: { patient: Patient; userRole: string }) {
  const t = useTokens();
  const ICU = useICU();
  const [tab, setTab] = useState<'labs' | 'imaging' | 'cardio'>('labs');
  const [openInv, setOpenInv] = useState<Investigation | null>(null);
  const [trendParam, setTrendParam] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Historical series for a parameter across all of the patient's investigations.
  const trendSeries = React.useMemo(() => {
    if (!trendParam) return [] as Array<{ t: Date; value: number }>;
    const key = trendParam.toLowerCase();
    const pts: Array<{ t: Date; value: number }> = [];
    patient.investigations.forEach(inv => {
      const hit = inv.params.find(([k]) => k.toLowerCase() === key);
      if (hit) {
        const n = parseLabNum(hit[1]);
        if (n !== null) pts.push({ t: new Date(inv.t), value: n });
      }
    });
    return pts.sort((a, b) => a.t.getTime() - b.t.getTime());
  }, [trendParam, patient.investigations]);

  // Labs source picker (camera/gallery → AI extract)
  const [showLabPick, setShowLabPick] = useState(false);
  // Manual imaging/cardiology upload sheet
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualAsset, setManualAsset] = useState<Asset | null>(null);

  const filtered = patient.investigations.filter(l => {
    const ty = (l.type || '').toLowerCase();
    const isImaging = /imag|radiolog|x-?ray|\bct\b|\bmri\b|ultrasound|\bus\b|scan/.test(ty);
    const isCardio = /ecg|ekg|echo|cardio/.test(ty);
    if (tab === 'imaging') return isImaging;
    if (tab === 'cardio') return isCardio;
    return !isImaging && !isCardio;
  });

  const requireLive = (): boolean => {
    if (ICU.mode !== 'live') {
      ICU.pushToast({ tone: 'warn', msg: 'Switch to Live mode to upload results' });
      return false;
    }
    return true;
  };

  const pickAsset = async (source: 'camera' | 'gallery'): Promise<Asset | null> => {
    const picker = source === 'camera' ? launchCamera : launchImageLibrary;
    const result = await picker({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2000,
      maxHeight: 2000,
      saveToPhotos: source === 'camera',
      includeBase64: false,
    });
    if (result.didCancel) return null;
    if (result.errorCode) {
      ICU.pushToast({ tone: 'crit', msg: `Picker: ${result.errorMessage || result.errorCode}` });
      return null;
    }
    return result.assets?.[0] || null;
  };

  const uploadAsset = async (asset: Asset): Promise<string> => {
    const up = await api.uploadImage({
      uri: asset.uri!,
      name: asset.fileName || `result-${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
    });
    return up.url; // server-relative /uploads/...
  };

  // ── Labs: pick photo → upload → OCR (LAB) → create investigations ──
  const handleLabUpload = async (source: 'camera' | 'gallery') => {
    if (!requireLive()) return;
    setUploadBusy(true);
    try {
      const asset = await pickAsset(source);
      if (!asset?.uri) return;
      ICU.pushToast({ tone: 'info', msg: 'Uploading…' });
      const imageUrl = await uploadAsset(asset);

      ICU.pushToast({ tone: 'info', msg: 'Analyzing report with AI…' });
      const extracted: any = await api.ocrAnalyze(imageUrl, 'LAB');
      const groups: any[] = Array.isArray(extracted) ? extracted : [extracted];

      let created = 0;
      for (const g of groups) {
        const results = (g && g.results) || {};
        if (Object.keys(results).length === 0 && !g?.title) continue;
        let conductedAt: string | undefined;
        const rawDate = g?.registrationDate || g?.date;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) conductedAt = d.toISOString();
        }
        await api.createInvestigation({
          patientId: patient.id,
          authorId: ICU.user!.id,
          type: (g?.type || 'LAB'),
          category: g?.category || g?.title || 'External',
          title: g?.title || asset.fileName || 'Lab Result',
          status: 'FINAL',
          result: { ...results, imageUrl },
          impression: g?.impression || '',
          conductedAt,
        });
        created++;
      }

      await ICU.loadInvestigations(patient.id);
      setShowLabPick(false);
      if (created === 0) {
        ICU.pushToast({ tone: 'warn', msg: 'No results detected — try a clearer photo' });
      } else {
        ICU.pushToast({ tone: 'ok', msg: `Added ${created} result${created === 1 ? '' : 's'}` });
      }
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Upload failed' });
    } finally {
      setUploadBusy(false);
    }
  };

  // ── Imaging/Cardiology: manual upload (image + notes, no AI) ──
  const openManualSheet = () => {
    if (!requireLive()) return;
    setManualTitle('');
    setManualNotes('');
    setManualAsset(null);
    setShowManual(true);
  };

  const handleManualPick = async (source: 'camera' | 'gallery') => {
    const asset = await pickAsset(source);
    if (asset) setManualAsset(asset);
  };

  const handleManualSave = async () => {
    if (!requireLive()) return;
    if (!manualTitle.trim()) { ICU.pushToast({ tone: 'crit', msg: 'Enter a title (e.g. CT Head)' }); return; }
    setUploadBusy(true);
    try {
      let imageUrl: string | undefined;
      if (manualAsset?.uri) {
        ICU.pushToast({ tone: 'info', msg: 'Uploading image…' });
        imageUrl = await uploadAsset(manualAsset);
      }
      const isCardio = tab === 'cardio';
      await api.createInvestigation({
        patientId: patient.id,
        authorId: ICU.user!.id,
        type: 'IMAGING',
        category: isCardio ? 'ECHO' : 'Imaging',
        title: manualTitle.trim(),
        status: 'FINAL',
        result: imageUrl ? { imageUrl } : {},
        impression: manualNotes.trim(),
      });
      await ICU.loadInvestigations(patient.id);
      setShowManual(false);
      ICU.pushToast({ tone: 'ok', msg: 'Study added' });
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Save failed' });
    } finally {
      setUploadBusy(false);
    }
  };

  const onUploadPress = () => {
    if (tab === 'labs') {
      if (!requireLive()) return;
      setShowLabPick(true);
    } else {
      openManualSheet();
    }
  };

  const openAttachment = (inv: Investigation) => {
    if (!inv.imageUrl) return;
    Linking.openURL(getFileUrl(inv.imageUrl)).catch(() =>
      ICU.pushToast({ tone: 'crit', msg: 'Could not open attachment' }),
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Investigations</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>
            {patient.investigations.length} results · {patient.investigations.filter(l => l.abnormal).length} abnormal
          </Text>
        </View>
        <Button size="sm" variant="outline" icon={tab === 'labs' ? 'camera' : 'plus'} loading={uploadBusy} onPress={onUploadPress}>
          {tab === 'labs' ? 'Upload' : tab === 'imaging' ? 'Add study' : 'Add'}
        </Button>
      </View>

      <TabRail
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: 'labs', label: 'Labs' },
          { value: 'imaging', label: 'Imaging' },
          { value: 'cardio', label: 'Cardiology' },
        ]}
      />

      {filtered.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No investigations found.</Text></Card>
        : <View style={{ gap: 8 }}>
            {filtered.map(l => (
              <Card key={l.id} onPress={() => setOpenInv(l)} style={{
                padding: 14,
                borderColor: l.abnormal ? `${t.sigHr}59` : t.line,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: l.abnormal ? t.critBg : t.infoBg,
                  }}>
                    <Icon name={tab === 'imaging' ? 'monitor' : 'flask'} size={14}
                      color={l.abnormal ? t.critFg : t.infoFg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{l.title}</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }}>{fmtDate(l.t)} · {fmtTime(l.t)} · {fmtAgo(l.t)} ago</Text>
                  </View>
                  {l.imageUrl && (
                    <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface3 }}>
                      <Icon name="fileText" size={12} color={t.ink3} />
                    </View>
                  )}
                  {l.abnormal && <Pill tone="crit">Abnormal</Pill>}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {l.params.slice(0, 6).map(([k, v, abn], i) => (
                    <View key={i} style={[styles.paramRow, { width: '50%' }]}>
                      <Text style={{ fontSize: 11, color: t.ink3, flexShrink: 1 }} numberOfLines={1}>{k}</Text>
                      <Text style={{
                        fontSize: 11, fontWeight: '600',
                        color: abn ? t.sigHr : t.ink,
                      }}>{v}{abn ? ' !' : ''}</Text>
                    </View>
                  ))}
                </View>
                {l.impression ? (
                  <Text style={{
                    fontSize: 11, marginTop: 8, paddingTop: 8,
                    fontStyle: 'italic', color: t.ink2,
                    borderTopWidth: 1, borderTopColor: t.line,
                  }}>{l.impression}</Text>
                ) : null}
              </Card>
            ))}
          </View>
      }

      {/* Detail sheet */}
      <Sheet open={!!openInv} onClose={() => { setOpenInv(null); setTrendParam(null); }} title={openInv?.title}>
        {openInv && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pill tone="muted">{openInv.type}</Pill>
              {openInv.abnormal && <Pill tone="crit">Abnormal</Pill>}
              <Text style={{ fontSize: 11, color: t.ink3, marginLeft: 'auto' }}>{fmtDate(openInv.t)} · {fmtTime(openInv.t)}</Text>
            </View>

            {openInv.imageUrl && (
              <Button
                variant="outline"
                icon="fileText"
                fullWidth
                onPress={() => openAttachment(openInv)}
              >
                {openInv.imageUrl.toLowerCase().endsWith('.pdf') ? 'View attached PDF' : 'View attached image'}
              </Button>
            )}

            {openInv.params.length > 0 && (
              <Card>
                {openInv.params.map(([k, v, abn], i) => {
                  const hasTrend = parseLabNum(v) !== null;
                  const on = trendParam === k;
                  return (
                    <Pressable key={i} onPress={() => hasTrend && setTrendParam(on ? null : k)}
                      style={[styles.paramFull, { borderBottomColor: t.line, backgroundColor: on ? t.surface2 : 'transparent' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: t.ink }}>{k}</Text>
                        {hasTrend && <Icon name="activity" size={13} color={on ? t.accentInk : t.ink3} />}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: abn ? t.sigHr : t.ink }}>
                        {v}{abn ? ' !' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </Card>
            )}

            {trendParam && (
              <Card>
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink, marginBottom: 2 }}>{trendParam} · trend</Text>
                <Text style={{ fontSize: 11, color: t.ink3, marginBottom: 8 }}>{trendSeries.length} result{trendSeries.length === 1 ? '' : 's'} over time</Text>
                {trendSeries.length < 2
                  ? <Text style={{ fontSize: 12, color: t.ink3, paddingVertical: 12, textAlign: 'center' }}>Not enough data points to chart.</Text>
                  : <>
                      <LineChart series={[{ values: trendSeries.map(p => p.value), color: t.accent }]} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 10, color: t.ink3 }}>{fmtDate(trendSeries[0].t)}</Text>
                        <Text style={{ fontSize: 10, color: t.ink3 }}>{fmtDate(trendSeries[trendSeries.length - 1].t)}</Text>
                      </View>
                    </>
                }
              </Card>
            )}
            {openInv.impression && (
              <Card style={{ backgroundColor: t.surface2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Impression / Notes</Text>
                <Text style={{ fontSize: 13, color: t.ink2 }}>{openInv.impression}</Text>
              </Card>
            )}
          </View>
        )}
      </Sheet>

      {/* Labs upload: pick source */}
      <Sheet open={showLabPick} onClose={() => !uploadBusy && setShowLabPick(false)} title="Upload lab result"
        footer={<Button variant="outline" onPress={() => setShowLabPick(false)} disabled={uploadBusy} fullWidth>Cancel</Button>}
      >
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 12, color: t.ink3 }}>
            Take or pick a clear photo of the lab report. AI extracts test name, values, and reference ranges, and attaches the image.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="primary" icon="camera" onPress={() => handleLabUpload('camera')} loading={uploadBusy} disabled={uploadBusy} style={{ flex: 1, paddingVertical: 14 }}>Take photo</Button>
            <Button variant="outline" icon="fileText" onPress={() => handleLabUpload('gallery')} loading={uploadBusy} disabled={uploadBusy} style={{ flex: 1, paddingVertical: 14 }}>From gallery</Button>
          </View>
          {uploadBusy && <Text style={{ fontSize: 11, color: t.ink3, textAlign: 'center' }}>Uploading and analyzing — this can take ~10 seconds.</Text>}
        </View>
      </Sheet>

      {/* Imaging / Cardiology: manual upload with notes */}
      <Sheet open={showManual} onClose={() => !uploadBusy && setShowManual(false)}
        title={tab === 'cardio' ? 'Add cardiology study' : 'Add imaging study'}
        footer={<>
          <Button variant="outline" onPress={() => setShowManual(false)} disabled={uploadBusy}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={handleManualSave} loading={uploadBusy} disabled={uploadBusy}>Save</Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <Field label="Study / Title" placeholder="e.g. CT Head, Chest X-Ray" value={manualTitle} onChangeText={setManualTitle} />
          <Field label="Notes / Findings" placeholder="Impression or findings" multiline numberOfLines={3} style={{ minHeight: 72, textAlignVertical: 'top' }} value={manualNotes} onChangeText={setManualNotes} />
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Image (optional)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" icon="camera" onPress={() => handleManualPick('camera')} disabled={uploadBusy} style={{ flex: 1 }}>Camera</Button>
              <Button variant="outline" icon="fileText" onPress={() => handleManualPick('gallery')} disabled={uploadBusy} style={{ flex: 1 }}>Gallery</Button>
            </View>
            {manualAsset && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon name="check_circle" size={14} color={t.okFg} />
                <Text style={{ fontSize: 12, color: t.ink2 }} numberOfLines={1}>{manualAsset.fileName || 'Image selected'}</Text>
              </View>
            )}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    paddingRight: 6,
  },
  paramFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
});
