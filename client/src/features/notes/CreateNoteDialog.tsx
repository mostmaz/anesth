
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { notesApi, NoteType } from '../../api/notesApi';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CreateNoteDialogProps {
    patientId: string;
    onNoteCreated: () => void;
}

const TEMPLATES: Record<NoteType, string> = {
    ADMISSION: "Chief Complaint:\n\nHPI:\n\nPMH:\n\nPlan:",
    PROGRESS: "Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:",
    PROCEDURE: "Procedure:\nIndication:\nOperator:\nConsent:\nTechnique:\nComplications:\nResults:",
    DISCHARGE: "Diagnosis:\n\nHospital Course:\n\nDischarge Meds:\n\nFollow-up:",
    NURSING: "Shift Summary:\n\nSkin/Wound Care:\n\nLines/Drains:",
    CONSULT: "Reason for Consult:\n\nRecommendations:",
    OTHER: ""
};

export default function CreateNoteDialog({ patientId, onNoteCreated }: CreateNoteDialogProps) {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<NoteType>('PROGRESS');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(TEMPLATES['PROGRESS']);

    useEffect(() => {
        setContent(TEMPLATES[type] || "");
    }, [type]);

    const handleSubmit = async () => {
        if (!user) return;
        if (!title) {
            toast.error("Title is required");
            return;
        }

        try {
            await notesApi.create({
                patientId,
                authorId: user.id,
                type,
                title,
                content
            });
            toast.success("Note saved");
            setOpen(false);
            onNoteCreated();
            setTitle('');
            // Reset to default
            setType('PROGRESS');
        } catch (error) {
            toast.error("Failed to save note");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> New Note
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>New Clinical Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v) => setType(v as NoteType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMISSION">Admission Note</SelectItem>
                                    <SelectItem value="PROGRESS">Daily Progress Note</SelectItem>
                                    <SelectItem value="PROCEDURE">Procedure Note</SelectItem>
                                    <SelectItem value="NURSING">Nursing Note</SelectItem>
                                    <SelectItem value="CONSULT">Consultation</SelectItem>
                                    <SelectItem value="DISCHARGE">Discharge Summary</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Daily Rounds, Central Line Insertion"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                            className="min-h-[300px] font-mono whitespace-pre-wrap"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Note</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
