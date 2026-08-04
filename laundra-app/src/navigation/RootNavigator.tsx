import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/Login';
import { BottomTabs } from './BottomTabs';
import { useAuthStore } from '../store/authStore';
import { SessionService } from '../utils/session';
import { LoadingView } from '../components/LoadingView';

export type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    SessionService.loadSession().finally(() => {
      setInitializing(false);
    });
  }, []);

  if (initializing) {
    return <LoadingView message="Initializing session..." />;
  }

  return (
    <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="MainApp" component={BottomTabs} />
      )}
    </Stack.Navigator>
  );
};
