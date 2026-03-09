
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Investigation } from '@/api/investigationsApi';
import { Button } from '@/components/ui/button';
import { TrendingUp, FileText } from 'lucide-react';
import { useState } from 'react';
import { ResultTrendChart } from './ResultTrendChart';

interface InvestigationDetailDialogProps {
    investigation: Investigation | null;
    onClose: () => void;
    patientId: string;
}

export function InvestigationDetailDialog({ investigation, onClose, patientId }: InvestigationDetailDialogProps) {
    const [selectedParameter, setSelectedParameter] = useState<string | null>(null);

    if (!investigation) return null;

    const result = investigation.result || {};
    // Extract renderable entries (exclude imageUrl, text, etc.)
    const entries = Object.entries(result)
        .filter(([key]) => {
            const lowerKey = key.toLowerCase();
            const lowerTitle = investigation.title.toLowerCase();
            const isABG = lowerTitle.includes('abg') || lowerTitle.includes('arterial blood gas');

            if (isABG) return key !== 'imageUrl' && key !== 'text' && key !== 'note';

            return key !== 'imageUrl' &&
                key !== 'text' &&
                key !== 'note' &&
                !lowerKey.includes('previous result') &&
                !lowerKey.includes('(previous result)');
        })
        .map(([key, val]) => {
            const lowerTitle = investigation.title.toLowerCase();
            const isABG = lowerTitle.includes('abg') || lowerTitle.includes('arterial blood gas');

            if (isABG) return [key, val];

            // Clean key if it contains (Previous Result) but wasn't filtered out for some reason
            return [key.replace(/\s*\(Previous Result\)/gi, ''), val];
        });

    return (
        <Dialog open={!!investigation} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{investigation.title}</DialogTitle>
                    <DialogDescription>
                        {new Date(investigation.conductedAt).toLocaleString()} • {investigation.category}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Image Section */}
                    {result.imageUrl && (
                        <div className="bg-slate-50 p-4 rounded-lg flex justify-center w-full">
                            {result.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                <div className="text-center py-10">
                                    <p className="mb-4 text-muted-foreground">This report is a PDF document.</p>
                                    <Button onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${result.imageUrl}`, '_blank')}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Click here to open PDF in a new tab
                                    </Button>
                                </div>
                            ) : (
                                <img
                                    src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}${result.imageUrl}`}
                                    alt="Investigation Result"
                                    className="max-h-[300px] w-auto rounded shadow-sm"
                                />
                            )}
                        </div>
                    )}

                    {/* Results Table */}
                    {entries.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Parameter</th>
                                        <th className="px-4 py-3 text-left font-medium">Value</th>
                                        <th className="px-4 py-3 text-left font-medium">Normal Range</th>
                                        <th className="px-4 py-3 text-right font-medium">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {entries.map(([key, val]) => {
                                        const isObject = typeof val === 'object' && val !== null && 'value' in (val as any);
                                        const value = isObject ? (val as any).value : val;
                                        const range = isObject ? (val as any).range : '-';
                                        const isAbnormal = isObject ? (val as any).isAbnormal : false;

                                        return (
                                            <tr key={key as string} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium">{key as string}</td>
                                                <td className={`px-4 py-3 font-bold text-base ${isAbnormal ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {String(value)}
                                                    {isAbnormal && <span className="ml-2 text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase">H/L</span>}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{range || '-'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setSelectedParameter(key as string)}
                                                    >
                                                        <TrendingUp className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 border rounded-lg bg-slate-50 text-center text-muted-foreground">
                            {result.text || investigation.impression || "No structured results available."}
                        </div>
                    )}

                    {/* Impression/Notes */}
                    {(investigation.impression || result.note) && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Impression / Notes</h4>
                            <div className="p-3 bg-slate-50 rounded-md text-sm whitespace-pre-wrap">
                                {investigation.impression || result.note}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Trend Chart Dialog */}
            {selectedParameter && (
                <ResultTrendChart
                    patientId={patientId}
                    parameterName={selectedParameter}
                    testName={investigation.title} // Scope to this test type? Maybe useful.
                    onClose={() => setSelectedParameter(null)}
                />
            )}
        </Dialog>
    );
}
