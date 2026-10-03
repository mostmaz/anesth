import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtAgo, Patient } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill, PillTone } from '../../components/Pill';
import { Button } from '../../components/Button';
import { TabRail } from '../../components/Tabs';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';

const TYPE_TONES: Record<string, PillTone> = {
  ADMISSION: 'accent', PROGRESS: 'info', PROCEDURE: 'crit',
  NURSING: 'ok', CONSULT: 'warn',
};

export function NotesTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');
  const [noteType, setNoteType] = useState('PROGRESS');
  const [noteTitle, setNoteTitle] = useState('Day Progress');
  const [noteContent, setNoteContent] = useState('Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:');
  const filtered = filter === 'all' ? patient.notes : patient.notes.filter(n => n.type === filter);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Clinical Notes</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{patient.notes.length} note{patient.notes.length === 1 ? '' : 's'}</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowNew(true)}>New</Button>
      </View>

      <TabRail value={filter} onChange={setFilter} items={[
        { value: 'all', label: 'All' },
        { value: 'ADMISSION', label: 'Admission' },
        { value: 'PROGRESS', label: 'Progress' },
        { value: 'PROCEDURE', label: 'Procedure' },
        { value: 'NURSING', label: 'Nursing' },
      ]} />

      {filtered.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>
            No notes. Start with an admission or progress note.
          </Text></Card>
        : <View style={{ gap: 10 }}>
            {filtered.map(n => (
              <Card key={n.id} tight style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <Pill tone={TYPE_TONES[n.type] || 'muted'}>{n.type}</Pill>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>{n.title}</Text>
                  <Text style={{ marginLeft: 'auto', fontSize: 10, color: t.ink3 }}>{fmtAgo(n.t)} ago</Text>
                </View>
                <Text style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 12, color: t.ink2, lineHeight: 18,
                }}>{n.content}</Text>
                <Text style={{ fontSize: 11, color: t.ink3, marginTop: 8 }}>{n.by} · {n.role}</Text>
              </Card>
            ))}
          </View>
      }

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="New note"
        footer={<>
          <Button variant="outline" onPress={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" onPress={async () => {
            setShowNew(false);
            if (ICU.mode === 'live') {
              await ICU.createNoteLive(patient.id, { type: noteType, title: noteTitle, content: noteContent });
            } else {
              ICU.pushToast({ tone: 'ok', msg: 'Note saved (demo)' });
            }
          }}>Save</Button>
        </>}
      >
        <View style={{ gap: 10 }}>
          <Field label="Type" value={noteType} onChangeText={setNoteType} />
          <Field label="Title" value={noteTitle} onChangeText={setNoteTitle} />
          <Field label="Content"
            multiline numberOfLines={6}
            value={noteContent}
            onChangeText={setNoteContent}
            style={{ minHeight: 160, textAlignVertical: 'top' }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({});
