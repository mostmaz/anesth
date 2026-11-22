import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { auditApi, type AuditEntry, type ClientErrorReport } from '../../api/auditApi';
import { adminApi, type User } from '../../api/adminApi';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useLang } from '../../i18n';

// Who did what, to which patient, and when. Read-only, seniors only.

const PAGE = 100;
const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm';
const stamp = (iso: string) => new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

// "POST /medications/administer" → a plain description where we have one.
const DESCRIPTIONS: Array<[RegExp, string]> = [
    [/^SIGN IN$/, 'Signed in'],
    [/^CHANGE own password$/, 'Changed own password'],
    [/^VIEW patient chart$/, 'Opened the chart'],
    [/^POST \/medications\/administer$/, 'Charted a medication entry'],
    [/^POST \/medications\/prescribe$/, 'Prescribed a medication'],
    [/^PUT \/medications\/:id\/status$/, 'Stopped / restarted a medication'],
    [/^PUT \/medications\/:id$/, 'Edited a medication'],
    [/^DELETE \/medications\/administration\/:id$/, 'Deleted a medication entry'],
    [/^POST \/vitals$/, 'Recorded vitals'],
    [/^POST \/ventilator$/, 'Recorded ventilator settings'],
    [/^POST \/io$/, 'Recorded intake / output'],
    [/^PUT \/io\/:id$/, 'Edited an intake / output entry'],
    [/^POST \/notes$/, 'Wrote a note'],
    [/^POST \/orders$/, 'Created an order'],
    [/^PATCH \/orders\/:id\/status$/, 'Changed an order status'],
    [/^POST \/patients$/, 'Admitted a patient'],
    [/^PATCH \/patients\/:id$/, 'Edited patient details'],
    [/^PATCH \/patients\/:id\/discharge$/, 'Discharged the patient'],
    [/^DELETE \/patients\/:id$/, 'Deleted the patient'],
    [/^POST \/lines$/, 'Recorded a line or tube'],
    [/^POST \/lines\/:id\/checks$/, 'Saved a line checklist'],
    [/^POST \/lines\/:id\/remove$/, 'Recorded a line removal'],
    [/^POST \/scores$/, 'Saved a severity score'],
    [/^POST \/mar-signoff$/, 'Signed off the MAR'],
    [/^POST \/users$/, 'Created a user'],
    [/^DELETE \/users\/:id$/, 'Deleted a user'],
    [/^PUT \/users\/:id\/password$/, 'Reset a user’s password'],
    [/^POST \/investigations$/, 'Added a result'],
    [/^DELETE \/investigations/, 'Deleted result(s)'],
    [/^POST \/upload$/, 'Uploaded a file'],
    [/^POST \/assignments/, 'Changed a nurse assignment'],
    [/^POST \/shifts\/start$/, 'Started a shift'],
    [/^PATCH \/shifts\/:id\/end|POST \/shifts\/.*end/, 'Ended a shift'],
];
const describe = (action: string) => DESCRIPTIONS.find(([re]) => re.test(action))?.[1] || action;

