<VideoView
  player={player}
  style={StyleSheet.absoluteFill}
  contentFit="cover"
  nativeControls={false}
/>
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from './lib/supabase';

const Stack = createNativeStackNavigator();

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        Alert.alert('Session error', error.message);
      }

      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff2d55" />
        <Text style={styles.muted}>Loading Stream Toker...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#08080c" />

      {session ? (
        <NavigationContainer key="authenticated">
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#08080c' },
            }}
          >
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Discover" component={Discover} />
            <Stack.Screen name="Profile" component={Profile} />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <AuthScreen />
      )}
    </>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    if (mode === 'signup' && !username.trim()) {
      Alert.alert('Missing username', 'Enter a username.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }

    setBusy(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                username: username.trim(),
                display_name: username.trim(),
              },
              { onConflict: 'id' }
            );

          if (profileError) {
            Alert.alert(
              'Account created',
              'Your account was created, but the profile could not be saved: ' +
                profileError.message
            );
            return;
          }
        }

        if (!data.session) {
          Alert.alert(
            'Check your email',
            'Your account was created. Confirm your email before logging in.'
          );
          setMode('login');
        } else {
          Alert.alert('Welcome!', 'Your Stream Toker account is ready.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;
      }
    } catch (error) {
      Alert.alert('Unable to continue', error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.authScreen}>
      <View style={styles.authCard}>
        <Text style={styles.logo}>STREAM TOKER</Text>
        <Text style={styles.pageTitle}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={styles.muted}>
          {mode === 'login'
            ? 'Log in to continue'
            : 'Join the Stream Toker community'}
        </Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (at least 6 characters)"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setMode(mode === 'login' ? 'signup' : 'login')
          }
          style={styles.switchMode}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Log in'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Home({ navigation }) {
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);

  <View
  style={[
    StyleSheet.absoluteFill,
    { backgroundColor: '#15151f' },
  ]}
/>

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>STREAM TOKER</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
          <Ionicons name="search-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.videoArea}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />

        <View style={styles.videoInfo}>
          <View style={styles.creatorInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>S</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.creatorName}>Stream Toker Sample</Text>
              <Text style={styles.handle}>@streamtoker</Text>
            </View>

            <TouchableOpacity
              style={styles.followButton}
              onPress={() => setFollowing(!following)}
            >
              <Text style={styles.followText}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.caption}>Welcome to Stream Toker! 🎬</Text>
          <Text style={styles.caption}>Sample video for testing playback.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => setLiked(!liked)}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={32}
              color={liked ? '#ff2d55' : '#fff'}
            />
            <Text style={styles.actionLabel}>{liked ? 'Liked' : 'Like'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={() =>
              Alert.alert('Comments', 'Comments are not connected yet.')
            }
          >
            <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />
            <Text style={styles.actionLabel}>Comments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={() =>
              Alert.alert('Share', 'Video sharing is not connected yet.')
            }
          >
            <Ionicons name="share-social-outline" size={30} color="#fff" />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BottomNav navigation={navigation} active="Home" />
    </SafeAreaView>
  );
}

function Discover({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.pageTitle}>Discover</Text>
      <View style={styles.messageBox}>
        <Ionicons name="compass-outline" size={48} color="#ff2d55" />
        <Text style={styles.creatorName}>Discover Stream Toker</Text>
        <Text style={styles.muted}>Video discovery is our next step.</Text>
      </View>
      <BottomNav navigation={navigation} active="Discover" />
    </SafeAreaView>
  );
}

function Profile({ navigation }) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
    });
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Sign-out failed', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.pageTitle}>Your Profile</Text>

      <View style={styles.messageBox}>
        <View style={styles.largeAvatar}>
          <Text style={styles.avatarText}>S</Text>
        </View>
        <Text style={styles.creatorName}>Stream Toker</Text>
        <Text style={styles.handle}>{email}</Text>
        <Text style={styles.muted}>
          Your account is authenticated with Supabase.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={signOut}>
          <Text style={styles.primaryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <BottomNav navigation={navigation} active="Profile" />
    </SafeAreaView>
  );
}

function BottomNav({ navigation, active }) {
  return (
    <View style={styles.bottomNav}>
      <NavButton icon="home" label="Home" active={active === 'Home'} onPress={() => navigation.navigate('Home')} />
      <NavButton icon="compass-outline" label="Discover" active={active === 'Discover'} onPress={() => navigation.navigate('Discover')} />
      <NavButton icon="person-outline" label="Profile" active={active === 'Profile'} onPress={() => navigation.navigate('Profile')} />
    </View>
  );
}

function NavButton({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navButton} onPress={onPress}>
      <Ionicons name={icon} size={24} color={active ? '#ff2d55' : '#aaa'} />
      <Text style={[styles.navLabel, active && { color: '#ff2d55' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080c' },
  authScreen: {
    flex: 1,
    backgroundColor: '#08080c',
    justifyContent: 'center',
    padding: 22,
  },
  authCard: { width: '100%' },
  center: {
    flex: 1,
    backgroundColor: '#08080c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#08080c',
  },
  logo: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 21,
    letterSpacing: 1,
    marginBottom: 12,
  },
  videoArea: { flex: 1, backgroundColor: '#111', overflow: 'hidden' },
  videoInfo: { position: 'absolute', bottom: 20, left: 15, right: 78, zIndex: 2 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#ff2d55', alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  largeAvatar: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: '#ff2d55', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  creatorName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  handle: { color: '#ccc', marginTop: 3 },
  followButton: {
    borderWidth: 1, borderColor: '#fff', borderRadius: 7,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  followText: { color: '#fff', fontWeight: '800' },
  caption: { color: '#fff', fontSize: 14, marginBottom: 6 },
  actions: {
    position: 'absolute', right: 12, bottom: 30,
    zIndex: 3, alignItems: 'center', gap: 25,
  },
  action: { alignItems: 'center' },
  actionLabel: { color: '#fff', fontSize: 10, marginTop: 4 },
  bottomNav: {
    height: 66, flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', borderTopWidth: 1, borderTopColor: '#25252d',
    backgroundColor: '#0d0d13',
  },
  navButton: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navLabel: { color: '#aaa', fontSize: 11, marginTop: 3 },
  pageTitle: { color: '#fff', fontSize: 27, fontWeight: '900', padding: 20 },
  messageBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25,
  },
  muted: { color: '#aaa', textAlign: 'center', lineHeight: 22, marginTop: 12 },
  input: {
    backgroundColor: '#17171f',
    borderWidth: 1,
    borderColor: '#33333d',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    marginTop: 14,
  },
  primaryButton: {
    backgroundColor: '#ff2d55',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  switchMode: { padding: 18, alignItems: 'center' },
  switchText: { color: '#ddd', textAlign: 'center' },
});

export default App;
