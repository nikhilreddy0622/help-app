import { useState } from 'react';
import { Chip, Select, Toggle } from '../ui/Field';

export type SetParams = (updates: Record<string, string | null>) => void;
const LANGS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Malayalam', 'Gujarati'];
const DISTANCES = [1, 3, 5, 10, 25];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="border-b border-divider py-4 first:pt-0 last:border-0"><legend className="mb-2.5 text-sm font-semibold text-navy">{title}</legend><div className="flex flex-wrap gap-2">{children}</div></fieldset>;
}

export function FiltersPanel({ sp, set, onReset }: { sp: URLSearchParams; set: SetParams; onReset: () => void }) {
  const radius = Number(sp.get('radius') ?? 10);
  const custom = !DISTANCES.includes(radius);
  const [customOpen, setCustomOpen] = useState(custom);
  const [price, setPrice] = useState(sp.get('price') ?? '');
  const eq = (k: string, v: string | null) => (sp.get(k) ?? null) === v;
  return (
    <div>
      <Group title="Distance">
        {DISTANCES.map((d) => <Chip key={d} active={!customOpen && radius === d} onClick={() => { setCustomOpen(false); set({ radius: String(d) }); }}>{d} km</Chip>)}
        <Chip active={customOpen} onClick={() => setCustomOpen(true)}>Custom</Chip>
        {customOpen && (
          <div className="flex w-full items-center gap-2">
            <label htmlFor="f-radius" className="sr-only">Custom distance in km</label>
            <input id="f-radius" type="number" min={1} max={100} defaultValue={radius} onBlur={(e) => { const v = Math.min(100, Math.max(1, Number(e.target.value) || 10)); set({ radius: String(v) }); }}
              className="h-10 w-24 rounded-md border border-line-strong px-3 text-sm" /><span className="text-sm text-subtle">km (1 to 100)</span>
          </div>
        )}
      </Group>
      <Group title="Rating">
        {[['Any', null], ['3+', '3'], ['4+', '4'], ['4.5+', '4.5']].map(([l, v]) => <Chip key={l} active={eq('rating', v ?? null)} onClick={() => set({ rating: v ?? null })}>{l}</Chip>)}
      </Group>
      <Group title="Experience">
        {[['Any', null], ['2+ yrs', '2'], ['5+ yrs', '5'], ['10+ yrs', '10']].map(([l, v]) => <Chip key={l} active={eq('exp', v ?? null)} onClick={() => set({ exp: v ?? null })}>{l}</Chip>)}
      </Group>
      <Group title="Maximum price">
        <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); set({ price: price || null }); }}>
          <label htmlFor="f-price" className="sr-only">Maximum starting price in rupees</label>
          <span className="text-sm text-subtle">Up to ₹</span>
          <input id="f-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} onBlur={() => set({ price: price || null })} placeholder="No limit" className="h-10 w-28 rounded-md border border-line-strong px-3 text-sm" />
        </form>
      </Group>
      <Group title="Availability and trust">
        <div className="w-full">
          <Toggle label="Available now" checked={sp.get('now') === '1'} onChange={(v) => set({ now: v ? '1' : null })} />
          <Toggle label="Verified only" description="Mobile, ID or qualification checked" checked={sp.get('verified') === '1'} onChange={(v) => set({ verified: v ? '1' : null })} />
        </div>
      </Group>
      <Group title="Service type">
        {[['Any', null], ['Online', 'REMOTE'], ['At location', 'ONSITE']].map(([l, v]) => <Chip key={l} active={eq('mode', v ?? null)} onClick={() => set({ mode: v ?? null })}>{l}</Chip>)}
      </Group>
      <div className="py-4">
        <Select label="Language" value={sp.get('lang') ?? ''} onChange={(e) => set({ lang: e.target.value || null })}>
          <option value="">Any language</option>
          {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
      </div>
      <button type="button" onClick={onReset} className="text-sm font-semibold text-teal-700 underline">Clear all filters</button>
    </div>
  );
}
