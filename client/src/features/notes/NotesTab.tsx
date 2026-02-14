
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { notesApi, ClinicalNote, NoteType } from '../../api/notesApi';
import { User } from 'lucide-react';
import CreateNoteDialog from './CreateNoteDialog';

interface NotesTabProps {
    patientId: string;
}

export default function NotesTab({ patientId }: NotesTabProps) {
    const [notes, setNotes] = useState<ClinicalNote[]>([]);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const data = await notesApi.getAll(patientId, filterType === 'ALL' ? undefined : filterType as NoteType);
            setNotes(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [patientId, filterType]);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ADMISSION': return 'bg-purple-100 text-purple-800';
            case 'PROCEDURE': return 'bg-red-100 text-red-800';
            case 'NURSING': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium">Clinical Documentation</h3>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Notes</SelectItem>
                            <SelectItem value="ADMISSION">Admission</SelectItem>
                            <SelectItem value="PROGRESS">Progress</SelectItem>
                            <SelectItem value="PROCEDURE">Procedure</SelectItem>
                            <SelectItem value="NURSING">Nursing</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <CreateNoteDialog patientId={patientId} onNoteCreated={fetchNotes} />
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center p-8 text-muted-foreground">Loading notes...</div>
                ) : notes.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                        No notes found. Start by creating an Admission or Progress note.
                    </div>
                ) : (
                    notes.map(note => (
                        <Card key={note.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className={getTypeColor(note.type)}>
                                            {note.type}
                                        </Badge>
                                        <CardTitle className="text-lg">{note.title}</CardTitle>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(note.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <User className="w-3 h-3" />
                                    <span className="font-medium">{note.author.name}</span>
                                    <span>({note.author.role})</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-slate-50 p-4 rounded-md text-sm font-mono whitespace-pre-wrap leading-relaxed border">
                                    {note.content}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
