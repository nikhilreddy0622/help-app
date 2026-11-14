import type { AdminRow } from '@help/api-client';
import { fmtDate, formatINR, get, num, str } from '../lib/format';
import { StatusBadge } from './ui';
import type { Column } from './ListView';

export const text = (r: AdminRow, ...keys: string[]) => str(get(r, ...keys));

export const col = {
  name: (header = 'Name', ...keys: string[]): Column => ({
    header,
    cell: (r) => <span className="font-medium">{text(r, ...(keys.length ? keys : ['name', 'displayName', 'title']))}</span>,
  }),
  contact: (): Column => ({
    header: 'Contact',
    cell: (r) => (
      <div className="leading-tight">
        <div>{text(r, 'email', 'user.email')}</div>
        <div className="text-xs text-muted">{text(r, 'phone', 'user.phone')}</div>
      </div>
    ),
  }),
  text: (header: string, ...keys: string[]): Column => ({ header, cell: (r) => text(r, ...keys) }),
  status: (header = 'Status', ...keys: string[]): Column => ({ header, cell: (r) => <StatusBadge value={get(r, ...(keys.length ? keys : ['status'])) } /> }),
  date: (header = 'Created', ...keys: string[]): Column => ({ header, cell: (r) => <span className="whitespace-nowrap text-subtle">{fmtDate(get(r, ...(keys.length ? keys : ['createdAt'])))}</span> }),
  money: (header = 'Amount', ...keys: string[]): Column => ({
    header,
    className: 'text-right',
    cell: (r) => {
      const n = num(get(r, ...(keys.length ? keys : ['amountPaise', 'pricePaise', 'amount'])));
      return <span className="tabular-nums">{n === undefined ? '-' : formatINR(n)}</span>;
    },
  }),
};

