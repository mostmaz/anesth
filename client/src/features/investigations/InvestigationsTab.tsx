
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { investigationsApi, Investigation } from '../../api/investigationsApi';
import { FileText, Microscope, Search, Filter, Trash2, RotateCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { patientApi } from '../../api/patientApi';

import { UploadExternalResultDialog } from './components/UploadExternalResultDialog';
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog';
import { Eye } from 'lucide-react';
import { InvestigationDetailDialog } from './components/InvestigationDetailDialog';


interface InvestigationsTabProps {
    patientId: string;
    defaultTab?: 'labs' | 'imaging' | 'cardiology';
}

export default function InvestigationsTab({ patientId, defaultTab }: InvestigationsTabProps) {
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTestName, setSelectedTestName] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(defaultTab || 'labs');
    const [patient, setPatient] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchInvestigations = async () => {
        try {
            const data = await investigationsApi.getAll(patientId);
            console.log("Fetched investigations for patient:", data);
            setInvestigations(data);
        } catch (error) {
            console.error("Failed to load investigations", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatient = async () => {
        try {
            const data = await patientApi.getPatient(patientId);
            setPatient(data);
        } catch (error) {
            console.error("Failed to load patient", error);
        }
    };

    const handleSync = async () => {
        if (!patient) return;
        setIsSyncing(true);
        try {
            // Get current user from localStorage or auth state if possible
            const authData = localStorage.getItem('auth_storage');
            const currentUser = authData ? JSON.parse(authData).state?.user : null;
            const authorId = currentUser?.id || 'manual-sync';

            await investigationsApi.sync({
                patientId,
                mrn: patient.mrn,
                name: patient.name,
                authorId
            }, { timeout: 300000 }); // 5 minutes
            await fetchInvestigations();
            alert("Sync completed successfully!");
        } catch (error) {
            console.error("Sync failed", error);
            alert("Failed to sync with lab portal.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this investigation?')) return;

        setDeletingId(id);
        try {
            console.log("Deleting investigation:", id);
            await investigationsApi.delete(id);
            setInvestigations(prev => prev.filter(i => i.id !== id));
            // We can import toast here if needed, but console log is good for now.
        } catch (error) {
            console.error("Failed to delete investigation", error);
            alert("Failed to delete investigation. See console for details.");
            fetchInvestigations();
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteAll = async () => {
        setIsDeletingAll(true);
        try {
            await investigationsApi.deleteAll(patientId);
            setInvestigations([]);
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error("Failed to delete all investigations", error);
            alert("Failed to delete all investigations.");
            fetchInvestigations();
        } finally {
            setIsDeletingAll(false);
        }
    };

    useEffect(() => {
        fetchPatient();
        fetchInvestigations();
    }, [patientId]);

    // Helper to normalize test names
    const normalizeTestName = (name: string) => {
        const n = name.trim().toLowerCase();
        if (n === 'cbc' || n === 'complete blood count' || n === 'complete blood count with differential') return 'CBC';
        if (n === 'crp' || n.includes('c-reactive protein')) return 'CRP';
        if (n === 'procalcitonin' || n.includes('procalcitonin')) return 'Procalcitonin';
        if (n.includes('renal') || n.includes('kidney') || n === 'urea' || n === 'creatinine') return 'Renal Function';
        if (n.includes('electrolyte') || n === 'sodium' || n === 'potassium' || n === 'chloride') return 'Electrolytes';
        if (n === 'abg' || n.includes('arterial blood gas')) return 'ABG';
        if (n.includes('viral') || n.includes('virology')) return 'Virology';

        // Simple Title Case for others to ensure distinct casing doesn't create duplicates
        return name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    };

    // unique test names
    const uniqueTestNames = Array.from(new Set(investigations.map(i => normalizeTestName(i.title)))).sort();

    const filteredInvestigations = investigations.filter(i => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            i.title.toLowerCase().includes(term) ||
            (i.impression && i.impression.toLowerCase().includes(term)) ||
            (i.result && JSON.stringify(i.result).toLowerCase().includes(term));

        const matchesTest = selectedTestName === 'all' || normalizeTestName(i.title) === selectedTestName;
        const matchesDate = !selectedDate || i.conductedAt.startsWith(selectedDate);
        return matchesSearch && matchesTest && matchesDate;
    });

    // Logic to distinguish Cardiology (ECG, ECHO)
    const isCardio = (i: Investigation) => {
        const t = i.title.toLowerCase();
        const c = i.category ? i.category.toLowerCase() : '';
        return t.includes('ecg') || t.includes('echo') || c === 'cardiology';
    };

    const labs = filteredInvestigations.filter(i => i.type === 'LAB' && !isCardio(i));
    const imaging = filteredInvestigations.filter(i => i.type === 'IMAGING' && !isCardio(i));
    const cardiology = filteredInvestigations.filter(i => isCardio(i));

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading results...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                    {activeTab === 'labs' ? 'Laboratory Investigations' :
                        activeTab === 'cardiology' ? 'Cardiology' : 'Radiology'}
                </h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing || !patient}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                    >
                        <RotateCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync with Lab'}
                    </Button>
                    <UploadExternalResultDialog patientId={patientId} onSuccess={fetchInvestigations} activeTab={activeTab} />
                    {investigations.length > 0 && (
                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={isDeletingAll}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {isDeletingAll ? 'Deleting...' : 'Delete All'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <div className="p-4 space-y-4">
                                    <h3 className="text-lg font-medium text-red-600 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" /> Delete All Investigations
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Are you sure you want to delete ALL investigations for this patient? This action cannot be undone.
                                    </p>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingAll}>
                                            Cancel
                                        </Button>
                                        <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeletingAll}>
                                            {isDeletingAll ? 'Deleting...' : 'Yes, Delete All'}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by test name..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedTestName} onValueChange={setSelectedTestName}>
                    <SelectTrigger className="w-[200px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by Test" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tests</SelectItem>
                        {uniqueTestNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="w-[180px]">
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {!defaultTab && (
                    <TabsList className="w-full justify-start">
                        <TabsTrigger value="labs">
                            <Microscope className="w-4 h-4 mr-2" />
                            Laboratory ({labs.length})
                        </TabsTrigger>
                        <TabsTrigger value="imaging">Imaging ({imaging.length})</TabsTrigger>
                        <TabsTrigger value="cardiology">Cardiology ({cardiology.length})</TabsTrigger>
                    </TabsList>
                )}

                <TabsContent value="labs" className="mt-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Date</TableHead>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[150px]">Files</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {labs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No lab results found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    labs.map(lab => {
                                        const isAbnormal = lab.result && typeof lab.result === 'object' &&
                                            Object.values(lab.result).some((v: any) => typeof v === 'object' && v !== null && (v as any).isAbnormal === true);

                                        return (
                                            <TableRow key={lab.id} className={isAbnormal ? "bg-rose-50/20" : ""}>
                                                <TableCell className="font-mono text-xs">
                                                    {new Date(lab.conductedAt).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            className="font-medium hover:underline text-primary text-left"
                                                            onClick={() => setSelectedInvestigation(lab)}
                                                        >
                                                            {normalizeTestName(lab.title)}
                                                            {normalizeTestName(lab.title) !== lab.title && (
                                                                <span className="text-xs text-muted-foreground ml-2">({lab.title})</span>
                                                            )}
                                                        </button>
                                                        {isAbnormal && (
                                                            <Badge variant="destructive" className="text-[8px] h-4 px-1 uppercase animate-pulse">
                                                                Abnormal
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={lab.status === 'FINAL' ? 'secondary' : 'outline'}>
                                                        {lab.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 items-center">
                                                        {lab.result?.imageUrl && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                                                        <Eye className="w-4 h-4" />
                                                                        <span className="sr-only">View Image</span>
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-0">
                                                                    <div className="p-4 bg-black/5 flex justify-center items-center min-h-[200px]">
                                                                        {lab.result.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                                                            <div className="text-center py-20 px-10">
                                                                                <p className="mb-4 text-muted-foreground text-lg">This report is a PDF document.</p>
                                                                                <Button size="lg" onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${lab.result.imageUrl}`, '_blank')}>
                                                                                    <FileText className="w-5 h-5 mr-3" />
                                                                                    Click here to open PDF in a new tab
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <img
                                                                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${lab.result.imageUrl}`}
                                                                                alt="Result"
                                                                                className="max-w-full h-auto rounded shadow-sm"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                        {lab.pdfFilename ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-rose-50"
                                                                onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}/uploads/${lab.pdfFilename}.pdf`, '_blank')}
                                                                title="View Original PDF"
                                                            >
                                                                <FileText className="w-4 h-4 mr-1" />
                                                                PDF
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                                onClick={() => {
                                                                    const fn = prompt("Enter PDF filename (without extension):");
                                                                    if (fn) {
                                                                        investigationsApi.update(lab.id, { pdfFilename: fn }).then(() => fetchInvestigations());
                                                                    }
                                                                }}
                                                                title="Link PDF"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                <span className="text-[10px] ml-1">Link</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(lab.id)}
                                                        disabled={deletingId === lab.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="imaging" className="mt-4 space-y-4">
                    {imaging.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg bg-slate-50">
                            No imaging reports
                        </div>
                    ) : imaging.map(img => (
                        <Card key={img.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            <button
                                                className="hover:underline text-left font-medium"
                                                onClick={() => setSelectedInvestigation(img)}
                                            >
                                                {img.title}
                                            </button>
                                        </CardTitle>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {new Date(img.conductedAt).toLocaleString()} • {img.category}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant={img.status === 'FINAL' ? 'default' : 'secondary'}>
                                            {img.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(img.id);
                                            }}
                                            disabled={deletingId === img.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-slate-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap">
                                    {img.result?.imageUrl ? (
                                        <div className="space-y-2">
                                            {img.result.text && <p className="mb-2">{img.result.text}</p>}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Image
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-0">
                                                    <div className="p-4 bg-black/5 flex justify-center items-center min-h-[200px]">
                                                        {img.result.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                                            <div className="text-center py-20 px-10">
                                                                <p className="mb-4 text-muted-foreground text-lg">This report is a PDF document.</p>
                                                                <Button size="lg" onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${img.result.imageUrl}`, '_blank')}>
                                                                    <FileText className="w-5 h-5 mr-3" />
                                                                    Click here to open PDF in a new tab
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${img.result.imageUrl}`}
                                                                alt="Investigation result"
                                                                className="max-w-full h-auto rounded shadow-sm"
                                                            />
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    ) : (
                                        img.impression || JSON.stringify(img.result)
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-right text-muted-foreground">
                                    Reported by: {img.author.name}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
                <TabsContent value="cardiology" className="mt-4 space-y-4">
                    {cardiology.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg bg-slate-50">
                            No cardiology records found
                        </div>
                    ) : cardiology.map(img => (
                        <Card key={img.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            <button
                                                className="hover:underline text-left font-medium"
                                                onClick={() => setSelectedInvestigation(img)}
                                            >
                                                {img.title}
                                            </button>
                                        </CardTitle>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {new Date(img.conductedAt).toLocaleString()} • {img.category}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant={img.status === 'FINAL' ? 'default' : 'secondary'}>
                                            {img.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(img.id);
                                            }}
                                            disabled={deletingId === img.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-slate-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap">
                                    {img.result?.imageUrl ? (
                                        <div className="space-y-2">
                                            {img.result.text && <p className="mb-2">{img.result.text}</p>}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Image
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-0">
                                                    <div className="p-4 bg-black/5 flex justify-center items-center min-h-[200px]">
                                                        {img.result.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                                            <div className="text-center py-20 px-10">
                                                                <p className="mb-4 text-muted-foreground text-lg">This report is a PDF document.</p>
                                                                <Button size="lg" onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${img.result.imageUrl}`, '_blank')}>
                                                                    <FileText className="w-5 h-5 mr-3" />
                                                                    Click here to open PDF in a new tab
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${img.result.imageUrl}`}
                                                                alt="Investigation result"
                                                                className="max-w-full h-auto rounded shadow-sm"
                                                            />
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    ) : (
                                        img.impression || JSON.stringify(img.result)
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-right text-muted-foreground">
                                    Reported by: {img.author.name}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>

            <InvestigationDetailDialog
                investigation={selectedInvestigation}
                onClose={() => setSelectedInvestigation(null)}
                patientId={patientId}
            />

        </div>
    );
}
