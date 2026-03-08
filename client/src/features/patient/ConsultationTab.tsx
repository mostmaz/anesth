
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Microscope, UserPlus, FileText, Image as ImageIcon } from 'lucide-react';

interface ConsultationTabProps {
    patientId: string;
}

export default function ConsultationTab({ patientId }: ConsultationTabProps) {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [newConsult, setNewConsult] = useState({
        doctorName: '',
        specialty: '',
        notes: '',
        fileUrl: ''
    });

    const handleAdd = () => {
        setConsultations([{
            id: Date.now().toString(),
            ...newConsult,
            date: new Date().toISOString()
        }, ...consultations]);
        setNewConsult({ doctorName: '', specialty: '', notes: '', fileUrl: '' });
    };

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
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Click to upload report</p>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleAdd}>Save Consultation</Button>
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
                                    <span className="text-xs text-slate-400">{new Date(c.date).toLocaleString()}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm italic text-slate-600">
                                    "{c.notes}"
                                </div>
                                <div className="mt-4 flex gap-4">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <FileText className="w-4 h-4" /> View Full Report
                                    </Button>
                                </div>
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
