import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { mapHtml, type MapHtmlOptions, type MapPoint } from './mapHtml';

export type { MapPoint, MapPin } from './mapHtml';

export interface MapProps extends MapHtmlOptions {
  style?: StyleProp<ViewStyle>;
  onPick?: (p: MapPoint) => void;
}

/** Native map: Leaflet + OpenStreetMap in a WebView (free, no key). */
export default function Map({ style, onPick, ...opts }: MapProps) {
  const html = React.useMemo(() => mapHtml(opts), [JSON.stringify(opts)]);
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data) as { type: string; lat: number; lng: number };
            if (m.type === 'pick') onPick?.({ lat: m.lat, lng: m.lng });
          } catch { /* ignore */ }
        }}
      />
    </View>
  );
}
