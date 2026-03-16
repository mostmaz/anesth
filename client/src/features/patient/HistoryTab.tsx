
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { patientApi, type TimelineEvent } from '../../api/patientApi';
import { Clock, Search } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from "@/lib/utils";
import { Input } from '../../components/ui/input';

interface HistoryTabProps {
    patientId: string;
}

export default function HistoryTab({ patientId }: HistoryTabProps) {
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const t = await patientApi.getTimeline(patientId);
                setTimeline(t || []);
            } catch (error) {
                console.error("Failed to fetch timeline", error);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) fetchHistory();
    }, [patientId]);

    const filteredTimeline = timeline.filter(event =>
        event.title.toLowerCase().includes(filter.toLowerCase()) ||
        event.details?.toLowerCase().includes(filter.toLowerCase()) ||
        event.type.toLowerCase().includes(filter.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading history...</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0 py-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" /> Patient Activity History
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search history..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-[2.25rem] top-2 bottom-2 w-px bg-slate-200 border-dashed" />

                        <div className="space-y-8">
                            {filteredTimeline.map((event, idx) => (
                                <div key={`${event.type}-${event.id}-${idx}`} className="relative pl-16">
                                    {/* Date Header for first event of a day */}
                                    {(idx === 0 || new Date(event.timestamp).toLocaleDateString() !== new Date(timeline[idx - 1].timestamp).toLocaleDateString()) && (
                                        <div className="absolute left-0 -top-6 mb-4">
                                            <Badge variant="outline" className="bg-white text-slate-500 font-bold border-slate-200">
                                                {new Date(event.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Dot */}
                                    <div className={cn(
                                        "absolute left-[1.95rem] top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center",
                                        event.type === 'MEDICATION' ? "bg-blue-500" :
                                            event.type === 'ORDER' ? "bg-purple-500" :
                                                event.type === 'INVESTIGATION' ? "bg-emerald-500" :
                                                    event.type === 'CONSULTATION' ? "bg-amber-500" : "bg-slate-400"
                                    )} />

                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{event.title}</h4>
                                                <p className="text-xs text-slate-400 font-medium">
                                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] font-bold uppercase",
                                                event.status === 'STARTED' || event.status === 'COMPLETED' || event.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                    event.status === 'STOPPED' || event.status === 'DISCONTINUED' ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-50 text-slate-600 border-slate-200"
                                            )}>
                                                {event.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-50">
                                            {event.details}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {filteredTimeline.length === 0 && (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 italic">No activity matching your search</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
