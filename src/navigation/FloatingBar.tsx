import React, { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  ChartNoAxesColumn,
  House,
  Puzzle,
  Settings,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts } from '../theme';
import { copy } from '../copy';
import { TabHiddenContext } from './TabVisibility';
const icons = [House, Puzzle, ChartNoAxesColumn, Settings];
export function FloatingBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hidden = useContext(TabHiddenContext);
  if (hidden) {
    return null;
  }
  return (
    <View style={[s.bar, { bottom: insets.bottom + 16 }]}>
      {state.routes.map((route, i) => {
        const active = state.index === i;
        const Icon = icons[i];
        const label = copy.tabs[route.name as keyof typeof copy.tabs];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            style={[s.tab, active && s.active]}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            <Icon
              size={active ? 22 : 24}
              color={active ? c.primaryContainer : c.navInactive}
              fill={active ? c.primaryContainer : 'none'}
              fillOpacity={active ? 0.18 : 0}
              strokeWidth={active ? 2.5 : 1.8}
            />
            {active && <Text style={s.label}>{label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    minHeight: 64,
    borderRadius: 40,
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.navBorder,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 6,
    elevation: 4,
  },
  tab: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
    gap: 2,
  },
  active: { backgroundColor: c.navSelected },
  label: { fontFamily: fonts.body, fontSize: 11, color: c.primaryContainer },
});
