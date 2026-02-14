
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import SpecialistNoteForm from './SpecialistNoteForm';
import { apiClient } from '../../api/client';

interface HandoverTabProps {
    patientId: string;
}

export default function HandoverTab({ patientId }: HandoverTabProps) {
    const [showForm, setShowForm] = useState(false);
    const [notes, setNotes] = useState<any[]>([]);
    const [expandedNote, setExpandedNote] = useState<string | null>(null);

    const fetchNotes = async () => {
        try {
            const data = await apiClient.get<any[]>(`/specialist/patient/${patientId}`);
            setNotes(data || []);
        } catch (error) {
            console.error("Failed to fetch notes", error);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [patientId]);

    const handleSuccess = () => {
        setShowForm(false);
        fetchNotes();
    };

    const latestNote = notes.length > 0 ? notes[0] : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Specialist Handover Notes</h2>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> New Note</>}
                </Button>
            </div>

            {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <SpecialistNoteForm
                        patientId={patientId}
                        onSuccess={handleSuccess}
                        initialData={latestNote}
                    />
                </div>
            )}

            <div className="space-y-4">
                {notes.length === 0 && !showForm && (
                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded border border-dashed">
                        No handover notes recorded.
                    </div>
                )}

                {notes.map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-slate-800">
                        <CardHeader
                            className="bg-slate-50 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <FileText className="w-5 h-5 text-slate-700" />
                                    <div>
                                        <CardTitle className="text-base">
                                            Handover Note - {new Date(note.date).toLocaleDateString()}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            Author: {note.author?.name || 'Unknown'} | APACHE: {note.apacheScore || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                {expandedNote === note.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                        </CardHeader>

                        {expandedNote === note.id && (
                            <CardContent className="p-6 space-y-4 text-sm animate-in fade-in">
                                {/* Summary View of the note */}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div>
                                        <h4 className="font-bold underline mb-1">Background</h4>
                                        <ul className="list-disc pl-5">
                                            {note.histHT && <li>HT</li>}
                                            {note.histDM && <li>DM</li>}
                                            {note.histAsthma && <li>Asthma</li>}
                                            {note.histCOPD && <li>COPD</li>}
                                            {note.histIHD && <li>IHD</li>}
                                            {note.histStroke && <li>Stroke</li>}
                                            {note.histOther && <li>{note.histOther}</li>}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-bold underline mb-1">Status</h4>
                                        <p>GCS: {note.neuroGCS} | RASS: {note.neuroRASS}</p>
                                        <p>Vent: {note.respVentModeText || "None"} | FiO2: {note.respFio2}</p>
                                        <p>Hemo: {note.hemoStable ? "Stable" : "Unstable"} {note.hemoVasopressor && "(Vasopressors)"}</p>
                                    </div>
                                </div>

                                {note.clinicalNotes && (
                                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                                        <h4 className="font-bold text-yellow-800 mb-1">Notes</h4>
                                        <p>{note.clinicalNotes}</p>
                                    </div>
                                )}

                                <div className="border-t pt-2">
                                    <h4 className="font-bold mb-2">Plan</h4>
                                    <div className="grid grid-cols-1 gap-1 text-slate-700">
                                        {note.planVentilatory && <p><span className="font-semibold">Ventilatory:</span> {note.planVentilatory}</p>}
                                        {note.planPhysio && <p><span className="font-semibold">Physio:</span> {note.planPhysio}</p>}
                                        {note.planConsult && <p><span className="font-semibold">Consult:</span> {note.planConsult}</p>}
                                        {note.planInvestigation && <p><span className="font-semibold">Investigations:</span> {note.planInvestigation}</p>}
                                        {note.planFuture && <p><span className="font-semibold">Future:</span> {note.planFuture}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
