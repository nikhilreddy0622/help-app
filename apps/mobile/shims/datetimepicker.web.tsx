// Web-preview stand-in for @react-native-community/datetimepicker (native only).
export type DateTimePickerEvent = { type: string; nativeEvent: { timestamp?: number } };
export const DateTimePickerAndroid = { open: (_: unknown) => undefined, dismiss: (_: unknown) => undefined };
export default function DateTimePicker(_: unknown) {
  return null;
}
