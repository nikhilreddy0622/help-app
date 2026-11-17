import { Platform } from 'react-native';

/**
 * Web-preview dev noise only. react-native-web leaks the native-only `collapsable`
 * prop to the DOM, which React logs as a "non-boolean attribute" error. It does not
 * occur in the real device app or in production, so we drop just that one message in
 * web dev to keep the preview clean. All other errors/warnings pass through untouched.
 */
if (Platform.OS === 'web' && typeof __DEV__ !== 'undefined' && __DEV__) {
  const drop = (args: unknown[]) =>
    typeof args[0] === 'string' && args[0].includes('non-boolean attribute') && args.some((a) => a === 'collapsable');
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => { if (!drop(args)) origError(...args); };
  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => { if (!drop(args)) origWarn(...args); };
}
