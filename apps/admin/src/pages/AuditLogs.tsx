import { api } from '../lib/api';
import { PageHeader } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

export function AuditLogs() {
  return (
    <>
      <PageHeader title="Audit logs" subtitle="Every administrative action, newest first" />
      <ListView
        id="audit"
        fetcher={(q) => api.admin.auditLogs(q)}
        search="Search logs"
        filters={[
          { name: 'action', label: 'Action (e.g. USER_SUSPEND)', type: 'text' },
          { name: 'entityType', label: 'Entity type', type: 'text' },
          { name: 'adminId', label: 'Admin ID', type: 'text' },
          { name: 'from', label: 'From date', type: 'date' },
          { name: 'to', label: 'To date', type: 'date' },
        ]}
        columns={[
          col.date('When'),
          col.text('Admin', 'admin.name', 'admin.email', 'adminName', 'adminId'),
          col.text('Action', 'action'),
          col.text('Entity', 'entityType', 'entity', 'targetType'),
          col.text('Entity ID', 'entityId', 'targetId'),
          col.text('Note', 'note', 'reason', 'metadata.reason'),
        ]}
      />
    </>
  );
}
