import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContactSettings } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { Seo } from '../../components/ui/Seo';
import { Button } from '../../components/ui/Button';
import { Textarea, Toggle } from '../../components/ui/Field';
import { QueryBoundary, SkeletonList } from '../../components/ui/States';
import { TagInput } from '../../components/forms/Inputs';

function Contact({ initial }: { initial: ContactSettings }) {
  const api = useApi();
  const qc = useQueryClient();
  const [s, setS] = useState(initial);
  const m = useMutation({ mutationFn: () => api.providers.setContactSettings({ ...s, autoReplyText: s.autoReplyText?.trim() || null }), onSuccess: (d) => qc.setQueryData(['contact-settings'], d) });
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="font-semibold">Contact settings</h2>
      <Toggle label="Show my phone number" description="Customers who are signed in can tap Show phone number. Turn off to be reached by chat only." checked={s.showPhone} onChange={(v) => setS({ ...s, showPhone: v })} />
      <Toggle label="Auto-reply when Busy or Away" description="New chats get an automatic reply, labelled Auto-reply, so customers know when to expect you." checked={s.autoReplyEnabled} onChange={(v) => setS({ ...s, autoReplyEnabled: v })} />
      {s.autoReplyEnabled && <Textarea label="Auto-reply text" rows={3} maxLength={300} value={s.autoReplyText ?? ''} onChange={(e) => setS({ ...s, autoReplyText: e.target.value })} hint="Leave empty to use your status message." />}
      {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
      {m.isSuccess && <p role="status" className="text-sm font-medium text-success-fg">Saved.</p>}
      <div><Button loading={m.isPending} onClick={() => m.mutate()}>Save contact settings</Button></div>
    </section>
  );
}

function QuickReplies({ initial }: { initial: string[] }) {
  const api = useApi();
  const qc = useQueryClient();
  const [list, setList] = useState(initial);
  useEffect(() => setList(initial), [initial]);
  const m = useMutation({ mutationFn: () => api.providers.setQuickReplies(list), onSuccess: (d) => { qc.setQueryData(['quick-replies'], d); } });
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="font-semibold">Quick replies</h2>
      <p className="text-sm text-subtle">Shown as tap-to-use chips in your chats. Up to 10, 300 characters each.</p>
      <TagInput label="Add a quick reply" values={list} onChange={setList} max={10} placeholder="e.g. I can visit today after 5 PM" />
      {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
      {m.isSuccess && <p role="status" className="text-sm font-medium text-success-fg">Saved.</p>}
      <div><Button loading={m.isPending} onClick={() => m.mutate()}>Save quick replies</Button></div>
    </section>
  );
}

export default function ProSettings() {
  const api = useApi();
  const c = useQuery({ queryKey: ['contact-settings'], queryFn: () => api.providers.contactSettings() });
  const r = useQuery({ queryKey: ['quick-replies'], queryFn: () => api.providers.quickReplies() });
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Seo title="Professional settings" noindex />
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <QueryBoundary query={c} skeleton={<SkeletonList rows={1} height="h-48" />}>{(d) => <Contact initial={d} />}</QueryBoundary>
      <QueryBoundary query={r} skeleton={<SkeletonList rows={1} height="h-48" />}>{(d) => <QuickReplies initial={d.replies} />}</QueryBoundary>
    </div>
  );
}
