import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import type { NotificationPreferences } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { minuteToInput, inputToMinute } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input, Toggle } from '../../components/ui/Field';
import { QueryBoundary, SkeletonList } from '../../components/ui/States';
import { CATEGORIES, CATEGORY_META } from '../../components/notifications/NotifIcon';

function Form({ initial }: { initial: NotificationPreferences }) {
  const api = useApi();
  const qc = useQueryClient();
  const [p, setP] = useState(initial);
  useEffect(() => setP(initial), [initial]);
  const m = useMutation({ mutationFn: () => api.notifications.setPreferences(p), onSuccess: (d) => qc.setQueryData(['notif-prefs'], d) });
  const q = p.quietHours;
  return (
    <form className="flex max-w-xl flex-col gap-5" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <div className="card divide-y divide-divider">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_META[c].icon;
          return (
            <fieldset key={c} className="px-5 py-3">
              <legend className="sr-only">{CATEGORY_META[c].label}</legend>
              <p className="mb-1 flex items-center gap-2 font-medium text-navy"><Icon className="h-4 w-4 text-teal" aria-hidden />{CATEGORY_META[c].label}</p>
              <Toggle label="Push notifications" checked={p.channels[c].push} onChange={(v) => setP({ ...p, channels: { ...p.channels, [c]: { ...p.channels[c], push: v } } })} />
              <Toggle label="Email" checked={p.channels[c].email} onChange={(v) => setP({ ...p, channels: { ...p.channels, [c]: { ...p.channels[c], email: v } } })} />
            </fieldset>
          );
        })}
      </div>
      <div className="card p-5">
        <Toggle label="Quiet hours" description="Pause push and email during these hours" checked={q.enabled} onChange={(v) => setP({ ...p, quietHours: { ...q, enabled: v } })} />
        {q.enabled && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="From" type="time" value={minuteToInput(q.startMinute)} onChange={(e) => setP({ ...p, quietHours: { ...q, startMinute: inputToMinute(e.target.value) } })} />
            <Input label="Until" type="time" value={minuteToInput(q.endMinute)} onChange={(e) => setP({ ...p, quietHours: { ...q, endMinute: inputToMinute(e.target.value) } })} />
            <p className="col-span-2 text-xs text-muted">Time zone: {q.timezone}</p>
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 rounded-md bg-info-bg p-3 text-sm text-info-fg"><Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden />Important alerts, like a failed payment, still reach you during quiet hours. In-app notifications are always kept.</p>
      </div>
      {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
      {m.isSuccess && <p role="status" className="text-sm font-medium text-success-fg">Preferences saved.</p>}
      <div><Button type="submit" loading={m.isPending}>Save preferences</Button></div>
    </form>
  );
}

export default function NotificationSettings() {
  const api = useApi();
  const q = useQuery({ queryKey: ['notif-prefs'], queryFn: () => api.notifications.preferences() });
  return <QueryBoundary query={q} skeleton={<SkeletonList rows={4} height="h-20" />}>{(d) => <Form initial={d} />}</QueryBoundary>;
}
