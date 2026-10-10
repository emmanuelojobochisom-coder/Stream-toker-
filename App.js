import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

const Stack = createNativeStackNavigator();
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#08080c" />
      <NavigationContainer>
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
    </>
  );
}

function Home({ navigation }) {
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [playing, setPlaying] = useState(true);

  const player = useVideoPlayer(SAMPLE_VIDEO, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.play();
  });

  function togglePlayback() {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
    setPlaying(!playing);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>STREAM TOKER</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Discover')}
          accessibilityLabel="Discover"
        >
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

        <TouchableOpacity
          style={styles.videoTap}
          onPress={togglePlayback}
          activeOpacity={1}
          accessibilityLabel={playing ? 'Pause video' : 'Play video'}
        >
          {!playing && (
            <Ionicons name="play-circle" size={64} color="#fff" />
          )}
        </TouchableOpacity>

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

          <Text style={styles.caption}>
            Welcome to Stream Toker! 🎬
          </Text>
          <Text style={styles.caption}>
            Sample video for testing playback.
          </Text>
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
            <Text style={styles.actionLabel}>
              {liked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={() =>
              Alert.alert(
                'Comments',
                'Real comments will be added when the backend is connected.'
              )
            }
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={30}
              color="#fff"
            />
            <Text style={styles.actionLabel}>Comments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={() =>
              Alert.alert(
                'Share',
                'Video sharing will be connected in a later step.'
              )
            }
          >
            <Ionicons
              name="share-social-outline"
              size={30}
              color="#fff"
            />
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
        <Text style={styles.muted}>
          Real user and video discovery will be connected to Supabase.
        </Text>
      </View>

      <BottomNav navigation={navigation} active="Discover" />
    </SafeAreaView>
  );
}

function Profile({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.pageTitle}>Your Profile</Text>

      <View style={styles.messageBox}>
        <View style={styles.largeAvatar}>
          <Text style={styles.avatarText}>S</Text>
        </View>

        <Text style={styles.creatorName}>Stream Toker</Text>
        <Text style={styles.handle}>Your profile</Text>

        <Text style={styles.muted}>
          Real account registration and profile data still need to be
          connected to Supabase.
        </Text>
      </View>

      <BottomNav navigation={navigation} active="Profile" />
    </SafeAreaView>
  );
}

function BottomNav({ navigation, active }) {
  return (
    <View style={styles.bottomNav}>
      <NavButton
        icon="home"
        label="Home"
        active={active === 'Home'}
        onPress={() => navigation.navigate('Home')}
      />

      <NavButton
        icon="compass-outline"
        label="Discover"
        active={active === 'Discover'}
        onPress={() => navigation.navigate('Discover')}
      />

      <NavButton
        icon="person-outline"
        label="Profile"
        active={active === 'Profile'}
        onPress={() => navigation.navigate('Profile')}
      />
    </View>
  );
}

function NavButton({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navButton} onPress={onPress}>
      <Ionicons
        name={icon}
        size={24}
        color={active ? '#ff2d55' : '#aaa'}
      />
      <Text
        style={[
          styles.navLabel,
          active && { color: '#ff2d55' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08080c',
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
    fontSize: 19,
    letterSpacing: 1,
  },
  videoArea: {
    flex: 1,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  videoTap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  videoInfo: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 78,
    zIndex: 2,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ff2d55',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  largeAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#ff2d55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
  },
  creatorName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  handle: {
    color: '#ccc',
    marginTop: 3,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  followText: {
    color: '#fff',
    fontWeight: '800',
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
  },
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 30,
    zIndex: 3,
    alignItems: 'center',
    gap: 25,
  },
  action: {
    alignItems: 'center',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
  },
  bottomNav: {
    height: 66,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#25252d',
    backgroundColor: '#0d0d13',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  navLabel: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 3,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
    padding: 20,
  },
  messageBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },
  muted: {
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
});
