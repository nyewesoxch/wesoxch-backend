import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme/colors';

import PhoneAuthScreen from './src/screens/PhoneAuthScreen';
import VerifyPhoneScreen from './src/screens/VerifyPhoneScreen';
import SetupProfileScreen from './src/screens/SetupProfileScreen';
import MainTabs from './src/navigation/MainTabs';

import CommunityChatScreen from './src/screens/CommunityChatScreen';
import CommunityMembersScreen from './src/screens/CommunityMembersScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import CreateCommunityScreen from './src/screens/CreateCommunityScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import RentalsScreen from './src/screens/RentalsScreen';
import CreateRentalScreen from './src/screens/CreateRentalScreen';
import TherapyScreen from './src/screens/TherapyScreen';
import TherapyRoomScreen from './src/screens/TherapyRoomScreen';
import BecomeSellerScreen from './src/screens/BecomeSellerScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';
import LegalScreen from './src/screens/LegalScreen';
import CarrierScreen from './src/screens/CarrierScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CommunityChat" component={CommunityChatScreen} />
          <Stack.Screen name="CommunityMembers" component={CommunityMembersScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
          <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          <Stack.Screen name="CreateListing" component={CreateListingScreen} />
          <Stack.Screen name="Rentals" component={RentalsScreen} />
          <Stack.Screen name="CreateRental" component={CreateRentalScreen} />
          <Stack.Screen name="Therapy" component={TherapyScreen} />
          <Stack.Screen name="TherapyRoom" component={TherapyRoomScreen} />
          <Stack.Screen name="BecomeSeller" component={BecomeSellerScreen} />
          <Stack.Screen name="MyListings" component={MyListingsScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
          <Stack.Screen name="Carrier" component={CarrierScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
          <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
          <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
