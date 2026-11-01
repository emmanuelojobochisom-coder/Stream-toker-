import React, { useEffect, useRef, useState } from "react";
import { Alert, PermissionsAndroid, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType,
  VideoCanvas, RenderModeType
} from "react-native-agora";
import { supabase } from "../lib/supabase";

const C = { bg: "#08080c", card: "#17171f", border: "#33333d", pink: "#ff2d55", white: "#fff", muted: "#aaa" };
const AGORA_APP_ID = "66eccfc8beae406ba85559273d09cffb";

export default function LiveGiftsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [lives, setLives] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [title, setTitle] = useState("My Stream Toker Live");
  const [busy, setBusy] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [remoteUid, setRemoteUid] = useState(null);
  const [joined, setJoined] = useState(false);
  const [liveError, setLiveError] = useState("");
  const engineRef = useRef(null);
  const joiningRef = useRef(false);

  useEffect(() => {
    load();
    return () => { leaveAgora(); };
  }, []);

  async function load() {
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Log in to use live streams and gifts.");
      setUserId(auth.user.id);
      const results = await Promise.all([
        supabase.from("creator_coin_wallets").select("balance").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("gift_catalog").select("id,gift_name,gift_emoji,coin_value").eq("active", true).order("coin_value"),
        supabase.from("livestreams").select("id,host_id,title,status,viewer_count").eq("status", "live").order("created_at", { ascending: false }).limit(30),
        supabase.from("livestreams").select("id,host_id,title,status,created_at").eq("host_id", auth.user.id).eq("status", "scheduled").order("created_at", { ascending: false }).limit(20)
      ]);
      for (const result of results) if (result.error) throw result.error;
      setWallet(results[0].data?.balance || 0);
      setCatalog(results[1].data || []);
      setLives(results[2].data || []);
      setScheduled(results[3].data || []);
      if (!selectedGift && results[1].data?.length) setSelectedGift(results[1].data[0].id);
    } catch (e) { Alert.alert("Live and gifts", e.message || "Could not load data."); }
    finally { setBusy(false); }
  }

  async function requestCameraAndMic() {
    if (Platform.OS !== "android") return true;
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    ]);
    return result[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function joinAgora(roomId, isHost) {
    if (joiningRef.current) return;
    joiningRef.current = true;
    setBusy(true);
    setLiveError("");
    try {
      if (isHost && !(await requestCameraAndMic())) {
        throw new Error("Allow camera and microphone access to start a live video.");
      }
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("agora-token", {
        body: { livestreamId: roomId }
      });
      if (tokenError) throw tokenError;
      if (!tokenData?.token || !tokenData?.channelName || !tokenData?.uid) {
        throw new Error(tokenData?.error || "The live token service returned incomplete details.");
      }

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;
      engine.initialize({ appId: AGORA_APP_ID, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
      engine.registerEventHandler({
        onJoinChannelSuccess: () => { setJoined(true); setBusy(false); },
        onUserJoined: (_connection, uid) => setRemoteUid(uid),
        onUserOffline: (_connection, uid) => setRemoteUid(current => current === uid ? null : current),
        onError: (code, message) => { setLiveError("Agora error " + code + ": " + (message || "Connection problem")); }
      });
      engine.enableAudio();
      if (isHost) {
        engine.enableVideo();
        engine.startPreview();
      }
      engine.setClientRole(isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience);
      await engine.joinChannel(tokenData.token, tokenData.channelName, tokenData.uid, {
        clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        publishCameraTrack: !!isHost,
        publishMicrophoneTrack: !!isHost,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true
      });
      setActiveRoom({ id: roomId, isHost });
    } catch (e) {
      setBusy(false);
      setLiveError(e.message || "Could not join the live stream.");
      await leaveAgora();
      Alert.alert("Live connection failed", e.message || "Check your internet connection and try again.");
    } finally {
      joiningRef.current = false;
    }
  }

  async function leaveAgora() {
    const engine = engineRef.current;
    engineRef.current = null;
    setJoined(false);
    setRemoteUid(null);
    setActiveRoom(null);
    if (engine) {
      try { await engine.leaveChannel(); } catch (_) {}
      try { engine.unregisterEventHandler(); } catch (_) {}
      try { engine.release(); } catch (_) {}
    }
  }

  async function createRoom() {
    if (!userId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("livestreams")
        .insert({ host_id: userId, title: title.trim() || "Live Stream", status: "scheduled" })
        .select("id").single();
      if (error) throw error;
      await load();
      await startRoom(data.id);
    } catch (e) { Alert.alert("Could not create live room", e.message || "Try again."); }
    finally { setBusy(false); }
  }

  async function startRoom(roomId) {
    if (!userId) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("livestreams")
        .update({ status: "live", started_at: now, host_started_at: now })
        .eq("id", roomId).eq("host_id", userId).eq("status", "scheduled");
      if (error) throw error;
      await joinAgora(roomId, true);
      await load();
    } catch (e) { setBusy(false); Alert.alert("Could not start live", e.message || "Try again."); }
  }

  async function watchRoom(room) {
    await joinAgora(room.id, false);
  }

  async function endRoom(id) {
    setBusy(true);
    try {
      await leaveAgora();
      const { error } = await supabase.from("livestreams")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", id).eq("host_id", userId);
      if (error) throw error;
      await load();
    } catch (e) { Alert.alert("Could not end room", e.message || "Try again."); }
    finally { setBusy(false); }
  }

  async function sendGift(receiverId, liveId) {
    if (!selectedGift) return Alert.alert("Choose a gift", "Select a gift first.");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("send_stream_gift", {
        p_receiver_id: receiverId, p_gift_id: selectedGift, p_livestream_id: liveId, p_quantity: 1
      });
      if (error) throw error;
      Alert.alert("Gift sent", (data.gift_emoji || "🎁") + " " + data.gift_name + " · " + data.total_coins + " coins");
      await load();
    } catch (e) { Alert.alert("Gift not sent", e.message || "Check your coin balance."); }
    finally { setBusy(false); }
  }

  if (activeRoom) {
    return <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity onPress={() => activeRoom.isHost ? endRoom(activeRoom.id) : leaveAgora()}>
          <Ionicons name="close" size={26} color={C.white} />
        </TouchableOpacity>
        <Text style={s.heading}>{activeRoom.isHost ? "You're Live" : "Watching Live"}</Text>
        <View style={s.liveBadge}><Text style={s.buttonText}>LIVE</Text></View>
      </View>
      <View style={s.videoStage}>
        {activeRoom.isHost ? <RtcSurfaceView style={s.video} canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }} /> :
          remoteUid !== null ? <RtcSurfaceView style={s.video} canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }} /> :
          <Text style={s.muted}>Waiting for the creator's video...</Text>}
        {!activeRoom.isHost && <Text style={s.viewerNote}>You're watching as an audience member. Your camera and microphone are off.</Text>}
      </View>
      <Text style={s.status}>{joined ? "Connected to live stream" : "Connecting to live stream..."}</Text>
      {!!liveError && <Text style={s.error}>{liveError}</Text>}
      <TouchableOpacity style={s.button} onPress={() => activeRoom.isHost ? endRoom(activeRoom.id) : leaveAgora()}>
        <Text style={s.buttonText}>{activeRoom.isHost ? "End Live" : "Leave Live"}</Text>
      </TouchableOpacity>
    </View>;
  }

  return <View style={s.screen}>
    <View style={s.top}><TouchableOpacity onPress={() => navigation.navigate("Home")}><Ionicons name="arrow-back" size={24} color={C.white} /></TouchableOpacity><Text style={s.heading}>Live and Gifts</Text><TouchableOpacity onPress={load}><Ionicons name="refresh" size={22} color={C.white} /></TouchableOpacity></View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <View style={s.card}><Text style={s.heading}>Coin wallet</Text><Text style={s.balance}>🪙 {wallet} coins</Text><Text style={s.muted}>Coin purchases are disabled until a verified payment provider is connected.</Text></View>
      <View style={[s.card, { marginTop: 14 }]}><Text style={s.heading}>Start a live video</Text><TextInput value={title} onChangeText={setTitle} placeholder="Live title" placeholderTextColor={C.muted} style={s.input} maxLength={100} /><TouchableOpacity style={s.button} onPress={createRoom} disabled={busy}><Text style={s.buttonText}>{busy ? "Please wait..." : "Go Live with Camera"}</Text></TouchableOpacity><Text style={s.muted}>Camera and microphone permission will be requested when you start.</Text></View>
      <Text style={s.heading}>Gift catalogue</Text><View style={s.grid}>{catalog.map(g => <TouchableOpacity key={g.id} onPress={() => setSelectedGift(g.id)} style={[s.gift, selectedGift === g.id && s.selected]}><Text style={{ fontSize: 28 }}>{g.gift_emoji || "🎁"}</Text><Text style={s.text}>{g.gift_name}</Text><Text style={s.muted}>{g.coin_value} coins</Text></TouchableOpacity>)}</View>
      <Text style={s.heading}>My scheduled rooms</Text>{scheduled.length ? scheduled.map(room => <View key={room.id} style={s.row}><View style={{ flex: 1 }}><Text style={s.text}>{room.title}</Text><Text style={s.muted}>Ready to start</Text></View><TouchableOpacity style={s.smallButton} onPress={() => startRoom(room.id)} disabled={busy}><Text style={s.buttonText}>Go Live</Text></TouchableOpacity></View>) : <Text style={s.muted}>No scheduled rooms.</Text>}
      <Text style={s.heading}>Live rooms</Text>{lives.length ? lives.map(live => <View key={live.id} style={s.row}><View style={{ flex: 1 }}><Text style={s.text}>{live.title}</Text><Text style={s.muted}>{live.viewer_count || 0} viewers</Text></View>{live.host_id === userId ? <TouchableOpacity style={s.smallButton} onPress={() => endRoom(live.id)} disabled={busy}><Text style={s.buttonText}>End</Text></TouchableOpacity> : <><TouchableOpacity style={s.smallButton} onPress={() => watchRoom(live)} disabled={busy}><Text style={s.buttonText}>Watch</Text></TouchableOpacity><TouchableOpacity style={s.smallButton} onPress={() => sendGift(live.host_id, live.id)} disabled={busy || wallet < (catalog.find(g => g.id === selectedGift)?.coin_value || 1)}><Text style={s.buttonText}>Gift</Text></TouchableOpacity></>}</View>) : <Text style={s.muted}>No live rooms at the moment.</Text>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
 screen: { flex: 1, backgroundColor: C.bg }, top: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
 heading: { color: C.white, fontSize: 20, fontWeight: "800", marginTop: 16, marginBottom: 10 }, card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 14 }, balance: { color: C.white, fontSize: 24, fontWeight: "800", marginBottom: 8 },
 muted: { color: C.muted, fontSize: 13, marginTop: 5 }, text: { color: C.white, fontSize: 15, marginTop: 5 }, input: { color: C.white, backgroundColor: "#101016", borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
 button: { backgroundColor: C.pink, borderRadius: 10, padding: 12, alignItems: "center", marginVertical: 5 }, buttonText: { color: C.white, fontWeight: "800" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
 gift: { width: "47%", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, alignItems: "center", padding: 12 }, selected: { borderColor: C.pink, borderWidth: 2 },
 row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }, smallButton: { backgroundColor: C.pink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
 videoStage: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }, video: { width: "100%", height: "100%" }, status: { color: C.white, textAlign: "center", padding: 10 }, error: { color: "#ff6b6b", textAlign: "center", padding: 8 }, liveBadge: { backgroundColor: C.pink, borderRadius: 6, padding: 7 }, viewerNote: { color: C.white, position: "absolute", bottom: 14, backgroundColor: "#0009", padding: 8 }
});
