import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './lib/supabase';

const Stack = createNativeStackNavigator();
const C = { bg: '#08080c', card: '#17171f', border: '#33333d', pink: '#ff2d55', white: '#fff', muted: '#aaa', green: '#30d158' };

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.log('Session error:', error.message);
      if (mounted) { setSession(data?.session ?? null); setLoading(false); }
    }).catch(error => { console.log('Session error:', error.message); if (mounted) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (mounted) setSession(nextSession); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  if (loading) return <View style={s.center}><StatusBar barStyle="light-content" /><ActivityIndicator size="large" color={C.pink} /><Text style={s.muted}>Loading Stream Toker…</Text></View>;
  return <SafeAreaView style={s.root}><StatusBar barStyle="light-content" backgroundColor={C.bg} />{session ? <NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}><Stack.Screen name="Home" component={HomeScreen} /><Stack.Screen name="Discover" component={DiscoverScreen} /><Stack.Screen name="Messages" component={MessagesScreen} /><Stack.Screen name="Profile" component={ProfileScreen} /></Stack.Navigator></NavigationContainer> : <AuthScreen />}</SafeAreaView>;
}

function AuthScreen() {
  const [mode, setMode] = useState('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false); const [username, setUsername] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() {
    if (!email.trim() || !password) return Alert.alert('Missing details', 'Enter your email and password.');
    if (mode === 'signup' && !username.trim()) return Alert.alert('Choose a username', 'Enter a username to create your profile.');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, username: username.trim(), display_name: username.trim() }, { onConflict: 'id' });
          if (profileError) console.log('Profile save error:', profileError.message);
        }
        Alert.alert('Account created', data.session ? 'Welcome to Stream Toker!' : 'Check your email to confirm your account, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) { Alert.alert(mode === 'signup' ? 'Sign-up failed' : 'Login failed', error.message || 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={s.authWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.authContent} keyboardShouldPersistTaps="handled"><Text style={s.logo}>STREAM <Text style={{ color: C.pink }}>TOKER</Text></Text><Text style={s.subtitle}>Short videos. Real connections.</Text><View style={s.card}><Text style={s.heading}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>{mode === 'signup' && <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={C.muted} autoCapitalize="none" style={s.input} />}<TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={C.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={s.input} /><View style={s.passwordRow}><TextInput value={password} onChangeText={setPassword} placeholder="Password (at least 6 characters)" placeholderTextColor={C.muted} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} style={[s.input, s.passwordInput]} /><TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword(!showPassword)} style={s.eyeButton}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={C.muted} /></TouchableOpacity></View><TouchableOpacity style={s.primary} onPress={submit} disabled={busy}><Text style={s.primaryText}>{busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}</Text></TouchableOpacity><TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={s.switch}><Text style={s.muted}>{mode === 'login' ? 'New to Stream Toker? ' : 'Already have an account? '}<Text style={{ color: C.pink }}>{mode === 'login' ? 'Create account' : 'Log in'}</Text></Text></TouchableOpacity></View></ScrollView></KeyboardAvoidingView>;
}

function HomeScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [userId, setUserId] = useState(null);
  const [commentVideo, setCommentVideo] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsBusy, setCommentsBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.log('User lookup error:', error.message);
      const id = data?.user?.id || null;
      if (active) {
        setUserId(id);
        await loadVideos(id);
      }
    })();
    return () => { active = false; };
  }, []);

  async function loadVideos(currentUserId = userId) {
    setBusy(true);
    try {
      const { data, error } = await supabase.from('stream_videos')
        .select('id, user_id, caption, storage_path, created_at')
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      const withUrls = await Promise.all((data || []).map(async video => {
        const { data: urlData } = await supabase.storage.from('stream-toker-videos').createSignedUrl(video.storage_path, 3600);
        const { data: likesData, error: likesError } = await supabase.from('stream_video_likes').select('user_id').eq('video_id', video.id);
        if (likesError) throw likesError;
        return { ...video, playbackUrl: urlData?.signedUrl || null, likeCount: likesData?.length || 0, likedByMe: !!currentUserId && (likesData || []).some(like => like.user_id === currentUserId) };
      }));
      setVideos(withUrls);
    } catch (error) {
      Alert.alert('Feed needs setup', 'Could not load the video feed. Check your connection and Supabase permissions.\n\n' + (error.message || 'Please try again.'));
    } finally { setBusy(false); }
  }

  async function uploadVideo() {
    if (!userId) return Alert.alert('Log in required', 'Log in before uploading a video.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission needed', 'Allow photo and video access to choose a video.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'], allowsEditing: false, quality: 1, videoMaxDuration: 180
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const extension = (asset.fileName || asset.uri.split('/').pop() || 'upload.mp4').split('.').pop().split('?')[0] || 'mp4';
      const path = userId + '/' + Date.now() + '.' + extension;
      const contentType = asset.mimeType || 'video/mp4';
      const { error: storageError } = await supabase.storage.from('stream-toker-videos')
        .upload(path, blob, { contentType, upsert: false });
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from('stream_videos')
        .insert({ user_id: userId, caption: caption.trim(), storage_path: path });
      if (rowError) {
        await supabase.storage.from('stream-toker-videos').remove([path]);
        throw rowError;
      }
      setCaption('');
      Alert.alert('Video published', 'Your video has been added to the feed.');
      await loadVideos();
    } catch (error) {
      Alert.alert('Upload failed', error.message || 'Please try again.');
    } finally { setBusy(false); }
  }

  async function toggleLike(videoId) {
    if (!userId) return Alert.alert('Log in required', 'Log in to like videos.');
    try {
      const { data: existing, error: findError } = await supabase.from('stream_video_likes')
        .select('id').eq('video_id', videoId).eq('user_id', userId).maybeSingle();
      if (findError) throw findError;
      if (existing) {
        const { error } = await supabase.from('stream_video_likes').delete().eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stream_video_likes').insert({ video_id: videoId, user_id: userId });
        if (error) throw error;
      }
      setVideos(current => current.map(video => video.id === videoId ? { ...video, likedByMe: !existing, likeCount: Math.max(0, (video.likeCount || 0) + (existing ? -1 : 1)) } : video));
    } catch (error) { Alert.alert('Like failed', error.message || 'Please try again.'); }
  }

  async function addComment(videoId) {
    if (!userId) return Alert.alert('Log in required', 'Log in to comment.');
    setCommentVideo(videoId);
    setCommentText('');
    setComments([]);
    setCommentsBusy(true);
    try {
      const { data, error } = await supabase.from('stream_video_comments')
        .select('id, user_id, comment_text, created_at')
        .eq('video_id', videoId).order('created_at', { ascending: true }).limit(100);
      if (error) throw error;
      const rows = data || [];
      const ids = [...new Set(rows.map(comment => comment.user_id))];
      const { data: authors } = ids.length ? await supabase.from('profiles').select('id, username').in('id', ids) : { data: [] };
      const names = new Map((authors || []).map(author => [author.id, author.username]));
      setComments(rows.map(comment => ({ ...comment, username: names.get(comment.user_id) || null })));
    } catch (error) {
      Alert.alert('Comments unavailable', error.message || 'Could not load comments.');
    } finally { setCommentsBusy(false); }
  }

  async function sendComment() {
    const text = commentText.trim();
    if (!text || !commentVideo) return;
    setCommentsBusy(true);
    try {
      const { data, error } = await supabase.from('stream_video_comments')
        .insert({ video_id: commentVideo, user_id: userId, comment_text: text })
        .select('id, user_id, comment_text, created_at').single();
      if (error) throw error;
      const { data: author } = await supabase.from('profiles').select('username').eq('id', data.user_id).maybeSingle();
      setComments(current => [...current, { ...data, username: author?.username || null }]);
      setCommentText('');
    } catch (error) {
      Alert.alert('Comment failed', error.message || 'Please try again.');
    } finally { setCommentsBusy(false); }
  }

  return <View style={s.screen}>
    <View style={s.top}><Text style={s.logoSmall}>STREAM <Text style={{ color: C.pink }}>TOKER</Text></Text><View style={{ flexDirection: 'row', gap: 18 }}><TouchableOpacity onPress={() => navigation.navigate('Messages')}><Ionicons name="chatbubbles-outline" size={25} color={C.white} /></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('Discover')}><Ionicons name="search-outline" size={25} color={C.white} /></TouchableOpacity></View></View>
    <View style={s.uploadBox}>
      <TextInput value={caption} onChangeText={setCaption} placeholder="Write a caption for your video…" placeholderTextColor={C.muted} style={[s.input, { marginBottom: 8 }]} maxLength={300} />
      <TouchableOpacity style={s.primary} onPress={uploadVideo} disabled={busy}><Text style={s.primaryText}>{busy ? 'Please wait…' : '＋ Upload a video'}</Text></TouchableOpacity>
    </View>
    <FlatList data={videos} keyExtractor={item => item.id} onRefresh={loadVideos} refreshing={busy}
      ListEmptyComponent={<View style={s.emptyFeed}><Ionicons name="videocam-outline" size={54} color={C.pink} /><Text style={s.videoTitle}>Your feed is ready for creators</Text><Text style={s.muted}>Upload a video to start building the Stream Toker feed.</Text></View>}
      renderItem={({ item }) => <VideoPost item={item} onLike={() => toggleLike(item.id)} onComment={() => addComment(item.id)} />}
      contentContainerStyle={{ paddingBottom: 12 }} />
    <BottomNav navigation={navigation} current="Home" />
    <Modal visible={!!commentVideo} animationType="slide" transparent onRequestClose={() => setCommentVideo(null)}>
      <View style={s.modalShade}>
        <View style={s.commentSheet}>
          <View style={s.commentHeader}><Text style={s.heading}>Comments</Text><TouchableOpacity onPress={() => setCommentVideo(null)}><Ionicons name="close" size={27} color={C.white} /></TouchableOpacity></View>
          {commentsBusy && comments.length === 0 ? <ActivityIndicator color={C.pink} /> : null}
          <ScrollView style={s.commentList} contentContainerStyle={{ paddingBottom: 12 }}>
            {comments.map(comment => <View key={comment.id} style={s.commentRow}><Text style={s.commentUser}>@{comment.username || 'creator'}</Text><Text style={s.bodyText}>{comment.comment_text}</Text></View>)}
            {!commentsBusy && comments.length === 0 ? <Text style={s.muted}>No comments yet. Start the conversation.</Text> : null}
          </ScrollView>
          <View style={s.commentComposer}><TextInput value={commentText} onChangeText={setCommentText} placeholder="Write a comment…" placeholderTextColor={C.muted} style={[s.input, { flex: 1, marginBottom: 0 }]} maxLength={1000} multiline /><TouchableOpacity style={s.sendButton} onPress={sendComment} disabled={commentsBusy || !commentText.trim()}><Ionicons name="send" size={22} color={C.white} /></TouchableOpacity></View>
        </View>
      </View>
    </Modal>
  </View>;
}

