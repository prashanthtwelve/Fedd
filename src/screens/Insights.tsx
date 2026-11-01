import React from 'react';
import { Text, View } from 'react-native';
import { Award, Smile } from 'lucide-react-native';
import { Card, Eyebrow, Label, Screen, styles, Title } from '../components/ui';
import { useStore } from '../state/Store';
import { weeklyStats } from '../domain/model';
import { copy } from '../copy';
import { colors as c, fonts } from '../theme';
export function InsightsScreen() {
  const { data } = useStore();
  const stats = weeklyStats(data.sessions);
  const hasOutcomes = stats.found + stats.distracted > 0;
  return (
    <Screen tabbed title={copy.brand}>
      <Eyebrow>{copy.insights.eyebrow}</Eyebrow>
      <Title>{copy.insights.title}</Title>
      <Label muted>{copy.insights.subtitle}</Label>
      <View style={styles.row}>
        {[
          { label: copy.insights.started, value: stats.started },
          { label: copy.insights.goals, value: stats.found },
        ].map(item => (
          <Card key={item.label} style={{ flex: 1, padding: 16 }}>
            <Label muted>{item.label}</Label>
            <Text
              style={{
                fontFamily: fonts.heading,
                color: c.onSurface,
                fontSize: 36,
                fontWeight: '700',
              }}
            >
              {item.value}
            </Text>
          </Card>
        ))}
      </View>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontSize: 20, fontWeight: '700' }]}>
              {copy.insights.chart}
            </Text>
            <Label muted>{copy.insights.chartHint}</Label>
          </View>
          <Smile color={c.primaryContainer} />
        </View>
        <View
          accessibilityLabel={`${Math.round(stats.ratio * 100)}% ${
            copy.insights.satisfied
          }`}
          style={{
            height: 12,
            backgroundColor: c.surfaceContainerHighest,
            borderRadius: 12,
            overflow: 'hidden',
            marginVertical: 8,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${stats.ratio * 100}%`,
              backgroundColor: c.primaryContainer,
            }}
          />
        </View>
        {!hasOutcomes && <Label muted>{copy.insights.noOutcomes}</Label>}
        {[
          { title: copy.insights.satisfied, value: stats.found },
          { title: copy.insights.distracted, value: stats.distracted },
        ].map(item => (
          <View
            key={item.title}
            style={[
              styles.row,
              {
                justifyContent: 'space-between',
                backgroundColor: c.surfaceContainerLow,
                borderRadius: 8,
                padding: 10,
              },
            ]}
          >
            <Label>{item.title}</Label>
            <Label muted>{copy.insights.sessions(item.value)}</Label>
          </View>
        ))}
      </Card>
      <Card>
        <View style={styles.row}>
          <Award color={c.primaryContainer} />
          <Text style={[styles.body, { fontSize: 20, fontWeight: '700' }]}>
            {copy.insights.summary}
          </Text>
        </View>
        <Label muted>
          {stats.found ? copy.insights.wins(stats.found) : copy.insights.empty}
        </Label>
      </Card>
    </Screen>
  );
}
