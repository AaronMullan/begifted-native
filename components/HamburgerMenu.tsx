import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import Auth from "./Auth";

export default function HamburgerMenu() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Close auth modal when user successfully signs in
      if (session && authModalVisible) {
        setAuthModalVisible(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [authModalVisible]);

  const handleMenuToggle = () => {
    setMenuVisible(!menuVisible);
  };

  const handleSignIn = () => {
    setMenuVisible(false);
    setAuthModalVisible(true);
  };

  const handleSignOut = async () => {
    setMenuVisible(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={handleMenuToggle}
        accessibilityRole="button"
        accessibilityLabel="Navigation menu"
      >
        <Image
          source={require("../assets/images/hamburger.png")}
          style={{ width: 32, height: 32 }}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {menuVisible && (
        <>
          {/* Backdrop overlay - no cursor pointer */}
          <Pressable style={styles.backdrop} onPress={handleMenuToggle} />

          {/* Dropdown menu */}
          <View style={styles.menuContainer}>
            <Link href="/" asChild onPress={handleMenuToggle}>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Home</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/contacts" asChild onPress={handleMenuToggle}>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Contacts</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/faq" asChild onPress={handleMenuToggle}>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>FAQ</Text>
              </TouchableOpacity>
            </Link>

            {/* Conditional Sign In / Sign Out */}
            {session && session.user ? (
              <TouchableOpacity
                style={[styles.menuItem, styles.authItem, styles.signOutItem]}
                onPress={handleSignOut}
              >
                <Text style={[styles.menuText, styles.signOutText]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.menuItem, styles.authItem]}
                onPress={handleSignIn}
              >
                <Text style={[styles.menuText, styles.signInText]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Auth Modal */}
      <Modal
        visible={authModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ padding: 20 }}>
            <TouchableOpacity
              style={{ alignSelf: "flex-end", marginBottom: 20 }}
              onPress={() => setAuthModalVisible(false)}
            >
              <Text style={{ fontSize: 18, color: "#007AFF" }}>Close</Text>
            </TouchableOpacity>
            <Auth />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
  },
  hamburgerButton: {
    cursor: "pointer",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: -10000,
    right: -10000,
    bottom: -10000,
    backgroundColor: "transparent",
    zIndex: 999,
    cursor: "auto",
  },
  menuContainer: {
    position: "absolute",
    top: 45,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  menuItem: {
    padding: 16,
    cursor: "pointer",
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  authItem: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  signOutItem: {
    backgroundColor: "#FF3B30",
  },
  signInText: {
    color: "white",
    fontWeight: "bold",
  },
  signOutText: {
    color: "white",
    fontWeight: "bold",
  },
});
