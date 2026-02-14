
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { investigationsApi } from '@/api/investigationsApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ResultTrendChartProps {
    patientId: string;
    parameterName: string;
    testName: string; // Optional: to filter only similar tests?
    onClose: () => void;
}

export function ResultTrendChart({ patientId, parameterName, testName, onClose }: ResultTrendChartProps) {

    // Fetch all investigations for the patient to extract history
    // In a real app, we might want a dedicated endpoint for this, but client-side filtering works for now.
    const { data: investigations, isLoading } = useQuery({
        queryKey: ['investigations', patientId],
        queryFn: () => investigationsApi.getAll(patientId),
    });

    // Process data for the chart
    const chartData = investigations
        ?.filter(inv => inv.result && inv.result[parameterName] !== undefined) // Must have the parameter
        .map(inv => {
            const rawValue = inv.result[parameterName];
            // Try to parse number if possible, currently simple parsing
            const numericValue = parseFloat(String(rawValue).replace(/[^0-9.-]/g, ''));

            return {
                date: new Date(inv.conductedAt).toLocaleDateString(),
                timestamp: new Date(inv.conductedAt).getTime(),
                value: isNaN(numericValue) ? 0 : numericValue,
                originalValue: rawValue
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp) || [];

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Trend: {parameterName} {testName ? `(${testName})` : ''}</DialogTitle>
                    <DialogDescription>
                        History of {parameterName} updates.
                    </DialogDescription>
                </DialogHeader>

                <div className="h-[300px] w-full mt-4">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No historical data found for this parameter.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
