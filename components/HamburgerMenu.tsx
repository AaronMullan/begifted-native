import {
  View,
  Text,
  Image,
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
import { IconButton } from "./ui/IconButton";
import { TextButton } from "./ui/buttons";

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
      <IconButton
        icon={
          <Image
            source={require("../assets/images/hamburger.png")}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
        }
        onPress={handleMenuToggle}
        accessibilityLabel="Navigation menu"
        style={styles.hamburgerButton}
      />

      {menuVisible && (
        <>
          {/* Backdrop overlay - no cursor pointer */}
          <Pressable style={styles.backdrop} onPress={handleMenuToggle} />

          {/* Dropdown menu */}
          <View style={styles.menuContainer}>
            <Link href="/" asChild onPress={handleMenuToggle}>
              <TextButton
                title="Home"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textStyle={styles.menuText}
              />
            </Link>
            <Link href="/contacts" asChild onPress={handleMenuToggle}>
              <TextButton
                title="Contacts"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textStyle={styles.menuText}
              />
            </Link>
            <Link href="/faq" asChild onPress={handleMenuToggle}>
              <TextButton
                title="FAQ"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textStyle={styles.menuText}
              />
            </Link>

            {/* Conditional Sign In / Sign Out */}
            {session && session.user ? (
              <TextButton
                title="Sign Out"
                onPress={handleSignOut}
                style={[styles.menuItem, styles.authItem, styles.signOutItem]}
                textStyle={[styles.menuText, styles.signOutText]}
              />
            ) : (
              <TextButton
                title="Sign In"
                onPress={handleSignIn}
                style={[styles.menuItem, styles.authItem]}
                textStyle={[styles.menuText, styles.signInText]}
              />
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
            <TextButton
              title="Close"
              onPress={() => setAuthModalVisible(false)}
              style={{ alignSelf: "flex-end", marginBottom: 20 }}
              textStyle={{ fontSize: 18, color: "#007AFF" }}
            />
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
