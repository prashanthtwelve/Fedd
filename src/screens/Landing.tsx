import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useStore } from '../state/Store';
import { copy } from '../copy';

const words = copy.landing;
function CanvasPattern() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="15%" r="65%">
          <Stop offset="0" stopColor="#2E8F78" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#2E8F78" stopOpacity={0} />
        </RadialGradient>
        <Pattern id="dots" width={20} height={20} patternUnits="userSpaceOnUse">
          <Circle cx={10} cy={10} r={0.8} fill="white" opacity={0.08} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#glow)" />
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}
function PaperPattern() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <Pattern
          id="paperLines"
          width={14.14}
          height={14.14}
          patternUnits="userSpaceOnUse"
        >
          <Path
            d="M0 0L14.14 14.14M14.14 0L0 14.14"
            stroke="#1F6F5C"
            strokeWidth={0.7}
            opacity={0.05}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#paperLines)" />
    </Svg>
  );
}
function Field({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, green && s.green]}>{value}</Text>
    </View>
  );
}
export function LandingScreen() {
  const { update } = useStore();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  async function continueToProfile() {
    if (busy) return;
    setBusy(true);
    try {
      // Commit the first-use marker before exposing the existing profile flow.
      await update(data => ({ ...data, landingSeen: true }));
    } catch (error) {
      Alert.alert(copy.common.error, String(error));
      setBusy(false);
    }
  }
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView bounces={false} contentContainerStyle={s.scroll}>
        <View
          style={[
            s.canvas,
            {
              minHeight: Math.max(740, height - insets.top - insets.bottom),
              marginTop: insets.top,
              marginBottom: insets.bottom,
            },
          ]}
        >
          <CanvasPattern />
          <View style={s.header}>
            <View style={s.brandRow}>
              <View style={s.dot} />
              <Text style={s.brand}>{copy.brand}</Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>{words.pill}</Text>
            </View>
          </View>
          <View style={s.main}>
            <Text accessibilityRole="header" style={s.headline}>
              {words.heading}
              <Text style={s.headlineStrong}>{words.headingStrong}</Text>
            </Text>
            <View style={s.permit}>
              <View style={s.paper}>
                <PaperPattern />
              </View>
              <Svg
                width={64}
                height={64}
                viewBox="0 0 100 100"
                style={s.crest}
                pointerEvents="none"
                accessible={false}
              >
                <Circle
                  cx={50}
                  cy={50}
                  r={44}
                  fill="none"
                  stroke="#1F6F5C"
                  strokeWidth={2.5}
                  strokeDasharray="3 3"
                />
                <Circle
                  cx={50}
                  cy={50}
                  r={34}
                  fill="none"
                  stroke="#1F6F5C"
                  strokeWidth={2.5}
                />
                <Polygon
                  points="50,22 62,45 87,45 67,60 74,84 50,70 26,84 33,60 13,45 38,45"
                  fill="none"
                  stroke="#1F6F5C"
                  strokeWidth={2.5}
                />
              </Svg>
              <View style={s.documentHeader}>
                <View>
                  <Text style={s.authority}>{words.authority}</Text>
                  <Text style={s.permitTitle}>{words.permit}</Text>
                </View>
                <View style={s.documentNumber}>
                  <Text style={s.docNumber}>{words.document}</Text>
                  <Text style={s.validated}>{words.validated}</Text>
                </View>
              </View>
              <View style={s.fields}>
                <View style={s.row}>
                  <Field label={words.name} value={words.you} />
                  <Field label={words.destination} value={words.instagram} />
                </View>
                <View style={s.purpose}>
                  <Text style={s.label}>{words.purpose}</Text>
                  <Text style={s.purposeValue}>{words.filmmaking}</Text>
                </View>
                <View style={s.goal}>
                  <Text style={s.label}>{words.goalLabel}</Text>
                  <Text style={s.goalValue}>{words.goal}</Text>
                </View>
                <View style={s.row}>
                  <Field label={words.stay} value={words.minutes} green />
                  <Field label={words.entries} value="1" />
                </View>
              </View>
              <View style={s.mrz}>
                <Text numberOfLines={1} style={s.mrzText}>
                  {words.mrz1}
                </Text>
                <Text numberOfLines={1} style={s.mrzText}>
                  {words.mrz2}
                </Text>
              </View>
              <View style={s.roundStamp}>
                <View style={s.stampRing}>
                  <View style={s.stampDashed}>
                    <Text style={s.entry}>{words.entry}</Text>
                    <View style={s.stampTime}>
                      <Text style={s.stampTimeText}>{words.stampMinutes}</Text>
                    </View>
                    <Text style={s.approved}>{words.approved}</Text>
                  </View>
                </View>
              </View>
              <View style={s.exitStamp}>
                <Text style={s.exitText}>{words.exit}</Text>
                <Text style={s.terminal}>{words.terminal}</Text>
              </View>
            </View>
          </View>
          <View style={s.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={words.continue}
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={continueToProfile}
              style={({ pressed }) => [s.button, pressed && s.pressed]}
            >
              <Text style={s.buttonText}>{words.continue}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1F6F5C' },
  scroll: { flexGrow: 1, alignItems: 'center' },
  canvas: {
    width: '100%',
    maxWidth: 390,
    padding: 24,
    backgroundColor: '#1F6F5C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  brandRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6EE7B7',
    boxShadow: '0 0 8px rgba(110,231,183,0.8)',
  },
  brand: {
    fontFamily: 'Sora',
    fontWeight: '600',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  pill: {
    backgroundColor: '#165546CC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: '#34D39940',
  },
  pillText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 11,
    color: '#D1FAE5',
    letterSpacing: 0.3,
  },
  main: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
  headline: {
    fontFamily: 'Sora',
    fontWeight: '300',
    fontSize: 29,
    lineHeight: 34.22,
    letterSpacing: -1,
    color: '#F3FAF8',
    marginBottom: 20,
  },
  headlineStrong: { fontWeight: '700', color: '#FFFFFF' },
  permit: {
    backgroundColor: '#FAF8F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C4DED5',
    padding: 16,
    transform: [{ rotate: '-1.5deg' }],
    boxShadow: '0 16px 28px -5px rgba(9,36,29,0.45)',
  },
  paper: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  crest: { position: 'absolute', right: 12, top: 12, opacity: 0.09 },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#2B726033',
    paddingBottom: 10,
    marginBottom: 12,
  },
  authority: {
    fontFamily: 'DMMono-Medium',
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 1.8,
    color: '#1F6F5C',
  },
  permitTitle: {
    fontFamily: 'Sora',
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: 2.38,
    color: '#122B22',
    marginTop: 2,
  },
  documentNumber: { alignItems: 'flex-end' },
  docNumber: { fontFamily: 'DMMono-Regular', fontSize: 9, color: '#4C6E62' },
  validated: {
    fontFamily: 'DMMono-Medium',
    fontSize: 8,
    color: '#1F6F5C',
    backgroundColor: '#D7ECE4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fields: { gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  field: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#1F6F5C26',
    paddingBottom: 4,
  },
  label: {
    fontFamily: 'DMMono-Regular',
    fontSize: 9.5,
    lineHeight: 15,
    color: '#627A72',
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 21,
    color: '#11231C',
  },
  green: { color: '#1F6F5C' },
  purpose: {
    borderBottomWidth: 1,
    borderColor: '#1F6F5C33',
    paddingTop: 2,
    paddingBottom: 6,
  },
  purposeValue: {
    alignSelf: 'flex-start',
    fontFamily: 'Sora',
    fontWeight: '800',
    fontSize: 19,
    lineHeight: 27,
    letterSpacing: -0.5,
    color: '#0F2820',
    borderBottomWidth: 3,
    borderColor: '#1F6F5C',
    paddingBottom: 2,
    marginTop: 2,
  },
  goal: { borderBottomWidth: 1, borderColor: '#1F6F5C26', paddingBottom: 4 },
  goalValue: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    color: '#11231C',
  },
  mrz: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1F6F5C40',
    marginTop: 14,
    paddingTop: 8,
  },
  mrzText: {
    fontFamily: 'DMMono-Regular',
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.7,
    color: '#33554ABF',
  },
  roundStamp: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#1F6F5C',
    padding: 2,
    backgroundColor: '#FAF8F2F2',
    transform: [{ rotate: '12deg' }],
    elevation: 4,
  },
  stampRing: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1F6F5C',
    borderRadius: 48,
    padding: 3,
  },
  stampDashed: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1F6F5C',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  entry: {
    fontFamily: 'DMMono-Medium',
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: '#1F6F5C',
  },
  stampTime: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1F6F5C',
    width: '100%',
    alignItems: 'center',
    marginVertical: 2,
    paddingVertical: 2,
  },
  stampTimeText: {
    fontFamily: 'Sora',
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 18,
    color: '#1F6F5C',
  },
  approved: {
    fontFamily: 'DMMono-Medium',
    fontSize: 7,
    letterSpacing: 1,
    color: '#1F6F5C',
  },
  exitStamp: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#1F6F5C8C',
    borderRadius: 4,
    backgroundColor: '#EEF7F4CC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  exitText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 9.5,
    letterSpacing: 1,
    color: '#246B5ACC',
  },
  terminal: { fontFamily: 'DMMono-Regular', fontSize: 7.5, color: '#356E60B3' },
  footer: { paddingBottom: 8 },
  button: {
    minHeight: 56,
    borderRadius: 40,
    backgroundColor: '#FAF8F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    boxShadow: '0 12px 24px -6px rgba(10,35,28,0.5)',
  },
  buttonText: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: 15,
    color: '#123128',
  },
  pressed: { transform: [{ scale: 0.98 }] },
});
