import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { supabase } from './lib/supabase';

const Stack = createNativeStackNavigator();

const COLORS = {
  background: '#08080c',
  card: '#17171f',
  border: '#33333d',
  pink: '#ff2d55',
  white: '#ffffff',
  muted: '#aaaaaa',
  green: '#30d158',
};

// Convert common Nigerian phone-number formats to +234 format.
function normalizePhoneNumber(value) {
  const cleaned = value.replace(/[\s()-]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }

  return `+234${cleaned}`;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (mounted) {
          setSession(data.session ?? null);
        }
      } catch (error) {
        console.log('Session loading error:', error.message);

        if (mounted) {
          Alert.alert(
            'Connection problem',
            'Unable to load your session. Please check your internet connection.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.pink} />

        <Text style={styles.muted}>
          Loading Stream Toker...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      {session ? (
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: COLORS.background,
              },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
            />

            <Stack.Screen
              name="Discover"
              component={DiscoverScreen}
            />

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <PhoneLoginScreen />
      )}
    </SafeAreaView>
  );
}

// PHONE LOGIN AND SMS VERIFICATION

function PhoneLoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 10) {
      Alert.alert(
        'Check your number',
        'Please enter a valid phone number.'
      );
      return;
    }

    const formattedPhone = normalizePhoneNumber(phone);

    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        throw error;
      }

      setPhone(formattedPhone);
      setVerificationSent(true);

      Alert.alert(
        'Verification code sent',
        'Enter the SMS code sent to your phone.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to send code',
        error.message ||
          'Please check your phone number and try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!otp.trim()) {
      Alert.alert(
        'Missing code',
        'Enter the SMS verification code.'
      );
      return;
    }

    setBusy(true);

    try {
      const formattedPhone = normalizePhoneNumber(phone);

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp.trim(),
        type: 'sms',
      });

      if (error) {
        throw error;
      }

      // The authenticated session will open the app.
    } catch (error) {
      Alert.alert(
        'Verification failed',
        error.message ||
          'The code could not be verified. Please try again.'
      );
    } finally {
      setBusy(false);
