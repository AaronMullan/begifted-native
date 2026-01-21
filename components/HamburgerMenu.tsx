import {
  View,
  Image,
  Modal,
  StyleSheet,
  Pressable,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
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
          style={styles.hamburgerIcon}
          resizeMode="contain"
          tintColor="#FFFFFF"
        />
      </TouchableOpacity>

      {menuVisible && (
        <>
          {/* Backdrop overlay - no cursor pointer */}
          <Pressable style={styles.backdrop} onPress={handleMenuToggle} />

          {/* Dropdown menu */}
          <View style={styles.menuContainer}>
            <Link href="/" asChild>
              <Button
                mode="text"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textColor="#333"
              >
                Home
              </Button>
            </Link>
            <Link href="/contacts" asChild>
              <Button
                mode="text"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textColor="#333"
              >
                Contacts
              </Button>
            </Link>
            <Link href="/calendar" asChild>
              <Button
                mode="text"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textColor="#333"
              >
                Calendar
              </Button>
            </Link>
            <Link href="/faq" asChild>
              <Button
                mode="text"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textColor="#333"
              >
                FAQ
              </Button>
            </Link>
            <Link href="/settings" asChild>
              <Button
                mode="text"
                onPress={handleMenuToggle}
                style={styles.menuItem}
                textColor="#333"
              >
                Settings
              </Button>
            </Link>

            {/* Conditional Sign In / Sign Out */}
            {session && session.user ? (
              <Button
                mode="contained"
                buttonColor="#000000"
                onPress={handleSignOut}
                style={styles.authItem}
              >
                Sign Out
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleSignIn}
                style={styles.authItem}
              >
                Sign In
              </Button>
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
            <IconButton
              icon="close"
              size={24}
              onPress={() => setAuthModalVisible(false)}
              style={{ alignSelf: "flex-end", marginBottom: 20 }}
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
    padding: 8,
  },
  hamburgerIcon: {
    width: 32,
    height: 32,
    tintColor: "#FFFFFF", // White for black header background
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
    margin: 0,
    justifyContent: "flex-start",
  },
  authItem: {
    marginTop: 8,
    marginHorizontal: 8,
  },
});
