
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AlertTriangle, Clock } from 'lucide-react';
import { ordersApi } from '../../api/ordersApi';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface AddInterventionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    diagnosis?: string;
    onSuccess: () => void;
}

const INTERVENTION_TYPES = [
    "ETT",
    "Tracheostomy",
    "Arterial Line",
    "CV Line",
    "Hickman",
    "Surgery",
    "Other"
];

// Default check intervals (hours) per intervention type
const DEFAULT_CHECK_HOURS: Record<string, number> = {
    "ETT": 24,
    "Tracheostomy": 168, // 7 days
    "Arterial Line": 72,
    "CV Line": 72,
    "Hickman": 168,
    "Surgery": 24,
    "Other": 24,
};

export default function AddInterventionDialog({ open, onOpenChange, patientId, diagnosis, onSuccess }: AddInterventionDialogProps) {
    const { user } = useAuthStore();
    const [type, setType] = useState(INTERVENTION_TYPES[0]);
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [timeDone, setTimeDone] = useState('');
    const [reminderAt, setReminderAt] = useState('');
    const [notificationText, setNotificationText] = useState('');
    const [alerts, setAlerts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // When type changes, pre-fill a suggested check reminder time
    useEffect(() => {
        if (!open) return;
        const hours = DEFAULT_CHECK_HOURS[type] || 24;
        const suggested = new Date(Date.now() + hours * 60 * 60 * 1000);
        // Format to datetime-local value
        const formatted = suggested.toISOString().slice(0, 16);
        setReminderAt(formatted);
        checkSafety();
    }, [type, open]);

    const checkSafety = async () => {
        const newAlerts: string[] = [];
        try {
            const orders = await ordersApi.getOrders(patientId);
            const activeOrders = orders.filter(o => o.status === 'APPROVED' || o.status === 'PENDING');

            const bloodThinners = ["Clexane", "Heparin", "Plavix", "Aspirin", "Apixaban"];
            const hasFeeding = activeOrders.some(o => o.type === 'DIET' && !o.title.toLowerCase().includes('npo'));

            if (type === 'Surgery' || type === 'Tracheostomy') {
                const activeThinners = activeOrders.filter(o =>
                    bloodThinners.some(bt => o.title.toLowerCase().includes(bt.toLowerCase()))
                );
                if (activeThinners.length > 0) {
                    newAlerts.push(`STOP Blood Thinners! Patient is on: ${activeThinners.map(o => o.title).join(', ')}`);
                }
                if (hasFeeding) {
                    newAlerts.push("Patient is on Feeding! Should be NPO before procedure.");
                }
            }

            if (type === 'Arterial Line' && diagnosis?.toLowerCase().includes('pci')) {
                newAlerts.push("PCI Patient: AVOID Right Arm for Arterial Line!");
            }

            setAlerts(newAlerts);
        } catch (error) {
            console.error("Failed to check safety", error);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        const finalTitle = type === 'Other' || type === 'Surgery' ? title : type;

        try {
            await ordersApi.createOrder({
                patientId,
                authorId: user.id,
                type: 'PROCEDURE',
                title: finalTitle,
                priority: 'ROUTINE',
                notes,
                reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
                details: {
                    interventionType: type,
                    timeDone: timeDone ? new Date(timeDone).toISOString() : new Date().toISOString(),
                    notificationText: notificationText.trim() || `Check ${finalTitle} — scheduled review`
                }
            });
            toast.success("Intervention scheduled");
            onSuccess();
        } catch (error) {
            toast.error("Failed to create intervention");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Schedule Intervention</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {alerts.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {alerts.map((msg, i) => (
                                <div key={i} className="flex gap-3 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg items-start">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <div>
                                        <h5 className="font-medium text-red-900">Safety Warning</h5>
                                        <div className="text-red-800">{msg}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Intervention Type */}
                    <div className="space-y-2">
                        <Label>Intervention Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERVENTION_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(type === 'Surgery' || type === 'Other') && (
                        <div className="space-y-2">
                            <Label>Procedure Name</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Laparotomy"
                            />
                        </div>
                    )}

                    {/* Time Done */}
                    <div className="space-y-2">
                        <Label>
                            Time Done <span className="text-slate-400 font-normal">(when was this intervention performed?)</span>
                        </Label>
                        <Input
                            type="datetime-local"
                            value={timeDone}
                            onChange={e => setTimeDone(e.target.value)}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes / Instructions</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Specific site, preparation, etc."
                        />
                    </div>

                    {/* Notification Message */}
                    <div className="space-y-2">
                        <Label>Notification Message <span className="text-slate-400 font-normal">(shown on reminder)</span></Label>
                        <Input
                            value={notificationText}
                            onChange={e => setNotificationText(e.target.value)}
                            placeholder={`e.g. "Check ${type} site and document findings"`}
                        />
                    </div>

                    {/* Check Reminder Time */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Check Reminder Time
                            <span className="text-slate-400 font-normal ml-1">(triggers dashboard alert)</span>
                        </Label>
                        <Input
                            type="datetime-local"
                            value={reminderAt}
                            onChange={(e) => setReminderAt(e.target.value)}
                        />
                        {type && DEFAULT_CHECK_HOURS[type] && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Default for {type}: check in {DEFAULT_CHECK_HOURS[type] >= 168 ? `${DEFAULT_CHECK_HOURS[type] / 24} days` : `${DEFAULT_CHECK_HOURS[type]} hours`}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Scheduling...' : 'Schedule'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
