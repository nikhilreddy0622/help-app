import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface State { error: Error | null }

/** Last line of defence: show what went wrong instead of letting the app close. Uses plain RN only so it renders even if theme/fonts fail. */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) { console.error('App crashed', error); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F5F7', padding: 24, paddingTop: 72, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#121722' }}>Something went wrong</Text>
        <Text style={{ fontSize: 15, color: '#3F4652' }}>Please try again. If it keeps happening, send us a screenshot of this screen.</Text>
        <ScrollView style={{ maxHeight: 260, backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
          <Text selectable style={{ fontSize: 12, color: '#C2261F' }}>{String(error?.message ?? error)}</Text>
          <Text selectable style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>{(error?.stack ?? '').split('\n').slice(0, 8).join('\n')}</Text>
        </ScrollView>
        <TouchableOpacity onPress={() => this.setState({ error: null })} style={{ height: 48, borderRadius: 14, backgroundColor: '#0B7A6E', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
