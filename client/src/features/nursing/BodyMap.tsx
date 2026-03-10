
import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

interface BodyMapProps {
    onSelectPart: (part: string, view: 'FRONT' | 'BACK') => void;
    highlightedParts?: string[];
}

export default function BodyMap({ onSelectPart, highlightedParts = [] }: BodyMapProps) {
    const [view, setView] = useState<'FRONT' | 'BACK'>('FRONT');

    const frontRegions = [
        { id: 'head', label: 'Head', path: 'M50,10 A8,8 0 1,1 50,26 A8,8 0 1,1 50,10' },
        { id: 'chest', label: 'Chest', path: 'M40,28 L60,28 L62,45 L38,45 Z' },
        { id: 'abdomen', label: 'Abdomen', path: 'M38,47 L62,47 L60,60 L40,60 Z' },
        { id: 'l-arm', label: 'Left Arm', path: 'M36,28 L28,55 L32,57 L38,30 Z' },
        { id: 'r-arm', label: 'Right Arm', path: 'M64,28 L72,55 L68,57 L62,30 Z' },
        { id: 'l-leg', label: 'Left Leg', path: 'M40,62 L35,95 L42,95 L48,62 Z' },
        { id: 'r-leg', label: 'Right Leg', path: 'M60,62 L65,95 L58,95 L52,62 Z' },
    ];

    const backRegions = [
        { id: 'back-head', label: 'Back Head', path: 'M50,10 A8,8 0 1,1 50,26 A8,8 0 1,1 50,10' },
        { id: 'upper-back', label: 'Upper Back', path: 'M40,28 L60,28 L62,45 L38,45 Z' },
        { id: 'sacrum', label: 'Sacrum/Lower Back', path: 'M38,47 L62,47 L60,60 L40,60 Z' },
        { id: 'l-arm-back', label: 'Left Arm (Back)', path: 'M36,28 L28,55 L32,57 L38,30 Z' },
        { id: 'r-arm-back', label: 'Right Arm (Back)', path: 'M64,28 L72,55 L68,57 L62,30 Z' },
        { id: 'l-leg-back', label: 'Left Leg (Back)', path: 'M40,62 L35,95 L42,95 L48,62 Z' },
        { id: 'r-leg-back', label: 'Right Leg (Back)', path: 'M60,62 L65,95 L58,95 L52,62 Z' },
    ];

    const regions = view === 'FRONT' ? frontRegions : backRegions;

    return (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex space-x-2">
                <Button
                    variant={view === 'FRONT' ? 'default' : 'outline'}
                    onClick={() => setView('FRONT')}
                    size="sm"
                >
                    Front View
                </Button>
                <Button
                    variant={view === 'BACK' ? 'default' : 'outline'}
                    onClick={() => setView('BACK')}
                    size="sm"
                >
                    Back View
                </Button>
            </div>

            <div className="relative w-64 h-96 bg-slate-50 rounded-lg flex items-center justify-center border">
                <svg viewBox="0 0 100 100" className="w-full h-full cursor-pointer">
                    {/* Ghost Outline */}
                    <path
                        d="M50,8 C40,8 35,15 35,25 C35,28 38,30 38,30 L25,50 L30,55 L40,35 L40,95 L45,95 L45,65 L55,65 L55,95 L60,95 L60,35 L70,55 L75,50 L62,30 C62,30 65,28 65,25 C65,15 60,8 50,8 Z"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                    />

                    {regions.map((region) => {
                        const isHighlighted = highlightedParts.includes(region.id);
                        return (
                            <path
                                key={region.id}
                                d={region.path}
                                fill={isHighlighted ? '#ef4444' : '#e2e8f0'}
                                stroke={isHighlighted ? '#b91c1c' : '#94a3b8'}
                                strokeWidth="0.5"
                                className="transition-colors hover:fill-blue-200"
                                onClick={() => onSelectPart(region.label, view)}
                            >
                                <title>{region.label}</title>
                            </path>
                        );
                    })}
                </svg>
                {/* Labels overlay or Tooltip could go here */}
            </div>
            <p className="text-xs text-muted-foreground italic">Click on a body part to document a lesion or dressing.</p>
        </div>
    );
}
