import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';

interface TrendChartProps {
    title: string;
    data: any[];
    dataKey: string;
    color: string;
    unit: string;
    min?: number;
    max?: number;
    thresholdHigh?: number;
    thresholdLow?: number;
}

export default function TrendChart({
    title,
    data,
    dataKey,
    color,
    unit,
    min,
    max,
    thresholdHigh,
    thresholdLow
}: TrendChartProps) {
    const latestValue = data.length > 0 ? data[data.length - 1][dataKey] : '--';
    const isCritical = thresholdHigh && latestValue > thresholdHigh || thresholdLow && latestValue < thresholdLow;

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn(
                    "text-2xl font-bold",
                    isCritical ? "text-red-500 animate-pulse" : "text-foreground"
                )}>
                    {latestValue} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[min || 'auto', max || 'auto']} hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px', color: '#f8fafc' }}
                            />
                            {thresholdHigh && <ReferenceLine y={thresholdHigh} stroke="red" strokeDasharray="3 3" opacity={0.5} />}
                            {thresholdLow && <ReferenceLine y={thresholdLow} stroke="red" strokeDasharray="3 3" opacity={0.5} />}
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                fillOpacity={1}
                                fill={`url(#color-${dataKey})`}
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
