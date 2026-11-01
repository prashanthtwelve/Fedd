import type { NavigatorScreenParams } from '@react-navigation/native';
export type TabParams = {
  Home: undefined;
  Activities: undefined;
  Insights: undefined;
  Settings: undefined;
};
export type RootParams = {
  Landing: undefined;
  Login: undefined;
  Privacy: { recovery?: boolean } | undefined;
  Interests: { editing?: boolean } | undefined;
  SessionLength: undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  Intent: undefined;
  Handoff: { minutes: number; goal: string };
  Checkin: undefined;
  Activity: { id: number; thenSession?: { minutes: number; goal: string } };
  Ideas: undefined;
};
