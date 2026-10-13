import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const C = { bg: "#08080c", card: "#17171f", border: "#33333d", pink: "#ff2d55", white: "#fff", muted: "#aaa" };
export default function LiveGiftsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [lives, setLives] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [title, setTitle] = useState("My Stream Toker Live");
  const [busy, setBusy] = useState(false);
  useEffect(() => { load(); }, []);
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
        supabase.from("livestreams").select("id,host_id,title,status,viewer_count").eq("status", "live").order("created_at", { ascending: false }).limit(30)
      ]);
      for (const result of results) if (result.error) throw result.error;
      setWallet(results[0].data?.balance || 0);
      setCatalog(results[1].data || []);
      setLives(results[2].data || []);
      if (!selectedGift && results[1].data?.length) setSelectedGift(results[1].data[0].id);
    } catch (e) { Alert.alert("Live and gifts", e.message || "Could not load data."); }
    finally { setBusy(false); }
  }
  async function createRoom() {
    if (!userId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("livestreams").insert({ host_id: userId, title: title.trim() || "Live Stream", status: "scheduled" });
      if (error) throw error;
      Alert.alert("Room created", "The room is saved. Camera and audio broadcasting still require a streaming provider connection.");
      await load();
    } catch (e) { Alert.alert("Could not create room", e.message || "Try again."); }
    finally { setBusy(false); }
  }
  async function markLive() {
    if (!userId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("livestreams").update({ status: "live", started_at: new Date().toISOString(), host_started_at: new Date().toISOString() }).eq("host_id", userId).eq("status", "scheduled");
      if (error) throw error;
      Alert.alert("Room status updated", "The room is marked live, but it is not broadcasting video yet.");
      await load();
    } catch (e) { Alert.alert("Could not update room", e.message || "Try again."); }
    finally { setBusy(false); }
  }
  async function endRoom(id) {
    setBusy(true);
    try {
      const { error } = await supabase.from("livestreams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id).eq("host_id", userId);
      if (error) throw error;
      await load();
    } catch (e) { Alert.alert("Could not end room", e.message || "Try again."); }
    finally { setBusy(false); }
  }
  async function sendGift(receiverId, liveId) {
    if (!selectedGift) return Alert.alert("Choose a gift", "Select a gift first.");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("send_stream_gift", { p_receiver_id: receiverId, p_gift_id: selectedGift, p_livestream_id: liveId, p_quantity: 1 });
      if (error) throw error;
      Alert.alert("Gift sent", (data.gift_emoji || "🎁") + " " + data.gift_name + " · " + data.total_coins + " coins");
      await load();
    } catch (e) { Alert.alert("Gift not sent", e.message || "Check your coin balance."); }
    finally { setBusy(false); }
  }
  return <View style={s.screen}>
    <View style={s.top}><TouchableOpacity onPress={() => navigation.navigate("Home")}><Ionicons name="arrow-back" size={24} color={C.white} /></TouchableOpacity><Text style={s.heading}>Live and Gifts</Text><TouchableOpacity onPress={load}><Ionicons name="refresh" size={22} color={C.white} /></TouchableOpacity></View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <View style={s.card}><Text style={s.heading}>Coin wallet</Text><Text style={s.balance}>🪙 {wallet} coins</Text><Text style={s.muted}>Coin purchases are disabled until a verified payment provider is connected.</Text></View>
      <View style={[s.card, { marginTop: 14 }]}><Text style={s.heading}>Start a room</Text><TextInput value={title} onChangeText={setTitle} placeholder="Live title" placeholderTextColor={C.muted} style={s.input} maxLength={100} /><TouchableOpacity style={s.button} onPress={createRoom} disabled={busy}><Text style={s.buttonText}>Create room</Text></TouchableOpacity><TouchableOpacity style={s.button} onPress={markLive} disabled={busy}><Text style={s.buttonText}>Mark my scheduled room live</Text></TouchableOpacity><Text style={s.muted}>Live room records work; real camera and audio broadcasting are not connected yet.</Text></View>
      <Text style={s.heading}>Gift catalogue</Text><View style={s.grid}>{catalog.map(g => <TouchableOpacity key={g.id} onPress={() => setSelectedGift(g.id)} style={[s.gift, selectedGift === g.id && s.selected]}><Text style={{ fontSize: 28 }}>{g.gift_emoji || "🎁"}</Text><Text style={s.text}>{g.gift_name}</Text><Text style={s.muted}>{g.coin_value} coins</Text></TouchableOpacity>)}</View>
      <Text style={s.heading}>Live rooms</Text>{lives.length ? lives.map(live => <View key={live.id} style={s.row}><View style={{ flex: 1 }}><Text style={s.text}>{live.title}</Text><Text style={s.muted}>{live.viewer_count || 0} viewers</Text></View>{live.host_id === userId ? <TouchableOpacity style={s.smallButton} onPress={() => endRoom(live.id)} disabled={busy}><Text style={s.buttonText}>End</Text></TouchableOpacity> : <TouchableOpacity style={s.smallButton} onPress={() => sendGift(live.host_id, live.id)} disabled={busy || wallet < (catalog.find(g => g.id === selectedGift)?.coin_value || 1)}><Text style={s.buttonText}>Gift</Text></TouchableOpacity>}</View>) : <Text style={s.muted}>No live rooms at the moment.</Text>}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
 screen: { flex: 1, backgroundColor: C.bg }, top: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
 heading: { color: C.white, fontSize: 20, fontWeight: "800", marginTop: 16, marginBottom: 10 }, card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 14 }, balance: { color: C.white, fontSize: 24, fontWeight: "800", marginBottom: 8 },
 muted: { color: C.muted, fontSize: 13, marginTop: 5 }, text: { color: C.white, fontSize: 15, marginTop: 5 }, input: { color: C.white, backgroundColor: "#101016", borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
 button: { backgroundColor: C.pink, borderRadius: 10, padding: 12, alignItems: "center", marginVertical: 5 }, buttonText: { color: C.white, fontWeight: "800" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
 gift: { width: "47%", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, alignItems: "center", padding: 12 }, selected: { borderColor: C.pink, borderWidth: 2 },
 row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }, smallButton: { backgroundColor: C.pink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }
});