export default function AuditLogTab() {
    const { t } = useLang();
    const [view, setView] = useState<'audit' | 'errors'>('audit');
    const [rows, setRows] = useState<AuditEntry[]>([]);
    const [errors, setErrors] = useState<ClientErrorReport[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [patients, setPatients] = useState<Array<{ id: string; name: string; mrn: string }>>([]);
    const [filters, setFilters] = useState({ userId: '', patientId: '', q: '', from: '', to: '' });
    const [loading, setLoading] = useState(false);
    const [more, setMore] = useState(false);

    const query = (before?: string) => ({
        userId: filters.userId || undefined,
        patientId: filters.patientId || undefined,
        q: filters.q.trim() || undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(filters.to).toISOString() : undefined,
        before,
        limit: PAGE,
    });

    const load = async (append = false) => {
        setLoading(true);
        try {
            const before = append && rows.length ? rows[rows.length - 1].timestamp : undefined;
            const data = await auditApi.list(query(before));
            setRows(append ? [...rows, ...data] : data);
            setMore(data.length === PAGE);
        } catch (e: any) {
            toast.error(e?.message || t('audit.loadFailed', 'Could not load the audit log'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        adminApi.getUsers().then(setUsers).catch(() => setUsers([]));
        apiClient.get<Array<{ id: string; name: string; mrn: string }>>('/patients').then(setPatients).catch(() => setPatients([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (view === 'errors') auditApi.clientErrors().then(setErrors).catch((e) => toast.error(e?.message || 'Could not load error reports'));
    }, [view]);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Button size="sm" variant={view === 'audit' ? 'default' : 'outline'} onClick={() => setView('audit')}>{t('audit.activity', 'Activity')}</Button>
                <Button size="sm" variant={view === 'errors' ? 'default' : 'outline'} onClick={() => setView('errors')}>{t('audit.appErrors', 'App error reports')}</Button>
            </div>

            {view === 'audit' ? (
                <>
                    <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end" onSubmit={(e) => { e.preventDefault(); load(); }}>
                        <div className="space-y-1">
                            <Label htmlFor="audit-user">{t('audit.user', 'Staff member')}</Label>
                            <select id="audit-user" className={selectClass} value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}>
                                <option value="">{t('audit.everyone', 'Everyone')}</option>
                                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="audit-patient">{t('audit.patient', 'Patient')}</Label>
                            <select id="audit-patient" className={selectClass} value={filters.patientId} onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}>
                                <option value="">{t('audit.allPatients', 'All patients')}</option>
                                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="audit-from">{t('audit.from', 'From')}</Label>
                            <Input id="audit-from" type="datetime-local" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="audit-to">{t('audit.to', 'To')}</Label>
                            <Input id="audit-to" type="datetime-local" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="audit-q">{t('audit.action', 'Action contains')}</Label>
                            <Input id="audit-q" placeholder="e.g. medications" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
                        </div>
                        <Button type="submit" disabled={loading}>{loading ? t('common.loading', 'Loading…') : t('audit.search', 'Search')}</Button>
                    </form>

                    <div className="border rounded-md overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="text-start p-2">{t('audit.when', 'When')}</th>
                                    <th className="text-start p-2">{t('audit.who', 'Who')}</th>
                                    <th className="text-start p-2">{t('audit.what', 'What')}</th>
                                    <th className="text-start p-2">{t('audit.patient', 'Patient')}</th>
                                    <th className="text-start p-2">{t('audit.result', 'Result')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const refused = r.status !== null && r.status >= 400;
                                    return (
                                        <tr key={r.id} className={`border-t ${refused ? 'bg-amber-50' : ''}`}>
                                            <td className="p-2 font-mono text-xs whitespace-nowrap">{stamp(r.timestamp)}</td>
                                            <td className="p-2 whitespace-nowrap">{r.user?.name} <span className="text-xs text-slate-400">{r.user?.role}</span></td>
                                            <td className="p-2" title={`${r.action}${r.details ? `\n${r.details}` : ''}`}>{describe(r.action)}</td>
                                            <td className="p-2">{r.patient ? `${r.patient.name}${r.patient.mrn ? ` · ${r.patient.mrn}` : ''}` : '—'}</td>
                                            <td className="p-2 text-xs whitespace-nowrap">
                                                {r.status === null ? '' : refused
                                                    ? <span className="font-semibold text-amber-800">{r.status === 403 ? t('audit.denied', 'Not allowed') : `${t('audit.rejected', 'Rejected')} (${r.status})`}</span>
                                                    : <span className="text-emerald-700">{t('audit.ok', 'Done')}</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rows.length === 0 && !loading && (
                                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">{t('audit.none', 'No activity recorded for these filters.')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{rows.length} {t('audit.rows', 'entries shown')}</span>
                        {more && <Button size="sm" variant="outline" disabled={loading} onClick={() => load(true)}>{t('audit.more', 'Load older')}</Button>}
                    </div>
                </>
            ) : (
                <div className="border rounded-md overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="text-start p-2">{t('audit.when', 'When')}</th>
                                <th className="text-start p-2">{t('audit.app', 'App')}</th>
                                <th className="text-start p-2">{t('audit.error', 'Error')}</th>
                                <th className="text-start p-2">{t('audit.where', 'Where')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {errors.map((e) => (
                                <tr key={e.id} className="border-t align-top">
                                    <td className="p-2 font-mono text-xs whitespace-nowrap">{stamp(e.createdAt)}</td>
                                    <td className="p-2 whitespace-nowrap">{e.platform}{e.appVersion ? ` ${e.appVersion}` : ''}</td>
                                    <td className="p-2">
                                        <div className="font-medium">{e.message}</div>
                                        {e.stack && <details className="text-xs text-slate-500"><summary className="cursor-pointer">{t('audit.details', 'Details')}</summary><pre className="whitespace-pre-wrap">{e.stack}</pre></details>}
                                    </td>
                                    <td className="p-2 text-xs text-slate-600">{e.context ? Object.entries(e.context).map(([k, v]) => `${k}: ${v}`).join(' · ') : ''}</td>
                                </tr>
                            ))}
                            {errors.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">{t('audit.noErrors', 'No errors reported.')}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