function VideoPost({ item, onLike, onComment }) {
  const player = useVideoPlayer(item.playbackUrl || '', p => { p.loop = true; });
  return <View style={s.postCard}>
    {item.playbackUrl ? <VideoView player={player} style={s.realVideo} contentFit="contain" nativeControls allowsFullscreen /> :
      <View style={s.videoUnavailable}><Ionicons name="videocam-outline" size={48} color={C.muted} /><Text style={s.muted}>Video link unavailable. Pull down to refresh.</Text></View>}
    <Text style={s.bodyText}>{item.caption || 'A new Stream Toker video'}</Text>
    <Text style={s.muted}>Creator · {new Date(item.created_at).toLocaleDateString()}</Text>
    <View style={s.postActions}>
      <TouchableOpacity style={s.action} onPress={onLike}><Ionicons name={item.likedByMe ? 'heart' : 'heart-outline'} size={25} color={C.pink} /><Text style={s.muted}>{item.likeCount || 0} · {item.likedByMe ? 'Liked' : 'Like'}</Text></TouchableOpacity>
      <TouchableOpacity style={s.action} onPress={onComment}><Ionicons name="chatbubble-outline" size={25} color={C.white} /><Text style={s.muted}>Comment</Text></TouchableOpacity>
    </View>
  </View>;
}
function DiscoverScreen({ navigation }) {
  const [query, setQuery] = useState(''); const [profiles, setProfiles] = useState([]); const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState(null); const [followingIds, setFollowingIds] = useState([]);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null)); }, []);
  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, username, display_name').ilike('username', `%${query.trim()}%`).limit(25);
      if (error) throw error;
      setProfiles(data || []);
      if (userId) {
        const { data: follows, error: followError } = await supabase.from('stream_follows').select('following_id').eq('follower_id', userId);
        if (followError) throw followError;
        setFollowingIds((follows || []).map(row => row.following_id));
      }
    } catch (error) { Alert.alert('Search unavailable', error.message || 'Could not search profiles.'); }
    finally { setBusy(false); }
  }
  async function toggleFollow(profileId) {
    if (!userId) return Alert.alert('Log in required', 'Log in to follow creators.');
    if (profileId === userId) return;
    const isFollowing = followingIds.includes(profileId);
    setBusy(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from('stream_follows').delete().eq('follower_id', userId).eq('following_id', profileId);
        if (error) throw error;
        setFollowingIds(current => current.filter(id => id !== profileId));
      } else {
        const { error } = await supabase.from('stream_follows').insert({ follower_id: userId, following_id: profileId });
        if (error) throw error;
        setFollowingIds(current => [...current, profileId]);
      }
    } catch (error) { Alert.alert('Follow failed', error.message || 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <View style={s.screen}><View style={s.top}><Text style={s.heading}>Discover</Text><TouchableOpacity onPress={() => navigation.navigate('Profile')}><Ionicons name="person-circle-outline" size={27} color={C.white} /></TouchableOpacity></View><View style={s.searchRow}><TextInput value={query} onChangeText={setQuery} placeholder="Search usernames" placeholderTextColor={C.muted} autoCapitalize="none" style={[s.input, { flex: 1, marginBottom: 0 }]} /><TouchableOpacity style={s.searchButton} onPress={search}><Text style={s.primaryText}>{busy ? '…' : 'Search'}</Text></TouchableOpacity></View><ScrollView contentContainerStyle={{ padding: 16 }}>{profiles.length ? profiles.map(p => <View key={p.id} style={s.profileRow}><Ionicons name="person-circle" size={36} color={C.pink} /><View style={{ flex: 1 }}><Text style={s.bodyText}>{p.display_name || p.username}</Text><Text style={s.muted}>@{p.username}</Text></View>{p.id !== userId ? <TouchableOpacity style={s.followButton} onPress={() => toggleFollow(p.id)} disabled={busy}><Text style={s.primaryText}>{followingIds.includes(p.id) ? 'Following' : 'Follow'}</Text></TouchableOpacity> : <Text style={s.muted}>You</Text>}</View>) : <Text style={s.muted}>Search for creators by username.</Text>}</ScrollView><BottomNav navigation={navigation} current="Discover" /></View>;
}
function MessagesScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null)); }, []);

  async function searchPeople() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, username, display_name').ilike('username', `%${query.trim()}%`).limit(20);
      if (error) throw error;
      setProfiles((data || []).filter(person => person.id !== userId));
    } catch (error) { Alert.alert('Search failed', error.message || 'Could not search people.'); }
    finally { setBusy(false); }
  }

  async function openConversation(person) {
    setRecipient(person);
    setProfiles([]);
    setBusy(true);
    try {
      const { data, error } = await supabase.from('messages')
        .select('id, sender_id, receiver_id, body, created_at')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true }).limit(200);
      if (error) throw error;
      setMessages(data || []);
    } catch (error) { Alert.alert('Messages unavailable', error.message || 'Check your message-table permissions.'); }
    finally { setBusy(false); }
  }

  async function sendMessage() {
    const text = body.trim();
    if (!text || !recipient || !userId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('messages')
        .insert({ sender_id: userId, receiver_id: recipient.id, body: text })
        .select('id, sender_id, receiver_id, body, created_at').single();
      if (error) throw error;
      setMessages(current => [...current, data]);
      setBody('');
    } catch (error) { Alert.alert('Send failed', error.message || 'Could not send message.'); }
    finally { setBusy(false); }
  }

  return <View style={s.screen}>
    <View style={s.top}><TouchableOpacity onPress={() => recipient ? setRecipient(null) : navigation.navigate('Home')}><Ionicons name="arrow-back" size={24} color={C.white} /></TouchableOpacity><Text style={s.heading}>{recipient ? (recipient.display_name || recipient.username) : 'Messages'}</Text><View style={{ width: 24 }} /></View>
    {!recipient ? <View style={s.searchRow}><TextInput value={query} onChangeText={setQuery} placeholder="Find someone by username" placeholderTextColor={C.muted} autoCapitalize="none" style={[s.input, { flex: 1, marginBottom: 0 }]} /><TouchableOpacity style={s.searchButton} onPress={searchPeople}><Text style={s.primaryText}>{busy ? '…' : 'Find'}</Text></TouchableOpacity></View> : null}
    {!recipient ? <ScrollView contentContainerStyle={{ padding: 16 }}>{profiles.map(person => <TouchableOpacity key={person.id} style={s.profileRow} onPress={() => openConversation(person)}><Ionicons name="person-circle" size={36} color={C.pink} /><View><Text style={s.bodyText}>{person.display_name || person.username}</Text><Text style={s.muted}>@{person.username}</Text></View></TouchableOpacity>)}</ScrollView> :
      <><ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>{messages.map(message => <View key={message.id} style={[s.messageBubble, { alignSelf: message.sender_id === userId ? 'flex-end' : 'flex-start', backgroundColor: message.sender_id === userId ? '#6d1930' : C.card }]}><Text style={s.bodyText}>{message.body}</Text><Text style={s.muted}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>)}</ScrollView><View style={s.commentComposer}><TextInput value={body} onChangeText={setBody} placeholder="Write a message…" placeholderTextColor={C.muted} style={[s.input, { flex: 1, marginBottom: 0 }]} maxLength={5000} multiline /><TouchableOpacity style={s.sendButton} onPress={sendMessage} disabled={busy || !body.trim()}><Ionicons name="send" size={22} color={C.white} /></TouchableOpacity></View></>}
    <BottomNav navigation={navigation} current="Messages" />
  </View>;
}

