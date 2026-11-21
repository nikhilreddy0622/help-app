import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, tileColor } from '@/lib/theme';
import { useCategories } from '@/lib/hooks';
import { CatIcon } from './CategoryIcon';
import { Press, Skeleton, T } from './ui';

const COLS = 4;
const FIRST_ROWS = 2;
const STEP_ROWS = 4;

function Tile({ icon, label, onPress, bg, more }: { icon: React.ReactNode; label: string; onPress: () => void; bg: string; more?: boolean }) {
  return (
    <View style={{ width: `${100 / COLS}%`, paddingHorizontal: 5, paddingBottom: 16 }}>
      <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.93} style={{ alignItems: 'center', gap: 7 }}>
        <View style={{ width: '100%', aspectRatio: 1, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: more ? 1.5 : 0, borderColor: colors.border, borderStyle: more ? 'dashed' : 'solid' }}>
          {icon}
        </View>
        <T align="center" numberOfLines={2} weight={600} color={colors.text} style={{ fontSize: 12, lineHeight: 15, minHeight: 30 }}>{label}</T>
      </Press>
    </View>
  );
}

/**
 * Main service categories, 4 per row, each in its own colour. Starts with two rows; each tap on "More"
 * reveals four more rows until every category is shown. A category opens its services; professionals come next.
 */
export function GroupGrid() {
  const router = useRouter();
  const q = useCategories();
  const [rows, setRows] = useState(FIRST_ROWS);
  if (q.isPending) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
        {Array.from({ length: COLS * FIRST_ROWS }).map((_, i) => (
          <View key={i} style={{ width: `${100 / COLS}%`, paddingHorizontal: 5, paddingBottom: 16, gap: 7, alignItems: 'center' }}><Skeleton h={76} r={20} /><Skeleton w={52} h={10} /></View>
        ))}
      </View>
    );
  }
  const groups = (q.data ?? []).filter((c) => !c.parentId);
  const capacity = rows * COLS - 1;
  const allShown = capacity >= groups.length;
  const visible = allShown ? groups : groups.slice(0, capacity);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
      {visible.map((g) => {
        const c = tileColor(g.slug);
        return <Tile key={g.id} label={g.name} bg={c.bg} icon={<CatIcon name={g.icon} color={c.fg} size={30} />} onPress={() => router.push(`/category/${g.id}`)} />;
      })}
      {groups.length > COLS * FIRST_ROWS - 1 ? (
        allShown
          ? <Tile more bg={colors.white} label="Show less" icon={<ChevronUp size={26} color={colors.textSubtle} />} onPress={() => setRows(FIRST_ROWS)} />
          : <Tile more bg={colors.white} label={rows === FIRST_ROWS ? `All services` : 'More'} icon={<ChevronDown size={26} color={colors.textSubtle} />} onPress={() => setRows((r) => r + STEP_ROWS)} />
      ) : null}
    </View>
  );
}
