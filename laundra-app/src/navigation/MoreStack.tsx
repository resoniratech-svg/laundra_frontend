import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreScreen } from '../screens/More';
import { DutyLeavesScreen } from '../screens/DutyLeaves';
import { HelpdeskScreen } from '../screens/Helpdesk';
import { AnnouncementsScreen } from '../screens/Announcements';
import { ProfileScreen } from '../screens/Profile';
import { FieldOrderScreen } from '../screens/FieldOrder';
import { CashHandoverScreen } from '../screens/CashHandover';

export type MoreStackParamList = {
  MoreMain: undefined;
  FieldOrder: undefined;
  CashHandover: undefined;
  DutyLeaves: undefined;
  Helpdesk: undefined;
  Announcements: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export const MoreStack = () => {
  return (
    <Stack.Navigator id="MoreStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="FieldOrder" component={FieldOrderScreen} />
      <Stack.Screen name="CashHandover" component={CashHandoverScreen} />
      <Stack.Screen name="DutyLeaves" component={DutyLeavesScreen} />
      <Stack.Screen name="Helpdesk" component={HelpdeskScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};
