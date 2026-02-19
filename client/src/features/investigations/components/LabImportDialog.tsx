
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { fetchLabPatients } from '@/api/labApi';
import { toast } from 'sonner';

interface LabImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (patient: any) => void;
}

export function LabImportDialog({ open, onOpenChange, onImport }: LabImportDialogProps) {
    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [fetched, setFetched] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [importing, setImporting] = useState(false);

    const loadPatients = async (refresh: boolean = false) => {
        setLoading(true);
        try {
            // Fetch all recent patients then filter client-side or server-side
            // Passing searchTerm to server if supported, else filter locally
            const data = await fetchLabPatients(refresh);
            if (data.success) {
                setPatients(data.data);
                setFetched(true);
                if (refresh) toast.success("List refreshed from Lab");
            } else {
                toast.error(data.message || 'Failed to fetch patients');
            }
        } catch (error) {
            toast.error('Error connecting to lab service');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-load when opened
    React.useEffect(() => {
        if (open && !fetched) {
            loadPatients();
        }
    }, [open]);

    // Filter patients based on search term
    const filteredPatients = patients.filter(p =>
        !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleImport = async (patient: any) => {
        setImporting(true);
        try {
            // Trigger the actual import (scrape & analyze)
            // We pass the full patient object which contains the ID/MRN needed to find the row
            await onImport(patient);
            onOpenChange(false);
        } catch (error) {
            console.error("Import failed", error);
            // toast handled by parent or api
        } finally {
            setImporting(false);
        }
    };

    const handleSyncAll = async () => {
        if (!confirm("This will trigger a background sync for ALL currently admitted patients. Continue?")) return;

        try {
            await import('@/api/labApi').then(mod => mod.syncAllLabs());
            toast.success("Sync started in background");
        } catch (error) {
            toast.error("Failed to trigger sync");
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-8">
                        <DialogTitle>Import from Lab For Me</DialogTitle>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleSyncAll}>
                            Sync All
                        </Button>
                    </div>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Filter by Patient Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button variant="outline" onClick={() => loadPatients(true)} disabled={loading || importing}>
                            Refresh
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Fetching patient list...</p>
                        </div>
                    ) : importing ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Importing & Analyzing Report...</p>
                            <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            {filteredPatients.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground p-4">
                                    {patients.length === 0 ? "No patients found." : "No matching patients."}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {filteredPatients.map((patient: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border">
                                            <div className="text-left">
                                                <div className="font-medium">{patient.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {patient.date} • MRN: {patient.mrn}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleImport(patient)}
                                            >
                                                Import
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
