import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Linking, Pressable } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtDate, fmtTime, Patient } from '../../data/mockICU';
import { Card, CardHead } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { TabRail } from '../../components/Tabs';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

// ICU ward-round systems (system-by-system format).
const SYSTEMS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'neuro', label: 'Neuro / Sedation', hint: 'GCS, RASS, sedation, pain…' },
  { key: 'resp', label: 'Respiratory', hint: 'Mode, FiO₂, ABG, wean plan…' },
  { key: 'cvs', label: 'Cardiovascular', hint: 'Rhythm, MAP, pressors…' },
  { key: 'renal', label: 'Renal / Fluids', hint: 'UO, balance, creatinine, RRT…' },
  { key: 'git', label: 'GI / Nutrition', hint: 'Feed, bowels, PPI…' },
  { key: 'id', label: 'Infection / Antibiotics', hint: 'Temp, WBC, cultures, Abx day…' },
];

type SystemsMap = Record<string, string>;

interface RoundData {
  kind: 'ROUND';
  tourType: 'MORNING' | 'NIGHT';
  vitals?: { hr?: number; sys?: number; dia?: number; spo?: number; temp?: number; rr?: number; rbs?: number; at?: string };
  infusions?: Array<{ name: string; rate: string; dose: string }>;
  details?: string;   // main free-text write-up
  systems?: SystemsMap;
  plan?: string;
}

const emptySystems = (): SystemsMap => SYSTEMS.reduce((a, s) => ({ ...a, [s.key]: '' }), {});

