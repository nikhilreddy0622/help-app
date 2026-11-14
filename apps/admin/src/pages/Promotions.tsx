import { api } from '../lib/api';
import { fmtDay, get, str } from '../lib/format';
import { Button, Notice, PageHeader } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';
import { SPONSOR_NOTE, sponsoredUntil, useProviderActions } from './Providers';

export function Promotions() {
  const pa = useProviderActions();
  return (
    <>
      <PageHeader title="Promotions" subtitle="Currently sponsored providers" />
      <div className="mb-4"><Notice tone="blue">{SPONSOR_NOTE}</Notice></div>
      <ListView
        id="promotions"
        fetcher={(q) => api.admin.providers(q)}
        fixedParams={{ sponsored: true }}
        search="Search providers"
        columns={[col.name('Provider', 'displayName', 'name'), col.text('City', 'city'), col.status(), { header: 'Sponsored until', cell: (r) => fmtDay(sponsoredUntil(r)) }, { header: 'Category', cell: (r) => str(get(r, 'primaryCategory.name', 'category')) }]}
        emptyTitle="No sponsored providers"
        actions={(r) => (
          <>
            <Button size="sm" onClick={() => pa.openSponsor(r)}>Extend</Button>
            <Button size="sm" variant="danger" onClick={() => pa.removeSponsor(r)}>Remove</Button>
          </>
        )}
      />
      {pa.modal}
    </>
  );
}
