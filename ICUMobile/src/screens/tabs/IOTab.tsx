import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtTime, Patient, IOEntry } from '../../data/mockICU';
import { Card, CardHead } from '../../components/Card';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { PrintIntervalPicker, filterByInterval, intervalLabel, PrintInterval } from '../../components/PrintIntervalPicker';
import * as api from '../../api/endpoints';
import { getFileUrl } from '../../api/config';

// Categories mirror the desktop webapp's I/O form.
const IO_CATEGORIES: Record<'IN' | 'OUT', string[]> = {
  IN: ['IV Fluid', 'PO Intake', 'Blood Product', 'Enteral Feed'],
  OUT: ['Urine', 'Stool', 'NG Output', 'Drain'],
};

export function IOTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showAdd, setShowAdd] = useState(false);
  const [ioType, setIoType] = useState<'IN' | 'OUT'>('IN');
  const [ioCategory, setIoCategory] = useState(IO_CATEGORIES.IN[0]);
  const [ioAmount, setIoAmount] = useState('');
  const [ioNotes, setIoNotes] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);
  const [printInterval, setPrintInterval] = useState<PrintInterval>(12);
  const [customHours, setCustomHours] = useState('');
  // When switching Input/Output, snap category to the first valid one for that type.
  const selectType = (next: 'IN' | 'OUT') => {
    setIoType(next);
    setIoCategory(IO_CATEGORIES[next][0]);
  };

  const printCount = filterByInterval(patient.io, printInterval).length;

  // ── Print I/O chart → host HTML on server → open http URL in browser ──
  const handlePrint = async () => {
    setPrintBusy(true);
    try {
      const windowed = filterByInterval(patient.io, printInterval);
      const label = intervalLabel(printInterval);
      const html = buildIOReportHtml(patient, windowed, label);
      const hosted = await api.hostReport(html, `io-${patient.mrn || patient.id}`);
      await Linking.openURL(getFileUrl(hosted.url));
      setShowPrint(false);
      ICU.pushToast({ tone: 'info', msg: 'Opened report — tap ⋮ → Print → Save as PDF' });
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Print failed' });
    } finally {
      setPrintBusy(false);
    }
  };
  const balance = patient.fluidBalance;
  const net = balance.in12h - balance.out12h;

  const grouped = useMemo(() => {
    const ins: Record<string, number> = {};
    const outs: Record<string, number> = {};
    patient.io.forEach(e => {
      const m = e.type === 'IN' ? ins : outs;
      m[e.cat] = (m[e.cat] || 0) + e.amount;
    });
    return { ins, outs };
  }, [patient.io]);

  return (
    <View style={{ gap: 12 }}>
      {/* Headline balance */}
      <Card>
        <CardHead title="12h balance" subtitle="Fluid in vs out" icon="droplet" iconTone="info"
          right={<View style={{ flexDirection: 'row', gap: 6 }}>
            <Button size="icon-sm" variant="outline" icon="printer" onPress={() => setShowPrint(true)} />
            <Button size="icon-sm" variant="outline" icon="plus" onPress={() => setShowAdd(true)} />
          </View>}
        />
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{
            fontSize: 56, fontWeight: '700',
            color: net > 0 ? t.sigSpo : t.sigTemp,
            letterSpacing: -1,
          }}>
            {net > 0 ? '+' : ''}{net}
          </Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>ml</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <View style={[styles.bigStat, { backgroundColor: t.sigSpo + '14' }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.sigSpo, letterSpacing: 1 }}>IN</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: t.sigSpo }}>{balance.in12h}</Text>
            <Text style={{ fontSize: 10, color: t.ink3 }}>ml</Text>
          </View>
          <View style={[styles.bigStat, { backgroundColor: t.sigTemp + '14' }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.sigTemp, letterSpacing: 1 }}>OUT</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: t.sigTemp }}>{balance.out12h}</Text>
            <Text style={{ fontSize: 10, color: t.ink3 }}>ml</Text>
          </View>
        </View>
        <View style={[styles.barTrack, { backgroundColor: t.surface3 }]}>
          <View style={{ flex: balance.in12h, backgroundColor: t.sigSpo }} />
          <View style={{ flex: balance.out12h, backgroundColor: t.sigTemp }} />
        </View>
      </Card>

      {/* Breakdown */}
      <Card tight>
        <CardHead title="Breakdown" subtitle="By category" icon="filter" />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.sigSpo, letterSpacing: 1, marginBottom: 4 }}>↑ INTAKE</Text>
            {Object.keys(grouped.ins).length === 0 ? <Text style={{ fontSize: 12, color: t.ink3 }}>—</Text>
              : Object.entries(grouped.ins).map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: t.ink2 }}>{k}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: t.ink }}>{v}</Text>
                </View>
              ))
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.sigTemp, letterSpacing: 1, marginBottom: 4 }}>↓ OUTPUT</Text>
            {Object.keys(grouped.outs).length === 0 ? <Text style={{ fontSize: 12, color: t.ink3 }}>—</Text>
              : Object.entries(grouped.outs).map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: t.ink2 }}>{k}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: t.ink }}>{v}</Text>
                </View>
              ))
            }
          </View>
        </View>
      </Card>

      {/* Entries */}
      <Card tight>
        <CardHead title="Entries" subtitle={`${patient.io.length} recorded`} icon="clipboard" />
        {patient.io.length === 0
          ? <Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No I/O entries recorded.</Text>
          : <View style={{ gap: 6 }}>
              {[...patient.io].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime()).map(e => (
                <View key={e.id} style={[styles.entryRow, { borderTopColor: t.line }]}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: (e.type === 'IN' ? t.sigSpo : t.sigTemp) + '24',
                  }}>
                    <Icon name={e.type === 'IN' ? 'arrowDown' : 'arrowUp'} size={14}
                      color={e.type === 'IN' ? t.sigSpo : t.sigTemp} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: t.ink }} numberOfLines={1}>{e.cat}</Text>
                    <Text style={{ fontSize: 10, color: t.ink3 }} numberOfLines={1}>{fmtTime(e.t)} · {e.notes || '—'}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: e.type === 'IN' ? t.sigSpo : t.sigTemp }}>
                    {e.type === 'IN' ? '+' : '−'}{e.amount}<Text style={{ fontSize: 10, opacity: 0.7 }}> ml</Text>
                  </Text>
                </View>
              ))}
            </View>
        }
      </Card>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="New I/O entry"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" onPress={async () => {
            const amt = Number(ioAmount);
            if (!Number.isFinite(amt) || amt <= 0) {
              ICU.pushToast({ tone: 'crit', msg: 'Enter a valid amount' });
              return;
            }
            setShowAdd(false);
            if (ICU.mode === 'live') {
              await ICU.addIOLive(patient.id, { type: ioType, category: ioCategory, amount: amt, notes: ioNotes });
            } else {
              ICU.pushToast({ tone: 'ok', msg: 'Entry recorded (demo)' });
            }
            setIoAmount(''); setIoNotes('');
          }}>Save</Button>
        </>}
      >
        <View style={{ gap: 10 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button
                variant="outline"
                style={{ flex: 1, backgroundColor: ioType === 'IN' ? t.surface2 : undefined, borderColor: ioType === 'IN' ? t.sigSpo : t.line2 }}
                icon="arrowDown" color={t.sigSpo}
                onPress={() => selectType('IN')}
              >Input</Button>
              <Button
                variant="outline"
                style={{ flex: 1, backgroundColor: ioType === 'OUT' ? t.surface2 : undefined, borderColor: ioType === 'OUT' ? t.sigTemp : t.line2 }}
                icon="arrowUp" color={t.sigTemp}
                onPress={() => selectType('OUT')}
              >Output</Button>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {IO_CATEGORIES[ioType].map(cat => {
                const on = ioCategory === cat;
                const tint = ioType === 'IN' ? t.sigSpo : t.sigTemp;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setIoCategory(cat)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      borderWidth: 1,
                      borderColor: on ? tint : t.line2,
                      backgroundColor: on ? tint + '1f' : t.surface,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? t.ink : t.ink2 }}>{cat}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Field label="Amount (ml)" placeholder="e.g. 250" keyboardType="numeric" value={ioAmount} onChangeText={setIoAmount} />
          <Field label="Notes" placeholder="Optional" multiline numberOfLines={2} style={{ minHeight: 60, textAlignVertical: 'top' }} value={ioNotes} onChangeText={setIoNotes} />
        </View>
      </Sheet>

      {/* Print I/O chart → hosted HTML report → Print / Save-as-PDF */}
      <Sheet open={showPrint} onClose={() => !printBusy && setShowPrint(false)} title="Print I/O chart"
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
            <Text style={{ fontWeight: '700' }}>{printCount}</Text> entr{printCount === 1 ? 'y' : 'ies'} in range · opens as an A4 report in your browser.
          </Text>
          <Text style={{ fontSize: 12, color: t.ink3 }}>
            Once it opens, tap the menu (⋮) → <Text style={{ fontWeight: '700' }}>Print</Text> → <Text style={{ fontWeight: '700' }}>Save as PDF</Text> or your printer.
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

// Build a self-contained A4-styled HTML I/O report.
function buildIOReportHtml(patient: Patient, entries: IOEntry[], rangeLabel = 'All records'): string {
  const sorted = [...entries].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  const fmtDT = (d: any) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
  const totalIn = sorted.filter(e => e.type === 'IN').reduce((a, b) => a + b.amount, 0);
  const totalOut = sorted.filter(e => e.type === 'OUT').reduce((a, b) => a + b.amount, 0);
  const net = totalIn - totalOut;
  const rows = sorted.map(e => `
    <tr>
      <td>${fmtDT(e.t)}</td>
      <td>${e.type === 'IN' ? 'Intake' : 'Output'}</td>
      <td>${esc(e.cat)}</td>
      <td style="text-align:right;color:${e.type === 'IN' ? '#0891b2' : '#ea580c'}">${e.type === 'IN' ? '+' : '−'}${e.amount} ml</td>
      <td>${esc(e.notes || '—')}</td>
    </tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>I/O — ${esc(patient.name)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #0f172a; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #334155; }
  tr:nth-child(even) td { background: #f8fafc; }
  .meta { display: flex; gap: 24px; font-size: 11px; color: #475569; margin-bottom: 12px; }
  .meta b { color: #0f172a; }
  .totals { display: flex; gap: 16px; margin: 12px 0 16px; }
  .tot { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
  .tot .v { font-size: 20px; font-weight: 700; }
  .tot .l { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
  .footer { margin-top: 18px; font-size: 10px; color: #94a3b8; }
</style></head>
<body>
  <h1>Fluid Balance (I/O) Report</h1>
  <div class="sub">${esc(patient.name)} · MRN ${esc(patient.mrn)} · Generated ${fmtDT(new Date())}</div>
  <div class="meta">
    <span><b>Range:</b> ${esc(rangeLabel)}</span>
    ${patient.bed ? `<span><b>Bed:</b> ${esc(patient.bed)}</span>` : ''}
    <span><b>Entries:</b> ${sorted.length}</span>
  </div>
  <div class="totals">
    <div class="tot"><div class="l">Intake</div><div class="v" style="color:#0891b2">${totalIn} ml</div></div>
    <div class="tot"><div class="l">Output</div><div class="v" style="color:#ea580c">${totalOut} ml</div></div>
    <div class="tot"><div class="l">Net balance</div><div class="v" style="color:${net >= 0 ? '#0891b2' : '#ea580c'}">${net >= 0 ? '+' : ''}${net} ml</div></div>
  </div>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Category</th><th style="text-align:right">Amount</th><th>Notes</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">No I/O entries in range</td></tr>'}</tbody>
  </table>
  <div class="footer">ICU Manager — printed from mobile app. Use the browser menu to print or save as PDF.</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 600);</script>
</body></html>`;
}

const styles = StyleSheet.create({
  bigStat: { flex: 1, padding: 10, borderRadius: 10 },
  barTrack: {
    height: 8, borderRadius: 99, overflow: 'hidden',
    flexDirection: 'row', marginTop: 12,
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopWidth: 1,
  },
});
