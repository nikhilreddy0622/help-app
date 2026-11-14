import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Crosshair, MapPin } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Button, Chip, Input, T } from '@/components/ui';
import { CITIES, useLocation, type Place } from '@/lib/location';
import { colors } from '@/lib/theme';
import { errorMessage } from '@/lib/api';

export default function LocationScreen() {
  const router = useRouter();
  const loc = useLocation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'gps' | 'pin' | null>(null);
  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const gps = async () => {
    setBusy('gps'); setError(null);
    try { await loc.useCurrentLocation(); done(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
  };
  const byPin = async () => {
    if (!/^[1-9]\d{5}$/.test(pin)) { setError('Enter a valid 6-digit PIN code'); return; }
    setBusy('pin'); setError(null);
    try { await loc.setByPin(pin); done(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
  };
  const pick = async (p: Place) => { await loc.setPlace(p); done(); };

  return (
    <Screen title="Your location" keyboard contentStyle={{ padding: 20, gap: 24 }}>
      <View style={{ gap: 8 }}>
        <T v="title">Where do you need help?</T>
        <T color={colors.textMuted}>We use your location only to show professionals near you. It stays on your device.</T>
      </View>
      <Button size="lg" title="Use current location" icon={<Crosshair size={18} color="#fff" />} loading={busy === 'gps'} onPress={gps} />
      <View style={{ gap: 12 }}>
        <Input label="Or enter a PIN code" keyboardType="number-pad" maxLength={6} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} placeholder="560038" error={error} returnKeyType="done" onSubmitEditing={byPin} />
        <Button kind="secondary" title="Use PIN code" loading={busy === 'pin'} onPress={byPin} disabled={pin.length !== 6} />
      </View>
      <View style={{ gap: 12 }}>
        <T v="overline">Popular cities</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CITIES.map((c) => <Chip key={c.city} label={c.label} icon={<MapPin size={14} color={colors.teal} />} selected={loc.place?.city === c.city && !loc.place?.pin} onPress={() => pick(c)} />)}
        </View>
      </View>
    </Screen>
  );
}
