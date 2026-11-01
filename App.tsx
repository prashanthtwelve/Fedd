import React, { useEffect, useState } from 'react';
import { AppState, Linking, StatusBar } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FloatingBar } from './src/navigation/FloatingBar';
import { Button, Label, Screen, Title } from './src/components/ui';
import { PickerScreen, SessionLengthScreen } from './src/screens/Onboarding';
import { LocalProfileScreen, UnlockScreen } from './src/screens/LocalProfile';
import { LandingScreen } from './src/screens/Landing';
import { PrivacyScreen } from './src/screens/Privacy';
import { ActivitiesScreen, ActivityScreen } from './src/screens/Activities';
import { InsightsScreen } from './src/screens/Insights';
import { SettingsScreen } from './src/screens/Settings';
import { IdeasScreen } from './src/screens/Ideas';
import { HomeScreen } from './src/screens/Home';
import {
  IntentScreen,
  HandoffScreen,
  CheckinScreen,
} from './src/screens/Session';
import { StoreProvider, useStore } from './src/state/Store';
import type { RootParams, TabParams } from './src/navigation/types';
import { copy } from './src/copy';
import { TabHiddenContext } from './src/navigation/TabVisibility';
import { shouldCheckIn } from './src/domain/sessions';
import { nudges } from './src/services/session';
const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootParams>();
const nav = createNavigationContainerRef<RootParams>();
// React Navigation invokes this callback itself; let React render the component
// so the floating bar's hooks have their own component lifecycle.
const renderFloatingBar = (props: BottomTabBarProps) => (
  <FloatingBar {...props} />
);
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={renderFloatingBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
function Navigation() {
  const [tabsHidden, setTabsHidden] = useState(false);
  const { data, loading, error, reload, security } = useStore();
  const active = data.sessions.find(s => s.id === data.activeSessionId);
  function recover() {
    if (
      shouldCheckIn(data, Date.now()) &&
      nav.isReady() &&
      nav.getCurrentRoute()?.name !== 'Checkin' &&
      nav.getCurrentRoute()?.name !== 'Handoff'
    ) {
      nav.navigate('Checkin');
    }
  }
  useEffect(() => {
    if (loading || security?.locked || error) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      if (
        AppState.currentState === 'active' &&
        shouldCheckIn(data, Date.now()) &&
        nav.isReady() &&
        nav.getCurrentRoute()?.name !== 'Checkin' &&
        nav.getCurrentRoute()?.name !== 'Handoff'
      ) {
        nav.navigate('Checkin');
      }
    };
    const sync = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (AppState.currentState !== 'active') {
        return;
      }
      check();
      if (!active) {
        nudges.finish().catch(() => undefined);
      } else {
        nudges.schedule(active, data.nudge).catch(() => undefined);
        if (active.endTimestamp > Date.now())
          timeout = setTimeout(
            check,
            Math.min(2147483647, active.endTimestamp - Date.now()),
          );
      }
    };
    const app = AppState.addEventListener('change', sync);
    const onUrl = ({ url }: { url: string }) => {
      if (url === `fedd://checkin/${active?.id}`) {
        check();
      }
    };
    const link = Linking.addEventListener('url', onUrl);
    Linking.getInitialURL()
      .then(url => {
        if (url) onUrl({ url });
      })
      .catch(() => undefined);
    sync();
    return () => {
      app.remove();
      link.remove();
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [active, data, loading, security?.locked, error]);
  if (loading) {
    return (
      <Screen>
        <Label>{copy.loading}</Label>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <Title>{copy.common.error}</Title>
        <Label>{error}</Label>
        <Button title={copy.common.retry} onPress={reload} />
      </Screen>
    );
  }
  if (security?.locked) return <UnlockScreen />;
  return (
    <TabHiddenContext.Provider value={tabsHidden}>
      <NavigationContainer
        ref={nav}
        onReady={() => {
          setTabsHidden(false);
          recover();
        }}
        onStateChange={() =>
          setTabsHidden(
            !['Home', 'Activities', 'Insights', 'Settings', 'Main'].includes(
              nav.getCurrentRoute()?.name ?? '',
            ),
          )
        }
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!data.profile ? (
            <Stack.Group navigationKey="auth">
              {!data.landingSeen ? (
                <Stack.Screen name="Landing" component={LandingScreen} />
              ) : (
                <Stack.Screen name="Login" component={LocalProfileScreen} />
              )}
              <Stack.Screen name="Privacy" component={PrivacyScreen} />
            </Stack.Group>
          ) : !data.onboarded ? (
            <Stack.Group navigationKey="onboarding">
              <Stack.Screen name="Interests" component={PickerScreen} />
              <Stack.Screen
                name="SessionLength"
                component={SessionLengthScreen}
              />
            </Stack.Group>
          ) : (
            <Stack.Group navigationKey="app">
              <Stack.Screen name="Main" component={Tabs} />
              <Stack.Screen name="Interests" component={PickerScreen} />
              <Stack.Screen
                name="Intent"
                component={IntentScreen}
                options={{
                  presentation: 'transparentModal',
                  animation: 'slide_from_bottom',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
              <Stack.Screen name="Handoff" component={HandoffScreen} />
              <Stack.Screen name="Checkin" component={CheckinScreen} />
              <Stack.Screen name="Activity" component={ActivityScreen} />
              <Stack.Screen name="Ideas" component={IdeasScreen} />
              <Stack.Screen name="Privacy" component={PrivacyScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </TabHiddenContext.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar barStyle="dark-content" />
        <Navigation />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
