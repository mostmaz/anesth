
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import BodyMap from './BodyMap';
import SkinAssessmentDialog from './SkinAssessmentDialog';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Calendar, User, MapPin } from 'lucide-react';

interface SkinAssessment {
    id: string;
    bodyPart: string;
    view: 'FRONT' | 'BACK';
    type: 'LESION' | 'DRESSING';
    imageUrl: string | null;
    notes: string | null;
    timestamp: Date;
    author: {
        name: string;
        role: string;
    };
}

interface NursingTabProps {
    patientId: string;
}

export default function NursingTab({ patientId }: NursingTabProps) {
    const { user } = useAuthStore();
    const [assessments, setAssessments] = useState<SkinAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPart, setSelectedPart] = useState<{ part: string; view: 'FRONT' | 'BACK' } | null>(null);

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get<SkinAssessment[]>(`/skin/${patientId}`);
            setAssessments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssessments();
    }, [patientId]);

    const handleSelectPart = (part: string, view: 'FRONT' | 'BACK') => {
        setSelectedPart({ part, view });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle className="text-lg">Body Map Selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BodyMap
                            onSelectPart={handleSelectPart}
                            highlightedParts={assessments.map(a => a.bodyPart.toLowerCase())}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle>Skin Assessment History</CardTitle>
                            <span className="text-xs text-muted-foreground">{assessments.length} Record(s)</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : assessments.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                    No skin assessments found. Select a body part on the map to start documentation.
                                </div>
                            ) : (
                                assessments.map((assessment) => (
                                    <div key={assessment.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={assessment.type === 'LESION' ? 'destructive' : 'secondary'}>
                                                    {assessment.type}
                                                </Badge>
                                                <h4 className="font-semibold text-slate-800 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {assessment.bodyPart} ({assessment.view})
                                                </h4>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(assessment.timestamp).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            {assessment.imageUrl && (
                                                <div className="w-24 h-24 rounded border overflow-hidden flex-shrink-0">
                                                    <a href={assessment.imageUrl} target="_blank" rel="noreferrer">
                                                        <img src={assessment.imageUrl} alt="Skin" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                                                    </a>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-600 italic whitespace-pre-wrap">
                                                    {assessment.notes || "No notes provided."}
                                                </p>
                                                <div className="flex items-center gap-2 mt-3 pt-2 border-t text-[10px] text-slate-400">
                                                    <User className="w-2 h-2" />
                                                    <span>By {assessment.author.name} ({assessment.author.role})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {selectedPart && user && (
                <SkinAssessmentDialog
                    open={!!selectedPart}
                    onOpenChange={(open) => !open && setSelectedPart(null)}
                    patientId={patientId}
                    authorId={user.id}
                    bodyPart={selectedPart.part}
                    view={selectedPart.view}
                    onSuccess={fetchAssessments}
                />
            )}
        </div>
    );
}
