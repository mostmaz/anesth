import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtAgo, fmtDate, fmtTime, Patient } from '../../data/mockICU';
import { Card, CardHead } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { StatusBadge } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

export function OverviewTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const r = useICU(s => s.liveReadings[patient.id]);
  const balance = patient.fluidBalance;
  const net = balance.in12h - balance.out12h;
  // Active support = every drug whose MAR route of administration is "Infusion".
  const activeMeds = patient.medications
    .filter(m => m.active && (m.route === 'Infusion' || m.freq === 'Infusion'));

  const [dismissedLabs, setDismissedLabs] = useState<Set<string>>(new Set());
  const [ackBusy, setAckBusy] = useState(false);

  // Load user's previously-dismissed lab IDs (live mode only)
  useEffect(() => {
    if (ICU.mode !== 'live' || !ICU.user) return;
    let cancelled = false;
    api.getUserPreferences(ICU.user.id)
      .then(prefs => { if (!cancelled) setDismissedLabs(new Set(prefs?.dismissedLabs || [])); })
      .catch(() => { /* silent — alert just won't persist across reload */ });
    return () => { cancelled = true; };
  }, [ICU.mode, ICU.user]);

  const abnormalLabs = patient.investigations.filter(l => l.abnormal && !dismissedLabs.has(l.id));

  const acknowledge = async () => {
    if (ackBusy || abnormalLabs.length === 0) return;
    setAckBusy(true);
    const ids = abnormalLabs.map(l => l.id);
    // Optimistic local dismiss so the UI feels instant
    setDismissedLabs(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    try {
      if (ICU.mode === 'live' && ICU.user) {
        await Promise.all(ids.map(id => api.dismissLab(ICU.user!.id, id)));
      }
      ICU.pushToast({ tone: 'ok', msg: `Acknowledged ${ids.length}` });
    } catch (e: any) {
      // Roll back on failure
      setDismissedLabs(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Failed to acknowledge' });
    } finally {
      setAckBusy(false);
    }
  };

  const fullTimeline = useMemo(() => {
    const items: any[] = [];
    patient.orders.forEach(o => items.push({ id: `o-${o.id}`, t: o.t, title: o.title, kind: 'order', status: o.status, detail: `by ${o.by}` }));
    patient.medications.forEach(m => {
      if (m.startedAt) items.push({ id: `m-${m.id}`, t: m.startedAt, title: `Started ${m.name}`, kind: 'med', status: 'STARTED', detail: m.dose });
      m.history.forEach(h => items.push({
        id: `mh-${h.id}`,
        t: h.t,
        title: `${m.name} ${h.status.toLowerCase()}`,
        kind: 'med',
        status: h.status === 'Given' ? 'COMPLETED' : 'STOPPED',
        detail: `by ${h.by}`,
      }));
    });
    patient.investigations.forEach(l => items.push({ id: `l-${l.id}`, t: l.t, title: l.title, kind: 'inv', status: 'COMPLETED', detail: l.impression }));
    patient.interventions.forEach(i => items.push({ id: `iv-${i.id}`, t: i.t, title: i.title, kind: 'proc', status: i.status, detail: i.notes }));
    patient.notes.forEach(n => items.push({ id: `n-${n.id}`, t: n.t, title: n.title, kind: 'note', status: n.type, detail: `by ${n.by}` }));
    patient.io.forEach(e => items.push({ id: `io-${e.id}`, t: e.t, title: `${e.type === 'IN' ? 'Intake' : 'Output'} · ${e.cat}`, kind: 'io', status: '', detail: `${e.type === 'IN' ? '+' : '−'}${e.amount} ml` }));
    return items.sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  }, [patient]);
  const timeline = fullTimeline.slice(0, 10);
  const [showHistory, setShowHistory] = useState(false);

  // Discharge summary
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargeBusy, setDischargeBusy] = useState(false);
  const [dc, setDc] = useState({ diagnosis: '', course: '', meds: '', followUp: '' });

  const openDischarge = () => {
    const activeMedsList = patient.medications.filter(m => m.active).map(m => `• ${m.name} ${m.dose} ${m.route} ${m.freq}`).join('\n');
    setDc({ diagnosis: patient.diagnosis || '', course: '', meds: activeMedsList, followUp: '' });
    setShowDischarge(true);
  };

  const generateDischarge = async () => {
    setDischargeBusy(true);
    try {
      const html = buildDischargeHtml(patient, dc);
      // Save a DISCHARGE note (live) so it lands in the record, then open the printable doc.
      if (ICU.mode === 'live') {
        await ICU.createNoteLive(patient.id, {
          type: 'DISCHARGE', title: 'Discharge Summary',
          content: `Diagnosis: ${dc.diagnosis}\n\nHospital Course:\n${dc.course}\n\nDischarge Medications:\n${dc.meds}\n\nFollow-up:\n${dc.followUp}`,
        });
      }
      const hosted = await api.hostReport(html, `discharge-${patient.mrn || patient.id}`);
      await Linking.openURL(getFileUrl(hosted.url));
      setShowDischarge(false);
      ICU.pushToast({ tone: 'info', msg: 'Opened summary — tap ⋮ → Print → Save as PDF' });
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Failed to generate summary' });
    } finally {
      setDischargeBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* PMH chips */}
      {patient.comorbidities && patient.comorbidities.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.ink3, letterSpacing: 1.4, paddingVertical: 4 }}>PMH</Text>
          {patient.comorbidities.map(c => (
            <Pill key={c} tone="warn">
              <Text style={{ color: t.warnFg, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{c}</Text>
            </Pill>
          ))}
        </View>
      )}

      {/* Abnormal labs alert */}
      {abnormalLabs.length > 0 && (
        <Card style={{ backgroundColor: t.critBg, borderColor: t.sigHr }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: t.sigHr, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="alert" size={14} color="#ffffff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.critFg }}>Abnormal lab results</Text>
              <Text style={{ fontSize: 11, color: t.critFg, opacity: 0.85 }}>
                {abnormalLabs.length} pending review
              </Text>
            </View>
            <Button
              size="xs"
              variant="outline"
              style={{ backgroundColor: '#ffffff' }}
              textStyle={{ color: t.critFg }}
              onPress={acknowledge}
              disabled={ackBusy}
              loading={ackBusy}
            >
              {ackBusy ? 'Acknowledging…' : `Acknowledge${abnormalLabs.length > 1 ? ` (${abnormalLabs.length})` : ''}`}
            </Button>
          </View>
        </Card>
      )}

      {/* Top tile row: Vitals + 12h Balance */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card tight style={{ flex: 1 }}>
          <CardHead title="Vitals" subtitle={`${fmtAgo(r.t)} ago`} icon="activity" iconTone="info"
            right={<Pill tone="info"><Text style={{ color: t.infoFg, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>LIVE</Text></Pill>}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ width: '47%' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>BP</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: t.sigBp }}>{r.sys}/{r.dia}</Text>
            </View>
            <View style={{ width: '47%' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>HR</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: t.sigHr }}>{r.hr}</Text>
            </View>
            <View style={{ width: '47%' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>SPO₂</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: t.sigSpo }}>{r.spo}%</Text>
            </View>
            <View style={{ width: '47%' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>TEMP</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: t.sigTemp }}>{r.temp}°</Text>
            </View>
          </View>
        </Card>

        <Card tight style={{ flex: 1 }}>
          <CardHead title="12h Balance" subtitle="Net flow" icon="droplet" iconTone={net > 1500 ? 'warn' : 'info'} />
          <Text style={{
            fontSize: 28,
            fontWeight: '700',
            color: net > 0 ? t.sigSpo : t.sigTemp,
            letterSpacing: -0.5,
          }}>
            {net > 0 ? '+' : ''}{net} <Text style={{ fontSize: 12, color: t.ink3, fontWeight: '500' }}>ml</Text>
          </Text>
          <Text style={{ fontSize: 11, color: t.ink3, marginTop: 4 }}>
            In <Text style={{ fontWeight: '700', color: t.sigSpo }}>{balance.in12h}</Text> · Out <Text style={{ fontWeight: '700', color: t.sigTemp }}>{balance.out12h}</Text>
          </Text>
          <View style={[styles.barTrack, { backgroundColor: t.surface3 }]}>
            <View style={{ flex: balance.in12h, backgroundColor: t.sigSpo }} />
            <View style={{ flex: balance.out12h, backgroundColor: t.sigTemp }} />
          </View>
        </Card>
      </View>

      {/* Active support */}
      <Card tight>
        <CardHead title="Active support" subtitle={`${activeMeds.length || '0'} infusions running`} icon="syringe" iconTone="info" />
        {activeMeds.length === 0
          ? <Text style={{ textAlign: 'center', color: t.ink3, fontSize: 12, paddingVertical: 12 }}>No active support</Text>
          : <View style={{ gap: 8 }}>
              {activeMeds.map(m => {
                const overdue = m.days > m.duration;
                return (
                  <View key={m.id} style={[styles.infusionRow, { borderColor: t.line, backgroundColor: t.surface }]}>
                    <View style={{
                      width: 4, alignSelf: 'stretch', borderRadius: 2,
                      backgroundColor: overdue ? t.sigHr : t.accent,
                    }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>{m.name}</Text>
                        <Pill tone={overdue ? 'crit' : 'muted'}>D{m.days}</Pill>
                        <Pill tone="accent">{m.route}</Pill>
                      </View>
                      <Text style={{ fontSize: 11, color: t.ink3 }}>
                        {m.dose} · {m.rate}{m.dilution !== '—' ? ` · ${m.dilution}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
        }
      </Card>

      {/* Recent activity timeline */}
      <Card>
        <CardHead title="Recent activity" subtitle="Last 10 events" icon="clock" iconTone="info"
          right={<Button size="xs" variant="ghost" onPress={() => setShowHistory(true)}>Full history</Button>}
        />
        <View style={{ position: 'relative', paddingLeft: 20 }}>
          <View style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 1, backgroundColor: t.line }} />
          {timeline.length === 0
            ? <Text style={{ textAlign: 'center', fontSize: 12, color: t.ink3, paddingVertical: 8 }}>No recent activity</Text>
            : timeline.map(ev => {
                const kindColor = ({
                  med: t.accent,
                  order: '#a855f7',
                  inv: t.sigRr,
                  proc: t.sigTemp,
                } as Record<string, string>)[ev.kind] || t.ink3;
                return (
                  <View key={ev.id} style={{ paddingBottom: 12, position: 'relative' }}>
                    <View style={{
                      position: 'absolute', left: -19, top: 6,
                      width: 10, height: 10, borderRadius: 5,
                      backgroundColor: kindColor,
                      borderWidth: 2, borderColor: t.surface,
                    }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: t.ink, flexShrink: 1 }}>{ev.title}</Text>
                      <StatusBadge status={ev.status} />
                      <Text style={{ fontSize: 10, color: t.ink3, marginLeft: 'auto' }}>{fmtAgo(ev.t)} ago</Text>
                    </View>
                    {ev.detail ? <Text style={{ fontSize: 11, fontStyle: 'italic', color: t.ink3, marginTop: 2 }} numberOfLines={2}>{ev.detail}</Text> : null}
                  </View>
                );
              })
          }
        </View>
      </Card>

      {/* Discharge summary */}
      <Button variant="outline" icon="fileText" fullWidth onPress={openDischarge}>Discharge summary</Button>

      {/* Full history sheet */}
      <Sheet open={showHistory} onClose={() => setShowHistory(false)} title={`Full history · ${fullTimeline.length} events`}>
        <ScrollView style={{ maxHeight: 460 }}>
          <View style={{ position: 'relative', paddingLeft: 20 }}>
            <View style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 1, backgroundColor: t.line }} />
            {fullTimeline.map(ev => {
              const kindColor = ({ med: t.accent, order: '#a855f7', inv: t.sigRr, proc: t.sigTemp, note: t.sigSpo, io: t.sigBp } as Record<string, string>)[ev.kind] || t.ink3;
              return (
                <View key={ev.id} style={{ paddingBottom: 12, position: 'relative' }}>
                  <View style={{ position: 'absolute', left: -19, top: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: kindColor, borderWidth: 2, borderColor: t.surface }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: t.ink, flexShrink: 1 }}>{ev.title}</Text>
                    {ev.status ? <StatusBadge status={ev.status} /> : null}
                    <Text style={{ fontSize: 10, color: t.ink3, marginLeft: 'auto' }}>{fmtDate(ev.t)} {fmtTime(ev.t)}</Text>
                  </View>
                  {ev.detail ? <Text style={{ fontSize: 11, fontStyle: 'italic', color: t.ink3, marginTop: 2 }} numberOfLines={2}>{ev.detail}</Text> : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Sheet>

      {/* Discharge summary sheet */}
      <Sheet open={showDischarge} onClose={() => !dischargeBusy && setShowDischarge(false)} title="Discharge summary"
        footer={<>
          <Button variant="outline" onPress={() => setShowDischarge(false)} disabled={dischargeBusy}>Cancel</Button>
          <Button variant="primary" icon="printer" onPress={generateDischarge} loading={dischargeBusy} disabled={dischargeBusy}>Generate</Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <Field label="Diagnosis" value={dc.diagnosis} onChangeText={(v) => setDc(p => ({ ...p, diagnosis: v }))} />
          <Field label="Hospital course" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} value={dc.course} onChangeText={(v) => setDc(p => ({ ...p, course: v }))} />
          <Field label="Discharge medications" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} value={dc.meds} onChangeText={(v) => setDc(p => ({ ...p, meds: v }))} />
          <Field label="Follow-up" multiline numberOfLines={2} style={{ minHeight: 56, textAlignVertical: 'top' }} value={dc.followUp} onChangeText={(v) => setDc(p => ({ ...p, followUp: v }))} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 8,
  },
  infusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});

// A4 discharge-summary document (hosted + opened in the browser to print / save PDF).
function buildDischargeHtml(patient: Patient, dc: { diagnosis: string; course: string; meds: string; followUp: string }): string {
  const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
  const nl = (s: string) => esc(s).replace(/\n/g, '<br>');
  const now = new Date().toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Discharge Summary — ${esc(patient.name)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #0f172a; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  .meta { display: flex; flex-wrap: wrap; gap: 20px; font-size: 12px; color: #334155; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  .meta b { color: #0f172a; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 18px 0 8px; }
  p, .box { font-size: 13px; line-height: 1.5; color: #1e293b; white-space: pre-wrap; }
  .foot { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
</style></head>
<body>
  <h1>Discharge Summary</h1>
  <div class="sub">Generated ${now}</div>
  <div class="meta">
    <span><b>Patient:</b> ${esc(patient.name)}</span>
    <span><b>MRN:</b> ${esc(patient.mrn)}</span>
    <span><b>Age/Sex:</b> ${esc(patient.age)} / ${esc(patient.gender)}</span>
    ${patient.bed ? `<span><b>Bed:</b> ${esc(patient.bed)}</span>` : ''}
  </div>
  ${patient.comorbidities?.length ? `<h2>Past Medical History</h2><p>${esc(patient.comorbidities.join(', '))}</p>` : ''}
  <h2>Diagnosis</h2><div class="box">${nl(dc.diagnosis) || '—'}</div>
  <h2>Hospital Course</h2><div class="box">${nl(dc.course) || '—'}</div>
  <h2>Discharge Medications</h2><div class="box">${nl(dc.meds) || '—'}</div>
  <h2>Follow-up</h2><div class="box">${nl(dc.followUp) || '—'}</div>
  <div class="foot">ICU Manager — Confidential Clinical Document</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 600);</script>
</body></html>`;
}
