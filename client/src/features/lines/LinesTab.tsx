import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { linesApi, type PatientLine } from '../../api/linesApi';
import { useAuthStore } from '../../stores/authStore';
import { useLang } from '../../i18n';
import { Card, CardHead, Icon, Pill, Sheet, SectionTitle } from '../../components/icu';
import { LINE_TYPES, bundleDoneSince, lineDay, lineNeedsReview, lineType } from '../../shared/lines';
import { shiftWindowAt } from '../../shared/time';

// Lines, tubes and drains: what is in place, for how many days, and whether
// its care checklist has been done this shift.

const localNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function LinesTab({ patientId }: { patientId: string }) {
    const { t, lang } = useLang();
    const user = useAuthStore((s) => s.user);
    const [lines, setLines] = useState<PatientLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState({ type: 'CVC', site: '', size: '', notes: '', insertedAt: localNow() });

    const [checking, setChecking] = useState<PatientLine | null>(null);
    const [checks, setChecks] = useState<Record<string, boolean>>({});
    const [checkNotes, setCheckNotes] = useState('');

    const [removing, setRemoving] = useState<PatientLine | null>(null);
    const [removeReason, setRemoveReason] = useState('');
    const [removedAt, setRemovedAt] = useState(localNow());

    const typeName = (key: string) => { const ty = lineType(key); return lang === 'ar' ? ty.labelAr : ty.label; };

    const load = async () => {
        try {
            setLines(await linesApi.list(patientId));
        } catch (e: any) {
            toast.error(e?.message || t('lines.loadFailed', 'Could not load lines'));
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [patientId]);

    const run = async (work: () => Promise<unknown>, done: string) => {
        if (busy) return;
        setBusy(true);
        try {
            await work();
            toast.success(done);
            await load();
            return true;
        } catch (e: any) {
            toast.error(e?.message || t('lines.failed', 'Could not save'));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const add = async () => {
        const ok = await run(() => linesApi.add({
            patientId,
            type: form.type,
            site: form.site.trim() || undefined,
            size: form.size.trim() || undefined,
            notes: form.notes.trim() || undefined,
            insertedAt: new Date(form.insertedAt).toISOString(),
        }), t('lines.added', 'Line recorded'));
        if (ok) { setAddOpen(false); setForm({ type: 'CVC', site: '', size: '', notes: '', insertedAt: localNow() }); }
    };

    const openChecklist = (line: PatientLine) => {
        setChecking(line);
        setChecks(Object.fromEntries(lineType(line.type).bundle.map((b) => [b.key, false])));
        setCheckNotes('');
    };
    const saveChecklist = async () => {
        if (!checking) return;
        const ok = await run(() => linesApi.saveCheck(checking.id, { items: checks, notes: checkNotes.trim() || undefined }), t('lines.checkSaved', 'Checklist saved'));
        if (ok) setChecking(null);
    };

    const remove = async () => {
        if (!removing) return;
        const ok = await run(() => linesApi.remove(removing.id, { reason: removeReason.trim() || undefined, removedAt: new Date(removedAt).toISOString() }), t('lines.removed', 'Removal recorded'));
        if (ok) { setRemoving(null); setRemoveReason(''); }
    };

    const deleteEntry = async (line: PatientLine) => {
        if (!confirm(t('lines.deleteConfirm', 'Delete this entry? Use this only for an entry made by mistake.'))) return;
        await run(() => linesApi.deleteEntry(line.id), t('lines.deleted', 'Entry deleted'));
    };

    const inPlace = lines.filter((l) => !l.removedAt);
    const removed = lines.filter((l) => l.removedAt);
    const shiftStart = shiftWindowAt(new Date()).start;
    const canDelete = user?.role === 'SENIOR' || user?.role === 'RESIDENT';

    if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>{t('common.loading', 'Loading…')}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{t('lines.title', 'Lines, tubes and drains')}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{inPlace.length} {t('lines.inPlace', 'in place')}</div>
                </div>
                <button type="button" className="icu-btn icu-btn-primary icu-btn-sm" onClick={() => { setForm({ ...form, insertedAt: localNow() }); setAddOpen(true); }}>
                    <Icon name="plus" size={14} /> {t('lines.add', 'Add')}
                </button>
            </div>

            {inPlace.length === 0 && (
                <Card><div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '12px 0' }}>{t('lines.none', 'No lines or tubes recorded for this patient.')}</div></Card>
            )}

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {inPlace.map((line) => {
                    const day = lineDay(line);
                    const review = lineNeedsReview(line);
                    const done = bundleDoneSince(line.checks, shiftStart);
                    const last = line.checks[0];
                    return (
                        <Card key={line.id}>
                            <CardHead
                                title={typeName(line.type)}
                                subtitle={[line.site, line.size].filter(Boolean).join(' · ') || undefined}
                                icon="syringe"
                                iconTone={review ? 'warn' : 'info'}
                                right={<Pill tone={review ? 'warn' : 'muted'}>{t('lines.day', 'Day')} {day}</Pill>}
                            />
                            {review && (
                                <div style={{ fontSize: 12, color: 'var(--st-warn-fg)', background: 'var(--st-warn-bg)', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
                                    <Icon name="alert" size={12} /> {t('lines.review', 'Review whether it is still needed')}
                                </div>
                            )}
                            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                                {t('lines.inserted', 'Inserted')} {when(line.insertedAt)} · {line.insertedBy?.name}
                            </div>
                            {line.notes && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{line.notes}</div>}
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {done
                                    ? <Pill tone="ok"><Icon name="check" size={10} /> {t('lines.checkedThisShift', 'Checked this shift')} · {clock(last.timestamp)}</Pill>
                                    : <Pill tone="warn">{t('lines.notChecked', 'Checklist not done this shift')}</Pill>}
                                {last && !done && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t('lines.lastCheck', 'last')} {when(last.timestamp)}</span>}
                            </div>
                            {last && Object.values(last.items).some((v) => !v) && (
                                <div style={{ fontSize: 11, color: 'var(--st-crit-fg)', marginTop: 4 }}>
                                    {t('lines.notMet', 'Not met at last check')}: {lineType(line.type).bundle.filter((b) => last.items[b.key] === false).map((b) => (lang === 'ar' ? b.labelAr : b.label)).join('; ')}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                                <button type="button" className="icu-btn icu-btn-success icu-btn-sm" onClick={() => openChecklist(line)}>
                                    <Icon name="clipboard" size={14} /> {t('lines.checklist', 'Checklist')}
                                </button>
                                <button type="button" className="icu-btn icu-btn-outline icu-btn-sm" onClick={() => { setRemoving(line); setRemovedAt(localNow()); setRemoveReason(''); }}>
                                    <Icon name="x" size={14} /> {t('lines.remove', 'Removed')}
                                </button>
                                {canDelete && (
                                    <button type="button" className="icu-btn icu-btn-ghost icu-btn-sm" title={t('lines.delete', 'Delete entry')} onClick={() => deleteEntry(line)}>
                                        <Icon name="trash" size={14} />
                                    </button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {removed.length > 0 && (
                <div>
                    <SectionTitle>{t('lines.removedTitle', 'Removed')}</SectionTitle>
                    <Card tight>
                        {removed.map((line, i) => (
                            <div key={line.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{typeName(line.type)}</span>
                                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{[line.site, line.size].filter(Boolean).join(' · ')}</span>
                                <span style={{ fontSize: 12, color: 'var(--ink-3)', marginInlineStart: 'auto' }}>
                                    {lineDay(line)} {t('lines.days', 'day(s)')} · {t('lines.removedOn', 'removed')} {when(line.removedAt!)}{line.removedBy ? ` · ${line.removedBy.name}` : ''}
                                </span>
                                {line.removalReason && <span style={{ fontSize: 12, color: 'var(--ink-2)', flexBasis: '100%' }}>{line.removalReason}</span>}
                            </div>
                        ))}
                    </Card>
                </div>
            )}

            {/* Add */}
            <Sheet
                open={addOpen}
                onClose={() => !busy && setAddOpen(false)}
                title={t('lines.addTitle', 'Record a line, tube or drain')}
                footer={
                    <>
                        <button type="button" className="icu-btn icu-btn-outline" onClick={() => setAddOpen(false)} disabled={busy}>{t('btn.cancel', 'Cancel')}</button>
                        <button type="button" className="icu-btn icu-btn-primary" onClick={add} disabled={busy}>{busy ? t('common.saving', 'Saving…') : t('btn.save', 'Save')}</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="icu-fld" htmlFor="line-type">{t('lines.type', 'Type')}</label>
                        <select id="line-type" className="icu-select" style={{ width: '100%' }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            {LINE_TYPES.map((ty) => <option key={ty.key} value={ty.key}>{lang === 'ar' ? ty.labelAr : ty.label}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="icu-fld" htmlFor="line-site">{t('lines.site', 'Site')}</label>
                            <input id="line-site" className="icu-input" style={{ width: '100%' }} maxLength={120} placeholder={t('lines.sitePlaceholder', 'e.g. Right IJ')} value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
                        </div>
                        <div>
                            <label className="icu-fld" htmlFor="line-size">{t('lines.size', 'Size / depth')}</label>
                            <input id="line-size" className="icu-input" style={{ width: '100%' }} maxLength={60} placeholder={t('lines.sizePlaceholder', 'e.g. 7 Fr, 22 cm')} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="icu-fld" htmlFor="line-inserted">{t('lines.insertedAt', 'Inserted at')}</label>
                        <input id="line-inserted" type="datetime-local" className="icu-input" style={{ width: '100%' }} max={localNow()} value={form.insertedAt} onChange={(e) => setForm({ ...form, insertedAt: e.target.value })} />
                    </div>
                    <div>
                        <label className="icu-fld" htmlFor="line-notes">{t('lines.notes', 'Notes')}</label>
                        <textarea id="line-notes" className="icu-textarea" style={{ width: '100%', resize: 'vertical' }} rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </div>
            </Sheet>

            {/* Care-bundle checklist */}
            <Sheet
                open={!!checking}
                onClose={() => !busy && setChecking(null)}
                title={checking ? `${t('lines.checklist', 'Checklist')} · ${typeName(checking.type)}` : undefined}
                footer={
                    <>
                        <button type="button" className="icu-btn icu-btn-outline" onClick={() => setChecking(null)} disabled={busy}>{t('btn.cancel', 'Cancel')}</button>
                        <button type="button" className="icu-btn icu-btn-success" onClick={saveChecklist} disabled={busy}>
                            <Icon name="check" size={14} /> {busy ? t('common.saving', 'Saving…') : t('lines.saveCheck', 'Save checklist')}
                        </button>
                    </>
                }
            >
                {checking && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{t('lines.checkHelp', 'Tick each item that is met. Unticked items are saved as not met.')}</p>
                        {lineType(checking.type).bundle.map((item) => {
                            const on = !!checks[item.key];
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    className="icu-row"
                                    onClick={() => setChecks({ ...checks, [item.key]: !on })}
                                    style={{ width: '100%', padding: 12, gap: 12, cursor: 'pointer', background: 'var(--surface)', textAlign: 'start', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center' }}
                                >
                                    <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`, background: on ? 'var(--accent)' : 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-fg)', flexShrink: 0 }}>
                                        {on && <Icon name="check" size={14} stroke={3} />}
                                    </span>
                                    <span style={{ flex: 1 }}>{lang === 'ar' ? item.labelAr : item.label}</span>
                                </button>
                            );
                        })}
                        <div>
                            <label className="icu-fld" htmlFor="check-notes">{t('lines.notes', 'Notes')}</label>
                            <textarea id="check-notes" className="icu-textarea" style={{ width: '100%', resize: 'vertical' }} rows={2} maxLength={500} value={checkNotes} onChange={(e) => setCheckNotes(e.target.value)} />
                        </div>
                    </div>
                )}
            </Sheet>

            {/* Removal */}
            <Sheet
                open={!!removing}
                onClose={() => !busy && setRemoving(null)}
                title={removing ? `${t('lines.removeTitle', 'Record removal')} · ${typeName(removing.type)}` : undefined}
                footer={
                    <>
                        <button type="button" className="icu-btn icu-btn-outline" onClick={() => setRemoving(null)} disabled={busy}>{t('btn.cancel', 'Cancel')}</button>
                        <button type="button" className="icu-btn icu-btn-danger" onClick={remove} disabled={busy}>{busy ? t('common.saving', 'Saving…') : t('lines.confirmRemove', 'Record removal')}</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="icu-fld" htmlFor="line-removed">{t('lines.removedAt', 'Removed at')}</label>
                        <input id="line-removed" type="datetime-local" className="icu-input" style={{ width: '100%' }} max={localNow()} value={removedAt} onChange={(e) => setRemovedAt(e.target.value)} />
                    </div>
                    <div>
                        <label className="icu-fld" htmlFor="line-reason">{t('lines.reason', 'Reason')}</label>
                        <input id="line-reason" className="icu-input" style={{ width: '100%' }} maxLength={300} placeholder={t('lines.reasonPlaceholder', 'e.g. no longer needed, blocked, suspected infection')} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
                    </div>
                </div>
            </Sheet>
        </div>
    );
}
