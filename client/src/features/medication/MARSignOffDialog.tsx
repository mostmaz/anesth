import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { marApi, type SignOffPreview } from '../../api/marApi';
import { ApiError } from '../../api/client';
import { previousShiftWindow, shiftWindowAt, type ShiftWindow } from '../../shared/time';
import { useLang } from '../../i18n';

// End-of-shift sign-off of the MAR.
//
// The nurse reviews what was charted for the shift and confirms it with their
// own password. This is an additional electronic record; the printed MAR is
// unchanged.

interface Props {
    patientId: string;
    open: boolean;
    onClose: () => void;
    onSigned: () => void;
}

const clock = (iso: string | Date) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const day = (d: Date) => d.toLocaleDateString([], { day: 'numeric', month: 'short' });

export function shiftLabel(window: { start: Date | string; end: Date | string }, type: string, t: (k: string, f?: string) => string) {
    const start = new Date(window.start);
    const name = type === 'DAY' ? t('shift.day', 'Day shift') : t('shift.night', 'Night shift');
    return `${name} · ${day(start)} ${clock(start)}–${clock(window.end)}`;
}

export function MARSignOffDialog({ patientId, open, onClose, onSigned }: Props) {
    const { t } = useLang();
    const [which, setWhich] = useState<'current' | 'previous'>('current');
    const [shift, setShift] = useState<ShiftWindow>(() => shiftWindowAt(new Date()));
    const [preview, setPreview] = useState<SignOffPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const load = async (target: ShiftWindow) => {
        setLoading(true);
        setError('');
        try {
            setPreview(await marApi.signOffPreview(patientId, target.start, target.end));
        } catch (e: any) {
            setPreview(null);
            setError(e?.message || t('signoff.loadFailed', 'Could not load the entries for this shift'));
        } finally {
            setLoading(false);
        }
    };

    // Work out the shift when the dialog opens or the choice changes.
    useEffect(() => {
        if (!open) return;
        const current = shiftWindowAt(new Date());
        const target = which === 'current' ? current : previousShiftWindow(current);
        setShift(target);
        setPassword('');
        load(target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, which, patientId]);

    const sign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preview || busy) return;
        setBusy(true);
        setError('');
        try {
            await marApi.signOff({
                patientId,
                shiftType: shift.type,
                periodStart: shift.start.toISOString(),
                periodEnd: shift.end.toISOString(),
                password,
                contentHash: preview.contentHash,
                note: note.trim() || undefined,
            });
            toast.success(t('signoff.done', 'MAR signed off'));
            setPassword('');
            setNote('');
            onSigned();
            onClose();
        } catch (err: any) {
            if (err instanceof ApiError && err.code === 'CHANGED') {
                // Someone charted while the list was open: show the new list before signing.
                await load(shift);
                setError(t('signoff.changed', 'The MAR changed while you were reviewing it. Check the list again, then sign.'));
            } else {
                setError(err?.message || t('signoff.failed', 'Could not sign off'));
            }
        } finally {
            setBusy(false);
        }
    };

    const items = preview?.items || [];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>{t('signoff.title', 'Sign off MAR for the shift')}</DialogTitle>
                    <DialogDescription>{shiftLabel(shift, shift.type, t)}</DialogDescription>
                </DialogHeader>

                <div className="flex gap-2">
                    {(['current', 'previous'] as const).map((w) => (
                        <Button key={w} type="button" size="sm" variant={which === w ? 'default' : 'outline'} onClick={() => setWhich(w)} disabled={busy}>
                            {w === 'current' ? t('signoff.thisShift', 'This shift') : t('signoff.previousShift', 'Previous shift')}
                        </Button>
                    ))}
                </div>

                <div className="border rounded-md max-h-[38vh] overflow-auto">
                    {loading ? (
                        <p className="p-4 text-sm text-slate-500">{t('common.loading', 'Loading…')}</p>
                    ) : items.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">{t('signoff.none', 'No medication entries were charted in this shift.')}</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
                                <tr>
                                    <th className="text-start p-2">{t('signoff.time', 'Time')}</th>
                                    <th className="text-start p-2">{t('signoff.drug', 'Drug')}</th>
                                    <th className="text-start p-2">{t('signoff.status', 'Status')}</th>
                                    <th className="text-start p-2">{t('signoff.by', 'By')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((i) => {
                                    const late = i.chartedAt && new Date(i.chartedAt).getTime() - new Date(i.timestamp).getTime() > 30 * 60_000;
                                    return (
                                        <tr key={i.id} className="border-t">
                                            <td className="p-2 font-mono whitespace-nowrap">
                                                {clock(i.timestamp)}
                                                {late && <span className="ms-1 px-1 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">{t('mar.lateEntry', 'Late entry')}</span>}
                                            </td>
                                            <td className="p-2">
                                                <span className="font-medium">{i.drug}</span>
                                                {i.dose && !['Paused', 'Resumed'].includes(i.dose) && <span className="text-slate-500"> · {i.dose}</span>}
                                                <span className="text-slate-400"> · {i.route}</span>
                                            </td>
                                            <td className="p-2">{i.status}</td>
                                            <td className="p-2 text-slate-600">{i.by || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <form onSubmit={sign} className="space-y-3">
                    <p className="text-sm text-slate-700">
                        {t('signoff.statement', 'I confirm that the medication entries above for this patient and shift are complete and correct.')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="signoff-password">{t('signoff.password', 'Your password (signature)')}</Label>
                            <Input id="signoff-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="signoff-note">{t('signoff.note', 'Note (optional)')}</Label>
                            <Input id="signoff-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </div>
                    {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 text-red-800 text-sm p-2">{error}</div>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t('btn.cancel', 'Cancel')}</Button>
                        <Button type="submit" disabled={busy || loading || !preview || !password} className="bg-emerald-600 hover:bg-emerald-700">
                            {busy ? t('signoff.signing', 'Signing…') : `${t('signoff.sign', 'Sign off')}${preview ? ` (${preview.counts.total})` : ''}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
