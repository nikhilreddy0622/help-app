import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { errorMessage, useApi } from '../../lib/api';
import { useAuth } from '../../state/AuthContext';
import { Modal } from '../ui/Modal';
import { Button, LinkButton } from '../ui/Button';
import { Select, Textarea } from '../ui/Field';

const REASONS = [['FAKE_PROFILE', 'Fake profile'], ['FRAUD', 'Fraud or scam'], ['ABUSE', 'Abusive behaviour'], ['SAFETY', 'Safety concern'], ['SPAM', 'Spam'], ['OTHER', 'Something else']] as const;

export function ReportModal({ providerId, open, onClose }: { providerId: string; open: boolean; onClose: () => void }) {
  const api = useApi();
  const { status } = useAuth();
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>('FAKE_PROFILE');
  const [details, setDetails] = useState('');
  const m = useMutation({ mutationFn: () => api.reports.create({ targetType: 'PROVIDER', targetId: providerId, reason, details: details || undefined }) });
  return (
    <Modal open={open} onClose={onClose} title="Report this profile">
      {status !== 'authed' ? (
        <div className="py-4 text-center"><p className="mb-4 text-subtle">Log in to submit a report.</p><LinkButton to={`/login?next=${encodeURIComponent(typeof location !== 'undefined' ? location.pathname : '/')}`}>Log in</LinkButton></div>
      ) : m.isSuccess ? (
        <div className="py-4 text-center"><p className="font-semibold">Thank you. Our team will review this report.</p><Button className="mt-4" variant="secondary" onClick={onClose}>Close</Button></div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Textarea label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
          {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
          <Button type="submit" loading={m.isPending}>Submit report</Button>
        </form>
      )}
    </Modal>
  );
}
