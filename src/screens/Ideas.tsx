import React, { useState } from 'react';
import { View } from 'react-native';
import { Bookmark, BookOpen } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Card,
  Chip,
  Eyebrow,
  Label,
  Screen,
  styles,
  Title,
} from '../components/ui';
import { copy } from '../copy';
import { useStore } from '../state/Store';
import { colors as c } from '../theme';
import type { RootParams } from '../navigation/types';
export function IdeasScreen({
  navigation,
}: NativeStackScreenProps<RootParams, 'Ideas'>) {
  const { data } = useStore();
  const [filter, setFilter] = useState<string | null>(null);
  const interests = Array.from(
    new Map(
      data.ideas.flatMap(idea => idea.interests).map(p => [p.id, p]),
    ).values(),
  );
  const ideas = data.ideas.filter(
    idea => !filter || idea.interests.some(p => p.id === filter),
  );
  return (
    <Screen title={copy.ideas.title} back={navigation.goBack}>
      <Eyebrow>{copy.ideas.eyebrow}</Eyebrow>
      <Title>{copy.ideas.heading}</Title>
      <Label muted>{copy.ideas.subtitle}</Label>
      <View style={styles.wrap}>
        <Chip
          title={`${copy.ideas.all} (${data.ideas.length})`}
          selected={!filter}
          onPress={() => setFilter(null)}
        />
        {interests.map(p => (
          <Chip
            key={p.id}
            title={p.name}
            selected={filter === p.id}
            onPress={() => setFilter(p.id)}
          />
        ))}
      </View>
      {ideas.length ? (
        <View style={[styles.wrap, { gap: 14 }]}>
          {ideas.map(idea => (
            <Card
              key={idea.id}
              style={{ width: '47.5%', padding: 16, minHeight: 190 }}
            >
              <Bookmark color={c.primaryContainer} size={20} />
              <Eyebrow>{idea.interests.map(p => p.name).join(' · ')}</Eyebrow>
              <Label>{idea.text}</Label>
              <Label muted style={{ fontSize: 12 }}>
                {new Date(idea.createdAt).toLocaleDateString()}
              </Label>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <BookOpen size={40} color={c.primaryContainer} />
          <Title>{copy.ideas.empty}</Title>
          <Label muted>{copy.ideas.emptyHint}</Label>
        </Card>
      )}
      <Label muted>{copy.ideas.footer}</Label>
    </Screen>
  );
}
