
import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { UserPlus, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { patientApi } from '../../api/patientApi';
import { uploadApi } from '../../api/uploadApi';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';

export interface Consultation {
    id: string;
    patientId: string;
    authorId: string;
    doctorName: string;
    specialty: string;
    imageUrl?: string;
    notes?: string;
    timestamp: string;
}

interface ConsultationTabProps {
    patientId: string;
}

export default function ConsultationTab({ patientId }: ConsultationTabProps) {
    const user = useAuthStore(state => state.user);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newConsult, setNewConsult] = useState({
        doctorName: '',
        specialty: '',
        notes: '',
        imageUrl: ''
    });

    const fetchConsultations = async () => {
        try {
            const data = await patientApi.getConsultations(patientId) as Consultation[];
            setConsultations(data);
        } catch (error) {
            console.error("Failed to fetch consultations", error);
            toast.error("Failed to load consultations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsultations();
    }, [patientId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploaded = await uploadApi.uploadImages([file]);
            setNewConsult({ ...newConsult, imageUrl: uploaded[0].url });
            toast.success("File uploaded successfully");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleAdd = async () => {
        if (!user) return;
        if (!newConsult.doctorName || !newConsult.specialty) {
            toast.error("Please fill doctor name and specialty");
            return;
        }

        setIsSubmitting(true);
        try {
            await patientApi.addConsultation(patientId, {
                ...newConsult,
                authorId: user.id
            });
            toast.success("Consultation saved");
            fetchConsultations();
            setNewConsult({ doctorName: '', specialty: '', notes: '', imageUrl: '' });
        } catch (error) {
            console.error("Failed to save consultation", error);
            toast.error("Failed to save consultation");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading consultations...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" /> Add Consultation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Doctor Name</Label>
                            <Input placeholder="Dr. Name" value={newConsult.doctorName} onChange={e => setNewConsult({ ...newConsult, doctorName: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Specialty</Label>
                            <Input placeholder="e.g. Cardiology" value={newConsult.specialty} onChange={e => setNewConsult({ ...newConsult, specialty: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes / Recommendation</Label>
                            <textarea
                                className="w-full h-32 p-3 bg-slate-50 border rounded-lg text-sm"
                                placeholder="Enter consultant's notes..."
                                value={newConsult.notes}
                                onChange={e => setNewConsult({ ...newConsult, notes: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Report Image / PDF</Label>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*,application/pdf"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${newConsult.imageUrl ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-blue-400'
                                    }`}
                            >
                                {uploading ? (
                                    <Loader2 className="w-8 h-8 text-blue-400 mx-auto animate-spin" />
                                ) : (
                                    <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${newConsult.imageUrl ? 'text-green-500' : 'text-slate-400'}`} />
                                )}
                                <p className="text-xs text-slate-500">
                                    {uploading ? 'Uploading...' : newConsult.imageUrl ? 'File uploaded!' : 'Click to upload report'}
                                </p>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleAdd} disabled={isSubmitting || uploading}>
                            {isSubmitting ? 'Saving...' : 'Save Consultation'}
                        </Button>
                    </CardContent>
                </Card>

                <div className="lg:col-span-3 space-y-4">
                    {consultations.length > 0 ? consultations.map((c) => (
                        <Card key={c.id}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{c.specialty} Consultation</h3>
                                        <p className="text-sm text-slate-500">By Dr. {c.doctorName}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm italic text-slate-600 mb-4">
                                    "{c.notes}"
                                </div>
                                {c.imageUrl && (
                                    <div className="mt-4 flex gap-4">
                                        <a
                                            href={(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001') + c.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <FileText className="w-4 h-4" /> View Full Report
                                            </Button>
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="bg-white p-12 text-center rounded-xl border border-dashed text-slate-400 italic">
                            No consultation reports uploaded yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
