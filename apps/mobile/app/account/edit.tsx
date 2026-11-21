import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { UpdateMeSchema } from '@help/validation';
import { Screen } from '@/components/Screen';
import { Avatar, Button, Input, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';

export default function EditProfile() {
  const router = useRouter();
  const { me, setMe } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState(me?.name ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [avatar, setAvatar] = useState(me?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const changePhoto = async () => {
    try {
      const [f] = await pickImage({ aspect: [1, 1] });
      if (!f) return;
      setBusy(true);
      const url = await uploadImage(f, 'AVATAR');
      setAvatar(url);
      // Save straight away so the new photo shows everywhere even if the user leaves without tapping Save.
      setMe(await api.users.updateMe({ avatarUrl: url }));
      void qc.invalidateQueries({ queryKey: ['my-provider'] });
    } catch (e) { Alert.alert('Photo', errorMessage(e)); } finally { setBusy(false); }
  };

  const save = async () => {
    const r = UpdateMeSchema.safeParse({ name: name.trim() || undefined, email: email.trim() || undefined, avatarUrl: avatar ?? undefined });
    if (!r.success) { setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrs({}); setBusy(true);
    try { setMe(await api.users.updateMe(r.data)); void qc.invalidateQueries({ queryKey: ['my-provider'] }); router.back(); } catch (e) { Alert.alert('Could not save', errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Screen title="Edit profile" keyboard footer={<Button size="lg" title="Save" loading={busy} onPress={save} />} contentStyle={{ padding: 20, gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={name} url={avatar} size={88} />
        <Pressable onPress={changePhoto} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><T v="label" weight={600} color={colors.teal700}>Change photo</T></Pressable>
      </View>
      <Input label="Full name" value={name} onChangeText={setName} error={errs.name} autoComplete="name" />
      <Input label="Email" value={email} onChangeText={setEmail} error={errs.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Input label="Mobile" value={me?.phone ?? ''} editable={false} hint="Linked accounts are managed in Linked accounts." />
    </Screen>
  );
}
