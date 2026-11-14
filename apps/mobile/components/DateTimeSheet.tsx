import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, Sheet, T } from './ui';

const hours = Array.from({ length: 15 }, (_, i) => i + 7);
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;

/** Date + hour picker built from chips (no native date picker dependency). Device local time. */
export function DateTimeSheet({ visible, onClose, onPick, title = 'Pick a time' }: { visible: boolean; onClose: () => void; onPick: (d: Date) => void; title?: string }) {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d; });
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(10);
  useEffect(() => { if (visible) { setDay(0); setHour(Math.min(21, Math.max(7, new Date().getHours() + 1))); } }, [visible]);
  const chosen = new Date(days[day]!); chosen.setHours(hour, 0, 0, 0);
  const past = chosen.getTime() < Date.now();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={<Button title="Confirm time" disabled={past} onPress={() => onPick(chosen)} />}>
      <View style={{ gap: 8 }}>
        <T v="overline">Day</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => <Chip key={i} selected={day === i} label={i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} onPress={() => setDay(i)} />)}
        </ScrollView>
      </View>
      <View style={{ gap: 8 }}>
        <T v="overline">Time</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {hours.map((h) => <Chip key={h} selected={hour === h} label={hourLabel(h)} onPress={() => setHour(h)} />)}
        </View>
        {past ? <T v="caption">Choose a time in the future.</T> : null}
      </View>
    </Sheet>
  );
}
