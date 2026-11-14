import { api } from '../lib/api';
import { get, humanize } from '../lib/format';
import { Button, PageHeader, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

export function Reports() {
  const { run } = useActions();
  const decide = (id: string, status: 'RESOLVED' | 'DISMISSED') =>
    run(
      { title: status === 'RESOLVED' ? 'Resolve report' : 'Dismiss report', description: status === 'RESOLVED' ? 'Mark this report as resolved and record what was done.' : 'Dismiss this report as not actionable.', confirmLabel: status === 'RESOLVED' ? 'Resolve' : 'Dismiss', danger: status === 'DISMISSED', noteLabel: 'Resolution', noteRequired: true, success: status === 'RESOLVED' ? 'Report resolved' : 'Report dismissed' },
      (n) => api.admin.resolveReport(id, status, n),
    );
  return (
    <>
      <PageHeader title="Reports" subtitle="Complaints raised by customers and providers" />
      <ListView
        id="reports"
        fetcher={(q) => api.admin.reports(q)}
        search="Search reports"
        filters={[
          { name: 'status', label: 'Status', options: ['OPEN', 'RESOLVED', 'DISMISSED'].map((v) => ({ value: v, label: humanize(v) })) },
          { name: 'type', label: 'Type', options: ['PROVIDER', 'REVIEW', 'CONVERSATION', 'USER'].map((v) => ({ value: v, label: humanize(v) })) },
        ]}
        columns={[
          col.text('Type', 'targetType', 'type', 'entityType'),
          col.text('Reason', 'reason', 'category'),
          { header: 'Details', className: 'max-w-sm', cell: (r) => <p className="line-clamp-3 whitespace-pre-wrap">{String(get(r, 'details', 'description', 'comment') ?? '-')}</p> },
          col.text('Reporter', 'reporter.name', 'reporterName', 'reporter.email'),
          col.status(), col.date('Reported'),
          col.text('Resolution', 'resolution'),
        ]}
        actions={(r) => {
          const s = String(get(r, 'status')).toUpperCase();
          if (s !== 'OPEN' && s !== 'PENDING' && s !== 'IN_REVIEW') return null;
          return (
            <>
              <Button size="sm" variant="primary" onClick={() => decide(r.id, 'RESOLVED')}>Resolve</Button>
              <Button size="sm" onClick={() => decide(r.id, 'DISMISSED')}>Dismiss</Button>
            </>
          );
        }}
      />
    </>
  );
}