function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null); const [busy, setBusy] = useState(false); const user = supabase.auth.getSession;
  useEffect(() => { let active = true; (async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session?.user || !active) return; const { data } = await supabase.from('profiles').select('username, display_name').eq('id', session.user.id).maybeSingle(); if (active) setProfile({ ...data, email: session.user.email, phone: session.user.phone }); })(); return () => { active = false; }; }, []);
  async function signOut() { setBusy(true); const { error } = await supabase.auth.signOut(); setBusy(false); if (error) Alert.alert('Sign out failed', error.message); }
  return <View style={s.screen}><View style={s.top}><Text style={s.heading}>Profile</Text></View><View style={s.profileCard}><Ionicons name="person-circle-outline" size={82} color={C.pink} /><Text style={s.heading}>{profile?.display_name || profile?.username || 'Your profile'}</Text>{profile?.username ? <Text style={s.muted}>@{profile.username}</Text> : null}<Text style={s.bodyText}>{profile?.email || profile?.phone || ''}</Text><Text style={s.muted}>Creator profile</Text><TouchableOpacity style={s.primary} onPress={signOut} disabled={busy}><Text style={s.primaryText}>{busy ? 'Signing out…' : 'Sign Out'}</Text></TouchableOpacity></View><BottomNav navigation={navigation} current="Profile" /></View>;
}
function BottomNav({ navigation, current }) { return <View style={s.nav}>{[['Home','home-outline'],['Discover','compass-outline'],['Messages','chatbubbles-outline'],['Profile','person-outline']].map(([name, icon]) => <TouchableOpacity key={name} style={s.navItem} onPress={() => navigation.navigate(name)}><Ionicons name={icon} size={23} color={current === name ? C.pink : C.muted} /><Text style={{ color: current === name ? C.pink : C.muted, fontSize: 12 }}>{name}</Text></TouchableOpacity>)}</View>; }

