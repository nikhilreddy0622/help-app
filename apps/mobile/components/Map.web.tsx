import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { mapHtml, type MapHtmlOptions, type MapPoint } from './mapHtml';

export type { MapPoint, MapPin } from './mapHtml';

export interface MapProps extends MapHtmlOptions {
  style?: StyleProp<ViewStyle>;
  onPick?: (p: MapPoint) => void;
  onOpen?: (id: string) => void;
}

/** Web map: same Leaflet/OSM page inside an iframe (no native deps). */
export default function Map({ style, onPick, onOpen, ...opts }: MapProps) {
  const html = React.useMemo(() => mapHtml(opts), [JSON.stringify(opts)]);
  const ref = React.useRef<HTMLIFrameElement>(null);
  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (ref.current && e.source !== ref.current.contentWindow) return;
      try {
        const m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (m?.type === 'pick') onPick?.({ lat: m.lat, lng: m.lng });
        if (m?.type === 'open') onOpen?.(m.id);
      } catch { /* ignore */ }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onPick, onOpen]);
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <iframe ref={ref} srcDoc={html} title="Map" style={{ border: 0, width: '100%', height: '100%' }} />
    </View>
  );
}
