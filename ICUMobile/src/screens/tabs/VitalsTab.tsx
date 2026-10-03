import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ScrollView } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtTime, fmtDate, fmtAgo, Patient } from '../../data/mockICU';
import { Card, CardHead } from '../../components/Card';
import { VitalTile } from '../../components/VitalTile';
import { LineChart } from '../../components/LineChart';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { PrintIntervalPicker, filterByInterval, intervalLabel, PrintInterval } from '../../components/PrintIntervalPicker';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

const EMPTY_READING = { hr: 0, sys: 0, dia: 0, spo: 0, temp: 0, rr: 0, rbs: 0, t: new Date() };

export function VitalsTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  // Always have a safe default — liveReadings may not be populated yet on first open
  const r = useICU(s => s.liveReadings[patient.id]) || EMPTY_READING;
  const ICU = useICU();
  const [printBusy, setPrintBusy] = useState(false);
  const [printInterval, setPrintInterval] = useState<PrintInterval>(12);
  const [customHours, setCustomHours] = useState('');

  // ── Print vitals report → host HTML on server → open http URL in browser ──
  // Opening an http(s) page (not a data: URI) lets Chrome reliably Print / Save-as-PDF.
  const handlePrint = async () => {
    setPrintBusy(true);
    try {
      const windowed = filterByInterval(patient.vitals, printInterval);
      // Cap to keep the report reasonable if a huge window is chosen
      const rows = windowed.slice(-500);
      const label = intervalLabel(printInterval);
      const html = buildVitalsReportHtml(patient, rows, label);
      const hosted = await api.hostReport(html, `vitals-${patient.mrn || patient.id}`);
      const url = getFileUrl(hosted.url);
      await Linking.openURL(url);
      setShowPrint(false);
      ICU.pushToast({ tone: 'info', msg: 'Opened report — tap ⋮ → Print → Save as PDF' });
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Print failed' });
    } finally {
      setPrintBusy(false);
    }
  };
  const [chart, setChart] = useState<'hr' | 'spo' | 'bp' | 'temp' | 'rr'>('hr');
  const [showEntry, setShowEntry] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [entry, setEntry] = useState<Record<string, string>>({});
  const [drugRates, setDrugRates] = useState<Record<string, string>>({});
  const printCount = filterByInterval(patient.vitals, printInterval).length;

  // Charted alongside vitals: every active drug whose MAR route of administration
  // is "Infusion". Their ml/hr rate is recorded, and feeds the I/O intake.
  const infusionMeds = patient.medications.filter(m => m.active && (m.route === 'Infusion' || m.freq === 'Infusion'));

  // Chronological ml/hr rates charted per infusion drug, drawn from its MAR history.
  const infusionRateHistory = infusionMeds.map(m => ({
    m,
    points: (m.history || [])
      .map(h => ({ t: new Date(h.t).getTime(), rate: parseFloat((h.dose || '').match(/[\d.]+/)?.[0] || '') }))
      .filter(p => Number.isFinite(p.rate) && Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t),
  }));

  // Rate charted nearest a given vital's time (within 30 min), else '—'.
  const rateAt = (points: { t: number; rate: number }[], time: number) => {
    let best: { t: number; rate: number } | null = null;
    for (const p of points) {
      if (best === null || Math.abs(p.t - time) < Math.abs(best.t - time)) best = p;
    }
    if (!best) return '—';
    return Math.abs(best.t - time) <= 30 * 60_000 ? String(best.rate) : '—';
  };

  // Ensure meds are loaded so support infusions appear even if Vitals is opened first.
  useEffect(() => {
    if (ICU.mode === 'live' && patient.medications.length === 0) {
      ICU.loadMar(patient.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const last24 = patient.vitals.slice(-24);
  const ranges: Record<string, { values: number[]; color: string; label: string; ref: [number, number] }> = {
    hr: { values: last24.map(v => v.hr), color: t.sigHr, label: 'Heart rate · bpm', ref: [60, 100] },
    spo: { values: last24.map(v => v.spo), color: t.sigSpo, label: 'SpO₂ · %', ref: [94, 100] },
    bp: { values: last24.map(v => v.sys), color: t.sigBp, label: 'Systolic BP · mmHg', ref: [100, 140] },
    temp: { values: last24.map(v => v.temp), color: t.sigTemp, label: 'Temperature · °C', ref: [36.5, 37.5] },
    rr: { values: last24.map(v => v.rr), color: t.sigRr, label: 'Respiratory rate', ref: [12, 20] },
  };
  const cur = ranges[chart];

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Vital Signs</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>Real-time monitoring · last {patient.vitals.length} readings</Text>
        </View>
        <Button size="icon-sm" variant="outline" icon="printer" onPress={() => setShowPrint(true)} />
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowEntry(true)}>Add</Button>
      </View>

      {/* Big live tiles */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><VitalTile label="Heart rate" value={r.hr} unit="bpm" icon="heart" signal="sigHr" big blip /></View>
        <View style={{ flex: 1 }}><VitalTile label="SpO₂" value={r.spo} unit="%" icon="droplet" signal="sigSpo" big blip /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><VitalTile label="Blood pressure" value={`${r.sys}/${r.dia}`} unit="mmHg" icon="activity" signal="sigBp" big /></View>
        <View style={{ flex: 1 }}><VitalTile label="Temperature" value={String(r.temp)} unit="°C" icon="thermo" signal="sigTemp" big /></View>
      </View>

      {/* Trend chart */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>{cur.label}</Text>
            <Text style={{ fontSize: 11, color: t.ink3 }}>Ref {cur.ref[0]}–{cur.ref[1]}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {(['hr', 'spo', 'bp', 'temp', 'rr'] as const).map(k => (
              <Pressable key={k} onPress={() => setChart(k)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: chart === k ? t.accentSoft : 'transparent',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: chart === k ? t.accentInk : t.ink3 }}>
                  {k === 'spo' ? 'SpO₂' : k === 'temp' ? 'T' : k.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <LineChart series={[{ values: cur.values, color: cur.color }]} refRange={cur.ref} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 10, color: t.ink3 }}>{fmtAgo(last24[0]?.t || new Date())} ago</Text>
          <Text style={{ fontSize: 10, color: t.ink3 }}>now</Text>
        </View>
      </Card>

      {/* History table — horizontally scrollable so infusion-rate columns fit on narrow screens */}
      <Card tight>
        <CardHead title="History" subtitle={`${patient.vitals.length} entries`} icon="clipboard" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[styles.headRow, { borderBottomColor: t.line }]}>
              <Text style={[styles.th, { color: t.ink3, width: 104 }]}>Time</Text>
              <Text style={[styles.th, { color: t.ink3, width: 36 }]}>HR</Text>
              <Text style={[styles.th, { color: t.ink3, width: 60 }]}>BP</Text>
              <Text style={[styles.th, { color: t.ink3, width: 40 }]}>SpO₂</Text>
              <Text style={[styles.th, { color: t.ink3, width: 36 }]}>T</Text>
              <Text style={[styles.th, { color: t.ink3, width: 28 }]}>RR</Text>
              {infusionRateHistory.map(({ m }) => (
                <Text key={m.id} numberOfLines={1} style={[styles.th, { color: t.accentInk, width: 64 }]}>{m.name}</Text>
              ))}
            </View>
            {[...patient.vitals].reverse().slice(0, 30).map(v => {
              const vt = new Date(v.t).getTime();
              return (
                <View key={v.id} style={[styles.row, { borderTopColor: t.line }]}>
                  <Text style={[styles.td, { color: t.ink2, width: 104 }]}>{fmtDate(v.t)} · {fmtTime(v.t)}</Text>
                  <Text style={[styles.td, { color: t.sigHr, width: 36 }]}>{v.hr}</Text>
                  <Text style={[styles.td, { color: t.sigBp, width: 60 }]}>{v.sys}/{v.dia}</Text>
                  <Text style={[styles.td, { color: t.sigSpo, width: 40 }]}>{v.spo}</Text>
                  <Text style={[styles.td, { color: t.sigTemp, width: 36 }]}>{v.temp}</Text>
                  <Text style={[styles.td, { color: t.sigRr, width: 28 }]}>{v.rr}</Text>
                  {infusionRateHistory.map(({ m, points }) => (
                    <Text key={m.id} style={[styles.td, { color: t.accentInk, width: 64 }]}>{rateAt(points, vt)}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      {/* Add vitals sheet */}
      <Sheet open={showEntry} onClose={() => setShowEntry(false)} title="Add vitals"
        footer={<>
          <Button variant="outline" onPress={() => setShowEntry(false)}>Cancel</Button>
          <Button variant="primary" onPress={async () => {
            // Defensive parser: reject any non-finite input (letters, NaN, "N", "--")
            // instead of letting it reach the backend, which would surface as
            // "invalid number formatting character N".
            const parseNum = (raw: any): number | undefined => {
              if (raw == null) return undefined;
              const s = String(raw).trim();
              if (s === '' || s === 'NaN' || s === '--') return undefined;
              const n = Number(s);
              return Number.isFinite(n) ? n : undefined;
            };

            // Collect any field with a typed value that didn't parse — show error.
            const bad: string[] = [];
            const validated: Record<string, number | undefined> = {};
            (['hr','sys','dia','spo','temp','rbs','rr'] as const).forEach(k => {
              const raw = entry[k];
              if (raw == null || String(raw).trim() === '') {
                validated[k] = undefined;
                return;
              }
              const n = parseNum(raw);
              if (n === undefined) bad.push(k.toUpperCase());
              else validated[k] = n;
            });
            if (bad.length > 0) {
              ICU.pushToast({ tone: 'crit', msg: `Invalid number for ${bad.join(', ')}` });
              return;
            }
            // Infusion rates (ml/hr) charted per infusion drug → recorded as an
            // administration; the volume since the last charted rate feeds the I/O intake.
            const rateEntries = infusionMeds
              .map(m => ({ m, rate: (drugRates[m.id] || '').trim() }))
              .filter(x => x.rate !== '' && Number.isFinite(Number(x.rate)) && Number(x.rate) > 0);

            // Did the user actually type any vital sign (vs. only an infusion rate)?
            const anyVitalTyped = (['hr', 'sys', 'dia', 'spo', 'temp', 'rbs', 'rr'] as const)
              .some(k => entry[k] != null && String(entry[k]).trim() !== '');

            if (!anyVitalTyped && rateEntries.length === 0) {
              ICU.pushToast({ tone: 'crit', msg: 'Enter a vital sign or an infusion rate' });
              return;
            }

            // Core vitals are required only when recording a vitals row. A rate-only entry
            // (just charting an infusion) skips this so the rate can be logged on its own.
            if (anyVitalTyped) {
              const required: Array<[keyof typeof validated, string]> = [
                ['hr', 'Pulse'], ['spo', 'SpO₂'], ['sys', 'BP Sys'], ['dia', 'BP Dia'], ['temp', 'Temp'],
              ];
              const missing = required.filter(([k]) => validated[k] === undefined).map(([, l]) => l);
              if (missing.length > 0) {
                ICU.pushToast({ tone: 'crit', msg: `Required: ${missing.join(', ')}` });
                return;
              }
              if (validated.hr !== undefined && (validated.hr <= 0 || validated.hr > 300)) {
                ICU.pushToast({ tone: 'crit', msg: 'HR out of range (1–300)' });
                return;
              }
              if (validated.spo !== undefined && (validated.spo < 0 || validated.spo > 100)) {
                ICU.pushToast({ tone: 'crit', msg: 'SpO₂ out of range (0–100)' });
                return;
              }
            }

            const payload = {
              hr: validated.hr,
              sys: validated.sys,
              dia: validated.dia,
              spo: validated.spo,
              temp: validated.temp,
              rbs: validated.rbs,
              rr: validated.rr,
            };

            setShowEntry(false);
            setEntry({});
            setDrugRates({});
            if (ICU.mode === 'live') {
              if (anyVitalTyped) await ICU.addVitalLive(patient.id, payload);
              const u = ICU.user;
              if (u && rateEntries.length) {
                for (const { m, rate } of rateEntries) {
                  try {
                    // Volume infused since the last charted rate = prevRate × elapsed hours.
                    const prev = (m.history || [])
                      .map(h => ({ r: parseFloat((h.dose || '').match(/[\d.]+/)?.[0] || ''), t: new Date(h.t).getTime() }))
                      .filter(x => Number.isFinite(x.r))
                      .sort((a, b) => b.t - a.t)[0];
                    await api.administerMedication({ patientId: patient.id, medicationId: m.id, status: 'Given', dose: `${rate} ml/hr`, userId: u.id });
                    if (prev) {
                      const hours = (Date.now() - prev.t) / 3_600_000;
                      const vol = Math.round(prev.r * hours);
                      if (vol > 0 && hours > 0 && hours < 24) {
                        await api.addIO({ patientId: patient.id, userId: u.id, type: 'INPUT', category: `Infusion · ${m.name}`, amount: vol, notes: `${prev.r} ml/hr × ${hours.toFixed(1)}h` });
                      }
                    }
                  } catch { /* skip this drug on failure */ }
                }
                await Promise.all([ICU.loadMar(patient.id), ICU.loadIO(patient.id)]);
                ICU.pushToast({ tone: 'ok', msg: `Charted ${rateEntries.length} infusion rate${rateEntries.length === 1 ? '' : 's'}` });
              }
            } else {
              ICU.pushToast({ tone: 'ok', msg: 'Vitals recorded (demo)' });
            }
          }}>Add</Button>
        </>}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {([
            // Don't pre-fill with current ticker readings — that triggers React Native
            // to stringify NaN/undefined values like "NaN" into the TextInput, which
            // then round-trips back as the literal string "NaN" if user doesn't edit.
            ['hr', 'Pulse *', 'bpm'],
            ['spo', 'SpO₂ *', '%'],
            ['sys', 'BP Sys *', 'mmHg'],
            ['dia', 'BP Dia *', 'mmHg'],
            ['temp', 'Temp *', '°C'],
            ['rr', 'RR', '/min'],
            ['rbs', 'RBS', 'mg/dL'],
          ] as const).map(([key, l]) => (
            <View key={key} style={{ width: '47%' }}>
              <Field
                label={l}
                value={entry[key] ?? ''}
                placeholder=""
                keyboardType="decimal-pad"
                onChangeText={(text) => {
                  // Strip anything that isn't a digit, period, or leading minus.
                  const cleaned = text.replace(/[^0-9.\-]/g, '');
                  setEntry(prev => ({ ...prev, [key]: cleaned }));
                }}
              />
            </View>
          ))}
        </View>

        {/* Infusion drug rates — recorded as administrations + I/O; not in the printable chart */}
        {infusionMeds.length > 0 && (
          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Infusions · ml/hr
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {infusionMeds.map(m => (
                <View key={m.id} style={{ width: '47%' }}>
                  <Field
                    label={m.name}
                    value={drugRates[m.id] ?? ''}
                    placeholder="ml/hr"
                    keyboardType="decimal-pad"
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9.]/g, '');
                      setDrugRates(prev => ({ ...prev, [m.id]: cleaned }));
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </Sheet>

      {/* Print sheet → opens hosted HTML report in device browser → Print or Save-as-PDF */}
      <Sheet open={showPrint} onClose={() => !printBusy && setShowPrint(false)} title="Print vitals report"
        footer={<>
          <Button variant="outline" onPress={() => setShowPrint(false)} disabled={printBusy}>Cancel</Button>
          <Button variant="primary" icon="printer" onPress={handlePrint} loading={printBusy} disabled={printBusy}>
            {printBusy ? 'Preparing…' : 'Open report'}
          </Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <PrintIntervalPicker value={printInterval} onChange={setPrintInterval} customHours={customHours} onCustomChange={setCustomHours} />
          <Text style={{ fontSize: 12, color: t.ink3 }}>
            <Text style={{ fontWeight: '700' }}>{printCount}</Text> reading{printCount === 1 ? '' : 's'} in range · opens as an A4 report in your browser.
          </Text>
          <Text style={{ fontSize: 12, color: t.ink3 }}>
            Once it opens, tap the menu (⋮) → <Text style={{ fontWeight: '700' }}>Print</Text> → <Text style={{ fontWeight: '700' }}>Save as PDF</Text> or your printer.
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────

// Build a self-contained A4-styled HTML vitals report (no external resources needed).
function buildVitalsReportHtml(patient: Patient, vitals: Array<{ id: string; t: any; hr: number; sys: number; dia: number; spo: number; temp: number; rr: number; rbs: number }>, rangeLabel = 'All records'): string {
  const sorted = [...vitals].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  const fmtDT = (d: any) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'} as any)[c]);
  const rows = sorted.map(v => `
    <tr>
      <td>${fmtDT(v.t)}</td>
      <td>${v.hr || '—'}</td>
      <td>${v.sys || '—'}/${v.dia || '—'}</td>
      <td>${v.spo || '—'}</td>
      <td>${v.temp || '—'}</td>
      <td>${v.rr || '—'}</td>
      <td>${v.rbs || '—'}</td>
    </tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Vitals — ${esc(patient.name)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #0f172a; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #334155; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 18px; font-size: 10px; color: #94a3b8; }
  .meta { display: flex; gap: 24px; font-size: 11px; color: #475569; margin-bottom: 12px; }
  .meta b { color: #0f172a; }
</style></head>
<body>
  <h1>Vital Signs Report</h1>
  <div class="sub">${esc(patient.name)} · MRN ${esc(patient.mrn)} · Generated ${fmtDT(new Date())}</div>
  <div class="meta">
    <span><b>Age:</b> ${esc(patient.age)}</span>
    <span><b>Sex:</b> ${esc(patient.gender)}</span>
    ${patient.bed ? `<span><b>Bed:</b> ${esc(patient.bed)}</span>` : ''}
    <span><b>Range:</b> ${esc(rangeLabel)}</span>
    <span><b>Readings:</b> ${sorted.length}</span>
  </div>
  <table>
    <thead><tr><th>Time</th><th>HR</th><th>BP</th><th>SpO₂</th><th>Temp °C</th><th>RR</th><th>RBS</th></tr></thead>
    <tbody>${rows || '<tr><td colspan=\"7\" style=\"text-align:center;color:#94a3b8;padding:20px\">No vitals recorded</td></tr>'}</tbody>
  </table>
  <div class="footer">ICU Manager — printed from mobile app. Use the browser menu to print or save as PDF.</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 600);</script>
</body></html>`;
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1 },
  row: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1 },
  th: { fontSize: 11, fontWeight: '600' },
  td: { fontSize: 12 },
  optRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