const s = StyleSheet.create({ messageBubble: { maxWidth: '82%', padding: 11, borderRadius: 12, marginVertical: 5 }, followButton: { backgroundColor: C.pink, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 }, modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }, commentSheet: { height: '75%', backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }, commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, commentList: { flex: 1, marginVertical: 10 }, commentRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }, commentUser: { color: C.pink, fontWeight: '700', fontSize: 12 }, commentComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }, sendButton: { backgroundColor: C.pink, width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, uploadBox: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border }, postCard: { margin: 14, padding: 12, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border }, realVideo: { width: '100%', height: 360, backgroundColor: '#000', borderRadius: 10 }, videoUnavailable: { height: 220, backgroundColor: '#101016', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10 }, postActions: { flexDirection: 'row', gap: 28, paddingTop: 12 }, emptyFeed: { alignItems: 'center', justifyContent: 'center', padding: 35, gap: 12 }, root: { flex: 1, backgroundColor: C.bg }, screen: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }, authWrap: { flex: 1, backgroundColor: C.bg }, authContent: { flexGrow: 1, justifyContent: 'center', padding: 22 }, logo: { color: C.white, fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: 1 }, logoSmall: { color: C.white, fontSize: 20, fontWeight: '900' }, subtitle: { color: C.muted, textAlign: 'center', marginTop: 8, marginBottom: 28 }, card: { backgroundColor: C.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.border }, heading: { color: C.white, fontSize: 23, fontWeight: '800', marginBottom: 16 }, input: { color: C.white, backgroundColor: '#101016', borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12, fontSize: 15 }, passwordRow: { position: 'relative', justifyContent: 'center' }, passwordInput: { paddingRight: 48 }, eyeButton: { position: 'absolute', right: 14, top: 0, bottom: 12, justifyContent: 'center', alignItems: 'center' }, primary: { backgroundColor: C.pink, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 }, primaryText: { color: C.white, fontWeight: '800', fontSize: 15 }, switch: { alignItems: 'center', paddingTop: 20 }, muted: { color: C.muted, fontSize: 13 }, bodyText: { color: C.white, fontSize: 15, marginTop: 5 }, top: { paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: C.border, borderBottomWidth: 1 }, video: { flex: 1, margin: 16, borderRadius: 18, backgroundColor: '#20202a', alignItems: 'center', justifyContent: 'center', padding: 24 }, videoTitle: { color: C.white, fontWeight: '800', fontSize: 20, marginTop: 14, marginBottom: 8, textAlign: 'center' }, demoNote: { color: C.muted, fontSize: 12, marginTop: 20, textAlign: 'center' }, actions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 }, action: { alignItems: 'center', gap: 4 }, nav: { flexDirection: 'row', justifyContent: 'space-around', borderTopColor: C.border, borderTopWidth: 1, paddingTop: 10, paddingBottom: 8 }, navItem: { alignItems: 'center', gap: 4, minWidth: 70 }, searchRow: { flexDirection: 'row', padding: 14, gap: 8 }, searchButton: { backgroundColor: C.pink, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }, profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }, profileCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 } });
