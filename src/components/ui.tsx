import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react-native';
import { colors as c, fonts } from '../theme';
import { copy } from '../copy';

export function Label({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: ViewStyle | object;
}) {
  return (
    <Text style={[styles.body, muted && styles.muted, style]}>{children}</Text>
  );
}
export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}
export function Screen({
  children,
  back,
  title,
  dark = false,
  tabbed = false,
  transparent = false,
}: {
  children: React.ReactNode;
  back?: () => void;
  title?: string;
  dark?: boolean;
  tabbed?: boolean;
  transparent?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{
        backgroundColor: transparent
          ? 'transparent'
          : dark
          ? c.handoff
          : c.background,
      }}
      contentContainerStyle={[
        styles.page,
        {
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + (tabbed ? 112 : 28),
        },
      ]}
    >
      {(back || title) && (
        <View style={styles.header}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.common.back}
              onPress={back}
              style={styles.iconButton}
            >
              <ArrowLeft color={c.secondary} size={24} />
            </Pressable>
          )}
          {title && <Text style={styles.brand}>{title}</Text>}
        </View>
      )}
      {children}
    </ScrollView>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  arrow = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  arrow?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && { color: c.primaryContainer }]}
      >
        {title}
      </Text>
      {arrow && (
        <ArrowRight
          color={secondary ? c.primaryContainer : c.onPrimary}
          size={22}
        />
      )}
    </Pressable>
  );
}
export function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.chipText, selected && { color: c.primary }]}>
        {title}
      </Text>
      {selected && <Check color={c.primary} size={16} />}
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Input({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.inputWrap}>
      {label && <Label muted>{label}</Label>}
      <TextInput
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={c.secondary}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={copy.common.close}
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.sheet}
          contentContainerStyle={{
            padding: 24,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <View style={styles.handle} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.common.close}
            onPress={onClose}
            style={[styles.iconButton, { alignSelf: 'flex-end' }]}
          >
            <X color={c.secondary} />
          </Pressable>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
// Stack-backed sheet: the actual Home screen remains visible underneath.
export function RouteSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.scrim} accessibilityViewIsModal>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={copy.common.close}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={[styles.sheet, { backgroundColor: c.surfaceContainerLowest }]}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
      >
        <View style={styles.handle} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.common.close}
          onPress={onClose}
          style={[styles.iconButton, { alignSelf: 'flex-end' }]}
        >
          <X color={c.secondary} />
        </Pressable>
        {children}
      </ScrollView>
    </View>
  );
}
export const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, flexGrow: 1, gap: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  brand: {
    fontFamily: fonts.heading,
    color: c.primaryContainer,
    fontSize: 21,
    fontWeight: '700',
  },
  title: {
    fontFamily: fonts.heading,
    color: c.onSurface,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.65,
    fontWeight: '700',
  },
  body: {
    fontFamily: fonts.body,
    color: c.onSurface,
    fontSize: 15,
    lineHeight: 23,
  },
  muted: { color: c.secondary },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '600',
    color: c.primaryContainer,
    letterSpacing: 1.4,
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: c.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    fontFamily: fonts.body,
    fontWeight: '700',
    fontSize: 17,
    color: c.onPrimary,
    flexShrink: 1,
  },
  secondaryButton: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.navBorder,
  },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    backgroundColor: c.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipText: { fontFamily: fonts.body, fontSize: 14, color: c.secondary },
  selected: {
    backgroundColor: c.secondaryContainer,
    borderColor: c.primaryContainer,
    borderWidth: 2,
  },
  card: {
    padding: 20,
    backgroundColor: c.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.navBorder,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inputWrap: { gap: 8 },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: c.onSurface,
    backgroundColor: c.surfaceContainerLowest,
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.navBorder,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#14302a66' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: c.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexGrow: 0,
  },
  handle: {
    height: 4,
    width: 36,
    backgroundColor: c.outlineVariant,
    borderRadius: 4,
    alignSelf: 'center',
  },
});
