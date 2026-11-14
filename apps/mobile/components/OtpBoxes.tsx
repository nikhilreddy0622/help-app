import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { colors } from '@/lib/theme';
import { T } from './ui/Text';

/** 6 boxes backed by one hidden input (supports paste and SMS autofill). */
export function OtpBoxes({ value, onChange, error, autoFocus }: { value: string; onChange: (v: string) => void; error?: boolean; autoFocus?: boolean }) {
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const active = i === value.length;
        return (
          <View key={i} style={{ flex: 1, maxWidth: 56, height: 56, borderRadius: 12, borderWidth: active ? 2 : 1, borderColor: error ? colors.danger : active ? colors.teal700 : colors.borderStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <T v="title">{value[i] ?? ''}</T>
          </View>
        );
      })}
      <TextInput ref={input} value={value} onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoFocus={autoFocus} textContentType="oneTimeCode" autoComplete="sms-otp" style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
    </Pressable>
  );
}
