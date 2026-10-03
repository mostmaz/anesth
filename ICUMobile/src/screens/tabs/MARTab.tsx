import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtTime, fmtAgo, Patient, Medication } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { COMMON_ICU_DRUGS, DRUG_ROUTES, DRUG_FREQUENCIES, freqDisplay, freqTimesPerDay, doseSchedule, firstGivenAt } from '../../data/drugs';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

const sameDay = (d: Date | string) => new Date(d).toDateString() === new Date().toDateString();

export function MARTab({ patient, userRole }: { patient: Patient; userRole: string }) {
  const t = useTokens();
  const ICU = useICU();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [administeringId, setAdministeringId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [printBusy, setPrintBusy] = useState(false);

  // ── Print MAR → 7-day grid (matches web app) → host HTML → open in browser ──
  const handlePrintMAR = async () => {
    setPrintBusy(true);
    try {
      const nurse = ICU.users.find(u => u.id === patient.assignedNurseId)?.name || '';
      const html = buildMARReportHtml(patient, patient.medications, nurse);
      const hosted = await api.hostReport(html, `mar-${patient.mrn || patient.id}`);
      await Linking.openURL(getFileUrl(hosted.url));
      ICU.pushToast({ tone: 'info', msg: 'Opened MAR — tap ⋮ → Print → Save as PDF' });
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Print failed' });
    } finally {
      setPrintBusy(false);
    }
  };

  // Administer state
  const [adminDose, setAdminDose] = useState('');
  const [adminRate, setAdminRate] = useState('');
  const [adminDilution, setAdminDilution] = useState('');
  const [adminTime, setAdminTime] = useState(''); // "HH:MM" — actual give time, back-datable for late entries
  const [adminBusy, setAdminBusy] = useState(false);

  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const shiftHHMM = (minutes: number) => hhmm(new Date(Date.now() - minutes * 60 * 1000));
  // "HH:MM" → ISO. Assumes today; if in the future (23:50 charted 00:10) roll back a day.
  const timeToISO = (v: string): string | undefined => {
    const m2 = v.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m2) return undefined;
    const h = Number(m2[1]), mi = Number(m2[2]);
    if (h > 23 || mi > 59) return undefined;
    const d = new Date();
    d.setHours(h, mi, 0, 0);
    if (d.getTime() > Date.now() + 5 * 60 * 1000) d.setDate(d.getDate() - 1);
    return d.toISOString();
  };

  // Edit-medication state (SENIOR only)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eDose, setEDose] = useState('');
  const [eRoute, setERoute] = useState('IV');
  const [eFreq, setEFreq] = useState('OD (Once Daily)');
  const [eRate, setERate] = useState('');
  const [eInstructions, setEInstructions] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const openEdit = (id: string) => {
    const m = patient.medications.find(x => x.id === id);
    if (!m) return;
    setEDose(m.dose && m.dose !== '—' ? m.dose : '');
    setERoute(m.route || 'IV');
    setEFreq(m.freq || 'OD (Once Daily)');
    setERate(m.rate && m.rate !== '—' ? String(m.rate) : '');
    setEInstructions('');
    setEditingId(id);
  };

  // Add-medication form state
  const [aName, setAName] = useState('');
  const [aDose, setADose] = useState('');
  const [aRoute, setARoute] = useState('IV');
  const [aFreq, setAFreq] = useState('OD (Once Daily)');
  const [aRate, setARate] = useState('');
  const [aDilution, setADilution] = useState('');
  const [aDuration, setADuration] = useState('');
  const [aInstructions, setAInstructions] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const suggestions = useMemo(() => {
    const q = aName.toLowerCase().trim();
    if (!q) return COMMON_ICU_DRUGS.slice(0, 8);
    return COMMON_ICU_DRUGS.filter(d => d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [aName]);

  const resetAdd = () => {
    setAName(''); setADose(''); setARoute('IV'); setAFreq('OD (Once Daily)');
    setARate(''); setADilution(''); setADuration(''); setAInstructions('');
  };

  const openAdminister = (id: string) => {
    const m = patient.medications.find(x => x.id === id);
    setAdminDose(m?.dose && m.dose !== '—' ? m.dose : '');
    setAdminRate(m?.rate && m.rate !== '—' ? String(m.rate).replace(/[^0-9.]/g, '') : '');
    // Pre-fill dilution volume from the prescribed dilution if it's a plain number (ml).
    const presetDil = m?.dilution && m.dilution !== '—' ? String(m.dilution).match(/[\d.]+/)?.[0] : '';
    setAdminDilution(presetDil || '');
    setAdminTime(hhmm(new Date()));
    setAdministeringId(id);
  };

  // Infusion pause/resume — recorded as a Held ("Paused") / Given ("Resumed")
  // administration; paused state = the latest history entry's dose says "Paused".
  const isInfPaused = (m: Medication) => m.route === 'Infusion' && (m.history?.[0]?.dose || '').toLowerCase().includes('paus');
  const togglePauseInfusion = async (m: Medication) => {
    const u = ICU.user;
    if (!u) return;
    const paused = isInfPaused(m);
    try {
      await api.administerMedication({ patientId: patient.id, medicationId: m.id, status: paused ? 'Given' : 'Held', dose: paused ? 'Resumed' : 'Paused', userId: u.id });
      await ICU.loadMar(patient.id);
      ICU.pushToast({ tone: 'ok', msg: paused ? `${m.name} resumed` : `${m.name} paused` });
    } catch {
      ICU.pushToast({ tone: 'crit', msg: 'Failed to update infusion' });
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Medication Record</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>
            {patient.medications.filter(m => m.active).length} active · {patient.medications.length} total
          </Text>
        </View>
        <Button size="icon-sm" variant="outline" icon="printer" loading={printBusy} onPress={handlePrintMAR} />
        {(userRole === 'SENIOR' || userRole === 'RESIDENT') && (
          <Button size="sm" variant="primary" icon="plus" onPress={() => { resetAdd(); setShowAdd(true); }}>Add</Button>
        )}
      </View>

      {patient.medications.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No medications prescribed.</Text></Card>
        : <View style={{ gap: 10 }}>
            {patient.medications.map(m => {
              const overdue = m.days > m.duration;
              const isInfusion = m.route === 'Infusion' || m.freq === 'Infusion';
              const stripeColor = !m.active ? t.ink3 : overdue ? t.sigHr : isInfusion ? t.accent : t.sigRr;
              return (
                <Card key={m.id} style={{
                  padding: 0, overflow: 'hidden',
                  borderColor: m.active ? t.line : t.ink4,
                  opacity: m.active ? 1 : 0.65,
                }}>
                  <View style={{ flexDirection: 'row', padding: 14, gap: 12 }}>
                    <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, backgroundColor: stripeColor }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: t.ink }}>{m.name}</Text>
                        <Pill tone={m.active ? 'ok' : 'muted'}>{m.active ? 'Active' : 'Discontinued'}</Pill>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <Pill tone="accent">{m.route}</Pill>
                        {isInfPaused(m) && <Pill tone="warn">⏸ Paused</Pill>}
                        <Pill tone="muted">{freqDisplay(m.freq)}</Pill>
                        <Pill tone={overdue ? 'crit' : 'muted'}>D{m.days} / {m.duration}</Pill>
                        {m.active && (() => {
                          const n = freqTimesPerDay(m.freq);
                          if (!n) return null; // infusion / PRN — no fixed daily count
                          // Anchor the schedule on the first actual dose given; before any
                          // dose is charted, preview from the prescription time.
                          const anchor = firstGivenAt(m.history) || m.startedAt;
                          const notYetStarted = !firstGivenAt(m.history);
                          const times = doseSchedule(anchor, m.freq);
                          const givenToday = (m.history || []).filter(h => h.status === 'Given' && sameDay(h.t)).length;
                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                              {times.map((tm, i) => {
                                const done = i < givenToday;
                                return (
                                  <View key={i} style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, borderWidth: 1, borderStyle: (!done && notYetStarted) ? 'dashed' : 'solid', borderColor: done ? '#16a34a' : t.line2, backgroundColor: done ? '#16a34a' : 'transparent' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: done ? '#ffffff' : (notYetStarted ? t.ink4 : t.ink3) }}>{tm}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })()}
                      </View>
                      <Text style={{ fontSize: 12, color: t.ink2 }}>
                        <Text style={{ fontWeight: '700' }}>{m.dose}</Text>
                        {m.dilution !== '—' ? ` · ${m.dilution}` : ''}
                        {m.rate !== '—' ? ` · ${m.rate}` : ''}
                      </Text>
                      {m.history.length > 0 && (
                        <Text style={{ fontSize: 11, color: t.ink3, marginTop: 6 }}>
                          Last given <Text style={{ fontWeight: '700', color: t.ink2 }}>{fmtAgo(m.history[0].t)} ago</Text> by {m.history[0].by}
                        </Text>
                      )}
                    </View>
                  </View>
                  {m.active && (
                    <View style={{ flexDirection: 'row', gap: 6, padding: 14, paddingTop: 0, flexWrap: 'wrap' }}>
                      <Button size="xs" variant="success" icon="check" onPress={() => openAdminister(m.id)}>{isInfusion ? 'Start Infusion' : 'Administer'}</Button>
                      {isInfusion && (
                        <Button size="xs" variant="outline" onPress={() => togglePauseInfusion(m)}>
                          {isInfPaused(m) ? '▶ Resume' : '⏸ Pause'}
                        </Button>
                      )}
                      <Button size="xs" variant="outline" icon="clock" onPress={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                        History · {m.history.length}
                      </Button>
                      {userRole === 'SENIOR' && (
                        <Button size="xs" variant="outline" icon="edit" onPress={() => openEdit(m.id)}>Edit</Button>
                      )}
                      {(userRole === 'SENIOR' || userRole === 'RESIDENT') && (
                        <Button size="xs" variant="ghost" icon="x" color={t.sigHr} onPress={async () => {
                          if (ICU.mode === 'live') {
                            await ICU.discontinueMedLive(patient.id, m.id);
                          } else {
                            m.active = false;
                            ICU.pushToast({ tone: 'warn', msg: `${m.name} discontinued` });
                            ICU.bump();
                          }
                        }}>Stop</Button>
                      )}
                    </View>
                  )}
                  {expandedId === m.id && m.history.length > 0 && (
                    <View style={{ backgroundColor: t.surface2, borderTopWidth: 1, borderTopColor: t.line, paddingHorizontal: 14, paddingVertical: 8 }}>
                      {m.history.map(h => (
                        <View key={h.id} style={[styles.histRow, { borderBottomColor: t.line }]}>
                          <Text style={{ fontSize: 11, color: t.ink3, width: 60 }}>{fmtTime(h.t)}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '500', color: t.ink, width: 70 }}>{h.dose}</Text>
                          <Pill tone={h.status === 'Given' ? 'ok' : h.status === 'Missed' ? 'crit' : 'warn'}>{h.status}</Pill>
                          <Text style={{ fontSize: 11, color: t.ink3, marginLeft: 'auto' }}>{h.by}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
      }

      {/* Administer sheet */}
      <Sheet open={!!administeringId} onClose={() => !adminBusy && setAdministeringId(null)} title={(patient.medications.find(x => x.id === administeringId)?.route === 'Infusion') ? 'Start infusion' : 'Administer medication'}
        footer={<>
          <Button variant="outline" onPress={() => setAdministeringId(null)} disabled={adminBusy}>Cancel</Button>
          <Button variant="success" icon="check" loading={adminBusy} disabled={adminBusy} onPress={async () => {
            const m = patient.medications.find(x => x.id === administeringId);
            if (!m) { setAdministeringId(null); return; }
            const sedation = m.route === 'Infusion' || m.freq === 'Infusion';
            if (sedation) {
              const rate = Number(String(adminRate).replace(/[^0-9.]/g, ''));
              if (!Number.isFinite(rate) || rate <= 0) {
                ICU.pushToast({ tone: 'crit', msg: 'Enter the infusion rate (ml/hr)' });
                return;
              }
            }
            const recordedDose = sedation ? `${adminRate} ml/hr` : (adminDose || m.dose);
            // IV drugs: the dilution volume (ml) entered here is sent so the server records
            // it as an I/O intake. Non-IV routes don't contribute a fluid volume.
            const dilutionToSend = (!sedation && m.route === 'IV') ? adminDilution.trim() : undefined;
            setAdminBusy(true);
            try {
              if (ICU.mode === 'live') {
                await ICU.administerMedLive(patient.id, m.id, recordedDose, dilutionToSend || undefined, timeToISO(adminTime));
              } else {
                m.history.unshift({ id: 'h' + Date.now(), t: new Date(), status: 'Given', by: ICU.user!.name, dose: recordedDose });
                ICU.pushToast({ tone: 'ok', msg: 'Medication administered' });
                ICU.bump();
              }
            } finally {
              setAdminBusy(false);
              setAdministeringId(null);
            }
          }}>Confirm</Button>
        </>}
      >
        {administeringId && (() => {
          const m = patient.medications.find(x => x.id === administeringId)!;
          const sedation = m.route === 'Infusion' || m.freq === 'Infusion';
          return (
            <View style={{ gap: 10 }}>
              <View style={{ alignItems: 'center', padding: 12, backgroundColor: t.surface2, borderRadius: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: '600', color: t.ink }}>{m.name}</Text>
                <Text style={{ fontSize: 12, color: t.ink3, marginTop: 4 }}>{m.dose} · {m.route} · {m.freq}</Text>
              </View>
              <View>
                <Field
                  label="Time given (HH:MM)"
                  placeholder="e.g. 14:00"
                  keyboardType="numbers-and-punctuation"
                  value={adminTime}
                  onChangeText={setAdminTime}
                />
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {([['Now', 0], ['−15m', 15], ['−30m', 30], ['−1h', 60]] as Array<[string, number]>).map(([lbl, mins]) => (
                    <Pressable key={lbl} onPress={() => setAdminTime(shiftHHMM(mins))}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: t.ink2 }}>{lbl}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: t.ink3, marginTop: 6 }}>
                  If the drug was already given at the bedside, set the actual time — it will be recorded as a late entry.
                </Text>
              </View>
              {sedation ? (
                <>
                  <Text style={{ fontSize: 12, color: t.ink3 }}>
                    {m.name} is a continuous infusion — record the current rate.
                  </Text>
                  <Field
                    label="Rate (ml/hr) *"
                    placeholder="e.g. 8"
                    keyboardType="decimal-pad"
                    value={adminRate}
                    onChangeText={(txt) => setAdminRate(txt.replace(/[^0-9.]/g, ''))}
                  />
                </>
              ) : (
                <>
                  <Field label="Dose given" value={adminDose} onChangeText={setAdminDose} placeholder={m.dose} />
                  {m.route === 'IV' && (
                    <>
                      <Field
                        label="Dilution / Volume (mL)"
                        placeholder="Optional — e.g. 100"
                        keyboardType="decimal-pad"
                        value={adminDilution}
                        onChangeText={(txt) => setAdminDilution(txt.replace(/[^0-9.]/g, ''))}
                      />
                      <Text style={{ fontSize: 11, color: t.ink3 }}>
                        The volume entered is added as an Input on the I/O chart.
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>
          );
        })()}
      </Sheet>

      {/* Edit medication sheet — SENIOR only */}
      <Sheet open={!!editingId} onClose={() => !editBusy && setEditingId(null)} title="Edit medication"
        footer={<>
          <Button variant="outline" onPress={() => setEditingId(null)} disabled={editBusy}>Cancel</Button>
          <Button variant="primary" icon="check" loading={editBusy} disabled={editBusy} onPress={async () => {
            const m = patient.medications.find(x => x.id === editingId);
            if (!m) { setEditingId(null); return; }
            setEditBusy(true);
            try {
              if (ICU.mode === 'live') {
                await ICU.updateMedLive(patient.id, m.id, {
                  dose: eDose.trim() || undefined,
                  route: eRoute,
                  frequency: eFreq,
                  infusionRate: eRate.trim() || undefined,
                  otherInstructions: eInstructions.trim() || undefined,
                });
              } else {
                m.dose = eDose || m.dose; m.route = eRoute; m.freq = eFreq; m.rate = eRate || m.rate;
                ICU.pushToast({ tone: 'ok', msg: 'Medication updated (demo)' });
                ICU.bump();
              }
              setEditingId(null);
            } finally {
              setEditBusy(false);
            }
          }}>Save</Button>
        </>}
      >
        {editingId && (() => {
          const m = patient.medications.find(x => x.id === editingId);
          return (
            <View style={{ gap: 12 }}>
              <View style={{ alignItems: 'center', padding: 12, backgroundColor: t.surface2, borderRadius: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: t.ink }}>{m?.name}</Text>
                <Text style={{ fontSize: 11, color: t.ink3, marginTop: 2 }}>Editing order</Text>
              </View>
              <Field label="Dose" value={eDose} onChangeText={setEDose} placeholder="e.g. 1 g" />
              <View>
                <Text style={pickLabel(t)}>Route</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {DRUG_ROUTES.map(r => {
                    const on = eRoute === r;
                    return (
                      <Pressable key={r} onPress={() => setERoute(r)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accentSoft : t.surface }}>
                        <Text style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? t.accentInk : t.ink2 }}>{r}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View>
                <Text style={pickLabel(t)}>Frequency</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {DRUG_FREQUENCIES.map(f => {
                    const on = eFreq === f.value;
                    return (
                      <Pressable key={f.value} onPress={() => setEFreq(f.value)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accentSoft : t.surface }}>
                        <Text style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? t.accentInk : t.ink2 }}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Field label="Infusion rate" placeholder="e.g. 5 ml/hr" value={eRate} onChangeText={setERate} />
              <Field label="Instructions" placeholder="Optional" value={eInstructions} onChangeText={setEInstructions} />
            </View>
          );
        })()}
      </Sheet>

      {/* Add medication sheet — mirrors the web app */}
      <Sheet open={showAdd} onClose={() => !addBusy && setShowAdd(false)} title="Add medication"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)} disabled={addBusy}>Cancel</Button>
          <Button variant="primary" loading={addBusy} disabled={addBusy} onPress={async () => {
            if (!aName.trim()) { ICU.pushToast({ tone: 'crit', msg: 'Enter a drug name' }); return; }
            setAddBusy(true);
            try {
              if (ICU.mode === 'live') {
                await ICU.prescribeMedLive(patient.id, {
                  name: aName.trim(),
                  dose: aDose.trim() || undefined,
                  route: aRoute,
                  frequency: aFreq,
                  infusionRate: aRate.trim() || undefined,
                  dilution: aDilution ? parseFloat(aDilution) : undefined,
                  durationReminder: aDuration ? parseInt(aDuration, 10) : undefined,
                  otherInstructions: aInstructions.trim() || undefined,
                });
              } else {
                ICU.pushToast({ tone: 'ok', msg: 'Medication added (demo)' });
              }
              setShowAdd(false);
              resetAdd();
            } finally {
              setAddBusy(false);
            }
          }}>Add</Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <View>
            <Field label="Drug" placeholder="Type or pick a drug…" value={aName} onChangeText={setAName} />
            {aName.trim().length === 0 || !COMMON_ICU_DRUGS.some(d => d.name.toLowerCase() === aName.toLowerCase().trim()) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {suggestions.map(d => (
                  <Pressable
                    key={d.name}
                    onPress={() => { setAName(d.name); setADose(d.defaultDose); setARoute(d.defaultRoute); }}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: t.line2, backgroundColor: t.surface2 }}
                  >
                    <Text style={{ fontSize: 12, color: t.ink2 }}>{d.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <Field label="Dose" placeholder="e.g. 1 g, 500 mg" value={aDose} onChangeText={setADose} />

          <View>
            <Text style={pickLabel(t)}>Route</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {DRUG_ROUTES.map(r => {
                const on = aRoute === r;
                return (
                  <Pressable key={r} onPress={() => setARoute(r)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accentSoft : t.surface }}>
                    <Text style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? t.accentInk : t.ink2 }}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={pickLabel(t)}>Frequency</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {DRUG_FREQUENCIES.map(f => {
                const on = aFreq === f.value;
                return (
                  <Pressable key={f.value} onPress={() => setAFreq(f.value)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accentSoft : t.surface }}>
                    <Text style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? t.accentInk : t.ink2 }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Infusion rate" placeholder="e.g. 5 ml/hr" value={aRate} onChangeText={setARate} /></View>
            <View style={{ flex: 1 }}><Field label="Dilution (mL)" placeholder="e.g. 50" keyboardType="numeric" value={aDilution} onChangeText={(x) => setADilution(x.replace(/[^0-9.]/g, ''))} /></View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Reminder (days)" placeholder="e.g. 5" keyboardType="numeric" value={aDuration} onChangeText={(x) => setADuration(x.replace(/[^0-9]/g, ''))} /></View>
            <View style={{ flex: 1 }}><Field label="Instructions" placeholder="Optional" value={aInstructions} onChangeText={setAInstructions} /></View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

// ── 7-day MAR report — mirrors the web app's MARPrintView (A4 landscape) ──
function buildMARReportHtml(patient: Patient, medications: Medication[], nurse: string): string {
  const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const initials = (name: string) => name ? name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase() : 'RN';
  const hm = (d: Date) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dOnly = (d: Date) => d.toLocaleDateString();

  const headCols = dates.map(d => `
    <th>
      <div class="dow">${d.toLocaleDateString([], { weekday: 'short' })}</div>
      <div class="dm">${d.toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</div>
    </th>`).join('');

  const rows = medications.map((m, i) => {
    const cells = dates.map(date => {
      const admins = (m.history || []).filter(h => sameDay(new Date(h.t), date));
      const chips = admins.map(a => `
        <div class="chip">
          <div class="chip-t">${esc(hm(a.t))}</div>
          <div class="chip-u">${esc(initials(a.by))}</div>
        </div>`).join('');
      return `<td class="day">${chips}</td>`;
    }).join('');
    return `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td class="med">
          <div class="mname">${esc(m.name)}</div>
          <div class="mdose"><span class="mono">${esc(m.dose)}</span> • ${esc(m.route)}</div>
          <div class="mfreq">${esc(m.freq)}${m.rate && m.rate !== '—' ? ` • ${esc(m.rate)}` : ''}</div>
        </td>
        ${cells}
      </tr>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>MAR — ${esc(patient.name)}</title>
<style>
  @page { size: A4 landscape; margin: 1cm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #0f172a; margin: 0; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
  .title { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #1e293b; margin: 0; }
  .week { font-size: 12px; font-weight: 600; color: #475569; margin-top: 4px; }
  .pt { text-align: right; }
  .pt h2 { font-size: 20px; font-weight: 800; margin: 0; }
  .pt p { margin: 2px 0; font-size: 12px; color: #334155; }
  .pt .nurse { font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  th, td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
  thead tr { background: #f1f5f9; border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b; }
  th { text-align: center; width: 11%; }
  th:first-child { width: 20%; text-align: left; }
  .dow { font-weight: 700; }
  .dm { font-size: 10px; color: #64748b; }
  tr.odd td { background: #f8fafc; }
  .med .mname { font-weight: 700; font-size: 13px; }
  .med .mdose { margin-top: 4px; }
  .mono { font-family: ui-monospace, monospace; background: #e2e8f0; padding: 0 4px; border-radius: 3px; }
  .med .mfreq { font-size: 10px; color: #64748b; font-style: italic; margin-top: 4px; }
  td.day { height: 84px; }
  .chip { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px; margin-bottom: 4px; font-size: 9px; }
  .chip-t { font-weight: 700; text-align: center; }
  .chip-u { text-align: center; color: #475569; }
  .foot { font-size: 10px; color: #94a3b8; margin-top: 40px; text-align: center; }
</style></head>
<body>
  <div class="head">
    <div>
      <h1 class="title">Medication Administration Record (7-Day)</h1>
      <div class="week">Week of: ${esc(dOnly(dates[0]))} – ${esc(dOnly(dates[6]))}</div>
    </div>
    <div class="pt">
      <h2>${esc(patient.name)}</h2>
      <p>MRN: ${esc(patient.mrn)} | Age: ${esc(patient.age)} | ${esc(patient.gender)}</p>
      ${patient.bed ? `<p>Bed: ${esc(patient.bed)}</p>` : ''}
      ${nurse ? `<div class="nurse">Nurse: ${esc(nurse)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Medication / Dose / Route</th>${headCols}</tr></thead>
    <tbody>${rows || `<tr><td colspan="8" style="padding:32px;text-align:center;color:#94a3b8;font-style:italic">No active medications</td></tr>`}</tbody>
  </table>
  <div class="foot">Printed via ICU Manager • Confidential Clinical Document • Page 1 of 1</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 600);</script>
</body></html>`;
}

const pickLabel = (t: any) => ({
  fontSize: 11 as const, fontWeight: '700' as const, color: t.ink3,
  textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 6,
});

const styles = StyleSheet.create({
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
});
