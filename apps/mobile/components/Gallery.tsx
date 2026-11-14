import React, { useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { T } from './ui/Text';

/** Full-screen swipeable image viewer. */
export function Gallery({ urls, index, onClose }: { urls: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cur, setCur] = useState(index ?? 0);
  const ref = useRef<FlatList<string>>(null);
  if (index === null) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
        <FlatList
          ref={ref} data={urls} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(u, i) => `${u}${i}`}
          initialScrollIndex={index} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setCur(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: item }} resizeMode="contain" style={{ width, height: height * 0.8 }} accessibilityLabel="Portfolio photo" />
            </View>
          )}
        />
        <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 }}>
          <T v="label" color="#fff">{cur + 1} / {urls.length}</T>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close viewer" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <X size={26} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