export function RoundsTab({ patient, userRole }: { patient: Patient; userRole: string }) {
  const t = useTokens();
  const ICU = useICU();
  const r = useICU(s => s.liveReadings[patient.id]);

  const [rounds, setRounds] = useState<api.RealNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [printId, setPrintId] = useState<string | null>(null);

  const [tourType, setTourType] = useState<'MORNING' | 'NIGHT'>('MORNING');
  const [details, setDetails] = useState('');
  const [systems, setSystems] = useState<SystemsMap>(emptySystems());
  const [plan, setPlan] = useState('');

  // Auto-filled snapshot captured when the round is opened.
  const activeInfusions = useMemo(() =>
    patient.medications
      .filter(m => m.active && (m.route === 'Infusion' || m.freq === 'Infusion'))
      .map(m => ({ name: m.name, rate: m.rate && m.rate !== '—' ? String(m.rate) : '—', dose: m.dose || '' })),
    [patient.medications]);

  const load = async () => {
    if (ICU.mode !== 'live') { setRounds([]); setLoading(false); return; }
    setLoading(true);
    try {
      const notes = await api.getNotes(patient.id);
      setRounds(notes.filter(n => n?.data && (n.data as any).kind === 'ROUND'));
    } catch {
      // silent — empty list
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patient.id]);

  const openAdd = () => {
    setTourType(new Date().getHours() < 17 ? 'MORNING' : 'NIGHT');
    setDetails('');
    setSystems(emptySystems());
    setPlan('');
    setShowAdd(true);
  };

  const snapshot = (): RoundData['vitals'] => r
    ? { hr: r.hr, sys: r.sys, dia: r.dia, spo: r.spo, temp: r.temp, rr: r.rr, rbs: r.rbs, at: new Date(r.t).toISOString() }
    : undefined;

  const save = async () => {
    const u = ICU.user;
    if (!u) { ICU.pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
    if (ICU.mode !== 'live') { ICU.pushToast({ tone: 'warn', msg: 'Switch to Live mode to save' }); return; }
    setBusy(true);
    try {
      const data: RoundData = {
        kind: 'ROUND', tourType,
        vitals: snapshot(),
        infusions: activeInfusions,
        details: details.trim(),
        systems, plan: plan.trim(),
      };
      const content = (details.trim() ? [details.trim()] : [])
        .concat(SYSTEMS
          .filter(s => (systems[s.key] || '').trim())
          .map(s => `${s.label}: ${systems[s.key].trim()}`))
        .concat(plan.trim() ? [`Assessment & Plan: ${plan.trim()}`] : [])
        .join('\n');
      await api.createNote({
        patientId: patient.id, authorId: u.id, type: 'PROGRESS',
        title: tourType === 'MORNING' ? 'Morning Round' : 'Night Round',
        content: content || `${tourType === 'MORNING' ? 'Morning' : 'Night'} round`,
        data,
      });
      ICU.pushToast({ tone: 'ok', msg: 'Round saved' });
      setShowAdd(false);
      load();
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Failed to save round' });
    } finally {
      setBusy(false);
    }
  };

  const printRound = async (round: api.RealNote) => {
    setPrintId(round.id);
    try {
      const html = buildRoundHtml(patient, round);
      const hosted = await api.hostReport(html, `round-${patient.mrn || patient.id}`);
      await Linking.openURL(getFileUrl(hosted.url));
      ICU.pushToast({ tone: 'info', msg: 'Opened round — tap ⋮ → Print → Save as PDF' });
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Print failed' });
    } finally {
      setPrintId(null);
    }
  };

  const vLine = (v?: RoundData['vitals']) => v
    ? `HR ${v.hr ?? '—'} · BP ${v.sys ?? '—'}/${v.dia ?? '—'} · SpO₂ ${v.spo ?? '—'}% · T ${v.temp ?? '—'}°${v.rr ? ` · RR ${v.rr}` : ''}${v.rbs ? ` · RBS ${v.rbs}` : ''}`
    : 'No vitals on record';

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Rounds · الجولة</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{rounds.length} round{rounds.length === 1 ? '' : 's'} recorded</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={openAdd}>Add round</Button>
      </View>

      {loading
        ? <Card><Text style={{ textAlign: 'center', color: t.ink3, paddingVertical: 16 }}>Loading…</Text></Card>
        : rounds.length === 0
          ? <Card><Text style={{ textAlign: 'center', color: t.ink3, paddingVertical: 16 }}>No rounds yet. Tap “Add round”.</Text></Card>
          : <View style={{ gap: 8 }}>
              {rounds.map(round => {
                const d = (round.data || {}) as RoundData;
                const morning = d.tourType === 'MORNING';
                const open = expandedId === round.id;
                return (
                  <Card key={round.id} style={{ padding: 14 }}>
                    <Pressable onPress={() => setExpandedId(open ? null : round.id)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pill tone={morning ? 'warn' : 'info'}>
                          <Text style={{ color: morning ? t.warnFg : t.infoFg, fontSize: 11, fontWeight: '700' }}>
                            {morning ? '☀ Morning' : '🌙 Night'}
                          </Text>
                        </Pill>
                        <Text style={{ fontSize: 12, color: t.ink3, marginLeft: 'auto' }}>
                          {fmtDate(round.createdAt)} {fmtTime(round.createdAt)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: t.ink3, marginTop: 6 }}>{vLine(d.vitals)}</Text>
                      <Text style={{ fontSize: 10, color: t.ink4, marginTop: 2 }}>By {round.author?.name || '—'}</Text>
                    </Pressable>

                    {open && (
                      <View style={{ marginTop: 10, gap: 6 }}>
                        {d.infusions && d.infusions.length > 0 && (
                          <Text style={{ fontSize: 12, color: t.ink2 }}>
                            <Text style={{ fontWeight: '700' }}>Infusions: </Text>
                            {d.infusions.map(i => `${i.name} (${i.rate})`).join(' · ')}
                          </Text>
                        )}
                        {(d.details || '').trim() ? (
                          <Text style={{ fontSize: 13, color: t.ink }}>{d.details}</Text>
                        ) : null}
                        {SYSTEMS.map(s => (d.systems?.[s.key] || '').trim() ? (
                          <Text key={s.key} style={{ fontSize: 12, color: t.ink2 }}>
                            <Text style={{ fontWeight: '700' }}>{s.label}: </Text>{d.systems![s.key]}
                          </Text>
                        ) : null)}
                        {d.plan ? (
                          <Text style={{ fontSize: 12, color: t.ink2 }}>
                            <Text style={{ fontWeight: '700' }}>Assessment & Plan: </Text>{d.plan}
                          </Text>
                        ) : null}
                        <Button size="sm" variant="outline" icon="printer" loading={printId === round.id}
                          onPress={() => printRound(round)} style={{ marginTop: 6 }}>
                          Print round
                        </Button>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
      }

      {/* Add round sheet */}
      <Sheet open={showAdd} onClose={() => !busy && setShowAdd(false)} title="New round · جولة جديدة"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={save} loading={busy} disabled={busy}>Save round</Button>
        </>}
      >
        <ScrollView style={{ maxHeight: 520 }}>
          <View style={{ gap: 12 }}>
            <TabRail value={tourType} onChange={(v) => setTourType(v as any)} items={[
              { value: 'MORNING', label: '☀ Morning' }, { value: 'NIGHT', label: '🌙 Night' },
            ]} />

            {/* Auto-filled snapshot */}
            <View style={{ backgroundColor: t.surface2, borderRadius: 12, padding: 12, gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, letterSpacing: 0.6 }}>AUTO-FILLED SNAPSHOT</Text>
              <Text style={{ fontSize: 13, color: t.ink, fontWeight: '600' }}>{vLine(snapshot())}</Text>
              <Text style={{ fontSize: 12, color: t.ink2 }}>
                <Text style={{ fontWeight: '700' }}>Infusions: </Text>
                {activeInfusions.length ? activeInfusions.map(i => `${i.name} (${i.rate})`).join(' · ') : 'none'}
              </Text>
              <Text style={{ fontSize: 10, color: t.ink4 }}>Captured from the latest chart data — included automatically in the printed round.</Text>
            </View>

            {/* Main free-text round write-up */}
            <Field label="Round details · تفاصيل الجولة" placeholder="Write the round in detail here…" multiline numberOfLines={6}
              style={{ minHeight: 130, textAlignVertical: 'top' }} value={details} onChangeText={setDetails} />

            <Text style={{ fontSize: 11, color: t.ink3, marginTop: 2 }}>
              Optionally break it down by system below.
            </Text>

            {SYSTEMS.map(s => (
              <Field key={s.key} label={s.label} placeholder={s.hint} multiline numberOfLines={2}
                style={{ minHeight: 54, textAlignVertical: 'top' }}
                value={systems[s.key]} onChangeText={(v) => setSystems(p => ({ ...p, [s.key]: v }))} />
            ))}

            <Field label="Assessment & Plan" placeholder="Impression + today’s plan / tasks…" multiline numberOfLines={4}
              style={{ minHeight: 96, textAlignVertical: 'top' }} value={plan} onChangeText={setPlan} />
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
}

// A4 ward-round document (hosted + opened in the browser to print / save PDF).
function buildRoundHtml(patient: Patient, round: api.RealNote): string {
  const d = (round.data || {}) as RoundData;
  const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
  const nl = (s: string) => esc(s).replace(/\n/g, '<br>');
  const v = d.vitals;
  const vLine = v
    ? `HR ${v.hr ?? '—'} &middot; BP ${v.sys ?? '—'}/${v.dia ?? '—'} &middot; SpO₂ ${v.spo ?? '—'}% &middot; Temp ${v.temp ?? '—'}°C${v.rr ? ` &middot; RR ${v.rr}` : ''}${v.rbs ? ` &middot; RBS ${v.rbs}` : ''}`
    : '—';
  const inf = (d.infusions && d.infusions.length)
    ? d.infusions.map(i => `${esc(i.name)} (${esc(i.rate)})`).join(' &middot; ') : '—';
  const created = new Date(round.createdAt).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const sysRows = SYSTEMS
    .map(s => (d.systems?.[s.key] || '').trim()
      ? `<h2>${esc(s.label)}</h2><div class="box">${nl(d.systems![s.key])}</div>` : '')
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>ICU Round — ${esc(patient.name)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color:#0f172a; margin:0; }
  h1 { font-size:20px; margin:0 0 2px; }
  .badge { display:inline-block; font-size:12px; font-weight:700; padding:2px 12px; border-radius:99px; }
  .m { background:#fef9c3; color:#854d0e; } .n { background:#e0e7ff; color:#3730a3; }
  .sub { font-size:12px; color:#64748b; margin:6px 0 14px; }
  .meta { display:flex; flex-wrap:wrap; gap:18px; font-size:12px; color:#334155; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:12px; }
  .meta b { color:#0f172a; }
  .snap { background:#f1f5f9; border-radius:8px; padding:10px 12px; font-size:13px; margin-bottom:12px; }
  .snap .l { font-weight:700; color:#334155; }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#334155; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin:14px 0 6px; }
  .box { font-size:13px; line-height:1.5; color:#1e293b; white-space:pre-wrap; }
  .foot { margin-top:26px; font-size:10px; color:#94a3b8; text-align:center; }
</style></head>
<body>
  <h1>ICU Ward Round <span class="badge ${d.tourType === 'MORNING' ? 'm' : 'n'}">${d.tourType === 'MORNING' ? '☀ Morning' : '🌙 Night'}</span></h1>
  <div class="sub">${created}</div>
  <div class="meta">
    <span><b>Patient:</b> ${esc(patient.name)}</span>
    <span><b>MRN:</b> ${esc(patient.mrn)}</span>
    <span><b>Age/Sex:</b> ${esc(patient.age)} / ${esc(patient.gender)}</span>
    ${patient.bed ? `<span><b>Bed:</b> ${esc(patient.bed)}</span>` : ''}
    <span><b>Doctor:</b> ${esc(round.author?.name || '—')}</span>
  </div>
  ${patient.comorbidities?.length ? `<div class="snap"><span class="l">PMH:</span> ${esc(patient.comorbidities.join(', '))}</div>` : ''}
  <div class="snap">
    <div><span class="l">Vitals:</span> ${vLine}</div>
    <div><span class="l">Active infusions:</span> ${inf}</div>
  </div>
  ${d.details && d.details.trim() ? `<h2>Round</h2><div class="box">${nl(d.details)}</div>` : ''}
  ${sysRows}
  ${d.plan ? `<h2>Assessment &amp; Plan</h2><div class="box">${nl(d.plan)}</div>` : ''}
  <div class="foot">ICU Manager — Confidential Clinical Document</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 600);</script>
</body></html>`;
}
