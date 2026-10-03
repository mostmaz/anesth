import React from 'react';
import { Pill, PillTone } from './Pill';

const map: Record<string, [PillTone, string]> = {
  APPROVED: ['ok', 'Approved'],
  PENDING: ['warn', 'Pending'],
  COMPLETED: ['info', 'Completed'],
  DISCONTINUED: ['muted', 'Discontinued'],
  STAT: ['crit', 'STAT'],
  URGENT: ['warn', 'Urgent'],
  ROUTINE: ['muted', 'Routine'],
  CRITICAL: ['crit', 'Critical'],
  STABLE: ['ok', 'Stable'],
  ABNORMAL: ['crit', 'Abnormal'],
  ACTIVE: ['info', 'Active'],
  STARTED: ['ok', 'Started'],
  STOPPED: ['crit', 'Stopped'],
};

export function StatusBadge({ status }: { status: string }) {
  const [tone, label] = map[status] || ['muted', status];
  return <Pill tone={tone}>{label}</Pill>;
}
