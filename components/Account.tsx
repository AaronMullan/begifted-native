import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { StyleSheet, View, Alert } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { Session } from "@supabase/supabase-js";

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error("No user on the session!");

      const { data, error, status } = await supabase
        .from("profiles")
        .select(`username, website, avatar_url`)
        .eq("id", session?.user.id)
        .single();
      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username);
        setWebsite(data.website);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string;
    website: string;
    avatar_url: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error("No user on the session!");

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TextInput
          mode="outlined"
          label="Email"
          value={session?.user?.email || ""}
          editable={false}
          style={styles.input}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <TextInput
          mode="outlined"
          label="Username"
          value={username || ""}
          onChangeText={setUsername}
          placeholder="Username"
          style={styles.input}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <TextInput
          mode="outlined"
          label="Website"
          value={website || ""}
          onChangeText={setWebsite}
          placeholder="Website"
          style={styles.input}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          mode="contained"
          onPress={() =>
            updateProfile({ username, website, avatar_url: avatarUrl })
          }
          disabled={loading}
          loading={loading}
          style={styles.button}
        >
          Update
        </Button>
      </View>

      <View style={styles.verticallySpaced}>
        <Button
          mode="contained"
          buttonColor="#FF3B30"
          onPress={() => supabase.auth.signOut()}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 8,
  },
});
