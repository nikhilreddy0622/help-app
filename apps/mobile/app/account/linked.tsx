import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { indianPhone, z } from '@help/validation';
import { OtpBoxes } from '@/components/OtpBoxes';
import { Group, Row, Screen } from '@/components/Screen';
import { Button, Input, Sheet, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { googleIdToken } from '@/lib/google';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

type Kind = 'phone' | 'email';

export default function Linked() {
  const { me, setMe } = useSession();
  const [kind, setKind] = useState<Kind | null>(null);
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = (k: Kind) => { setKind(k); setValue(''); setCode(''); setSent(false); setErr(null); };
  const target = kind === 'phone' ? `+91${value}` : value.trim().toLowerCase();

  const linkGoogle = async () => {
    try { setMe(await api.auth.linkGoogle(await googleIdToken())); } catch (e) { Alert.alert('Google', errorMessage(e)); }
  };
  const send = async () => {
    if (kind === 'phone' ? !indianPhone.safeParse(target).success : !z.string().email().safeParse(target).success) return setErr(kind === 'phone' ? 'Enter a valid 10-digit mobile number' : 'Enter a valid email address');
    setBusy(true); setErr(null);
    try { if (kind === 'phone') await api.auth.requestOtp(target); else await api.auth.requestEmailOtp(target); setSent(true); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setErr(null);
    try { setMe(kind === 'phone' ? await api.auth.linkPhone(target, code) : await api.auth.linkEmail(target, code)); setKind(null); } catch (e) { setErr(errorMessage(e)); setCode(''); } finally { setBusy(false); }
  };

  const state = (ok: boolean, detail?: string | null) => (ok ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><BadgeCheck size={16} color={colors.success} /><T v="caption" color={colors.successFg}>{detail ?? 'Verified'}</T></View>
  ) : <T v="label" weight={600} color={colors.teal700}>Link</T>);

  return (
    <Screen title="Linked accounts" contentStyle={{ padding: 16, gap: 12 }}>
      <T color={colors.textMuted}>Link more than one way to sign in. They all open the same account. Lost your phone? Sign in with email or Google, then change your number here.</T>
      <Group>
        <Row label="Mobile number" value={me?.linked.phone ? me.phone ?? undefined : undefined} right={state(!!me?.linked.phone, me?.linked.phone ? 'Verified' : null)} onPress={() => open('phone')} />
        <Row label="Email" value={me?.linked.email ? me.email ?? undefined : undefined} right={state(!!me?.linked.email)} onPress={() => open('email')} />
        <Row label="Google" right={state(!!me?.linked.google)} onPress={me?.linked.google ? undefined : linkGoogle} />
      </Group>
      {me?.linked.phone ? <T v="caption">Tap Mobile number to change it. You will verify the new number with a code.</T> : null}
      <Sheet visible={!!kind} onClose={() => setKind(null)} title={kind === 'phone' ? (me?.linked.phone ? 'Change mobile number' : 'Link mobile number') : (me?.linked.email ? 'Change email' : 'Link email')}>
        <View style={{ gap: 16 }}>
          {kind === 'phone'
            ? <Input label="Mobile number" keyboardType="number-pad" maxLength={10} value={value} onChangeText={(t) => setValue(t.replace(/\D/g, ''))} left={<T v="label" weight={600}>+91</T>} editable={!sent} />
            : <Input label="Email" keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={setValue} editable={!sent} />}
          {sent ? <><T v="caption">Enter the code sent to {target}</T><OtpBoxes value={code} onChange={setCode} error={!!err} autoFocus /></> : null}
          {err ? <T v="caption" color={colors.danger}>{err}</T> : null}
          <Button title={sent ? 'Verify and link' : 'Send code'} loading={busy} disabled={sent ? code.length !== 6 : !value} onPress={sent ? verify : send} />
        </View>
      </Sheet>
    </Screen>
  );
}
