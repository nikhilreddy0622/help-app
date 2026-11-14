import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Button, Chip, Input, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';
import { useSession } from '@/lib/session';

const CATS: [string, string][] = [['BOOKING', 'Contact or chat'], ['PAYMENT', 'Payment'], ['ACCOUNT', 'Account'], ['PROFILE', 'Profile'], ['SAFETY', 'Safety'], ['OTHER', 'Other']];

export default function NewTicket() {
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { me, requireAuth } = useSession();
  const [category, setCategory] = useState('OTHER');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; mime: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!me) requireAuth(); }, [me, requireAuth]);

  const submit = async () => {
    if (subject.trim().length < 3) return setErr('Add a short subject');
    if (message.trim().length < 10) return setErr('Tell us a little more (at least 10 characters)');
    setBusy(true); setErr(null);
    try {
      const attachments: string[] = [];
      for (const f of photos) attachments.push(await uploadImage(f, 'SUPPORT'));
      const t = await api.support.create({ category, subject: subject.trim(), message: message.trim(), providerId, attachments });
      qc.invalidateQueries({ queryKey: ['support'] });
      router.replace(`/support/${t.id}`);
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Screen title="Contact support" keyboard footer={<>{err ? <T v="caption" color={colors.danger} align="center">{err}</T> : null}<Button size="lg" title="Send to support" loading={busy} onPress={submit} /></>} contentStyle={{ padding: 16, gap: 20 }}>
      {providerId ? <View style={{ backgroundColor: colors.infoBg, borderRadius: 12, padding: 12 }}><T v="caption" color={colors.infoFg}>This ticket will be linked to the professional so we can look into it.</T></View> : null}
      <View style={{ gap: 8 }}>
        <T v="overline">Topic</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATS.map(([k, l]) => <Chip key={k} label={l} selected={category === k} onPress={() => setCategory(k)} />)}</View>
      </View>
      <Input label="Subject" value={subject} onChangeText={setSubject} maxLength={120} />
      <Input label="What happened?" multiline value={message} onChangeText={setMessage} maxLength={4000} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((f) => (
          <View key={f.uri} style={{ width: 64, height: 64 }}>
            <Image source={{ uri: f.uri }} style={{ width: 64, height: 64, borderRadius: 10 }} accessibilityLabel="Attachment" />
            <Pressable onPress={() => setPhotos((x) => x.filter((y) => y.uri !== f.uri))} accessibilityRole="button" accessibilityLabel="Remove attachment" style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#fff" /></Pressable>
          </View>
        ))}
        {photos.length < 4 ? (
          <Pressable onPress={async () => { try { const r = await pickImage({ multiple: true }); setPhotos((x) => [...x, ...r].slice(0, 4)); } catch (e) { Alert.alert('Photos', errorMessage(e)); } }} accessibilityRole="button" style={{ minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Camera size={16} color={colors.textSubtle} /><T v="label" color={colors.textSubtle} style={{ fontSize: 13 }}>Add screenshots (optional)</T>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
