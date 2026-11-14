import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { minuteLabel } from '@/lib/format';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { T } from './ui/Text';

const toDate = (m: number) => { const d = new Date(); d.setHours(Math.floor((m % 1440) / 60), m % 60, 0, 0); return d; };

/** Native time picker (dialog on Android, spinner sheet on iOS). Value is minutes from midnight; 1440 shows as 12:00 AM (end of day). */
export function TimeField({ label, minutes, onChange, disabled }: { label: string; minutes: number; onChange: (m: number) => void; disabled?: boolean }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(toDate(minutes));
  const apply = (d: Date) => { const m = d.getHours() * 60 + d.getMinutes(); onChange(m === 0 && minutes === 1440 ? 1440 : m); };
  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(minutes), mode: 'time', is24Hour: false, onChange: (e: DateTimePickerEvent, d?: Date) => { if (e.type === 'set' && d) apply(d); } });
    } else { setDraft(toDate(minutes)); setIosOpen(true); }
  };
  return (
    <View style={{ opacity: disabled ? 0.5 : 1, flex: 1 }}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label}, ${minuteLabel(minutes % 1440 === 0 && minutes ? 0 : minutes)}. Change`} style={({ pressed }) => ({ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: pressed ? colors.surfaceMuted : colors.white, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 })}>
        <Clock size={16} color={colors.textSubtle} />
        <T v="label" weight={600}>{minuteLabel(minutes)}</T>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Sheet visible={iosOpen} onClose={() => setIosOpen(false)} title={label} footer={<Button title="Done" onPress={() => { apply(draft); setIosOpen(false); }} />}>
          <DateTimePicker value={draft} mode="time" display="spinner" onChange={(_e, d) => d && setDraft(d)} />
        </Sheet>
      ) : null}
    </View>
  );
}
