import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, StyleSheet, View, Pressable } from "react-native";
import { Text, Button } from "react-native-paper";
import { BlurView } from "expo-blur";
import { Colors } from "../../lib/colors";
import { useAuth } from "../../hooks/use-auth";
import {
  useNotifications,
  useUnreadCount,
  useNotificationMutations,
} from "../../hooks/use-notifications";
import type { AppNotification } from "../../lib/api";

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string): keyof typeof MaterialIcons.glyphMap {
  switch (type) {
    case "gift_generated":
      return "card-giftcard";
    default:
      return "notifications";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { markRead, markAllRead } = useNotificationMutations();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  function handleNotificationPress(notification: AppNotification) {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    const recipientId = notification.data?.recipientId;
    if (recipientId) {
      router.push(`/contacts/${recipientId}`);
    }
  }

  function renderNotification({ item }: { item: AppNotification }) {
    return (
      <Pressable
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
      >
        <BlurView intensity={20} style={styles.cardBlur} />
        <View
          style={[
            styles.iconContainer,
            !item.read && styles.unreadIconContainer,
          ]}
        >
          <MaterialIcons
            name={getNotificationIcon(item.type)}
            size={24}
            color={!item.read ? "#FFFFFF" : Colors.darks.black}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text
            variant="titleSmall"
            style={[styles.notificationTitle, !item.read && styles.unreadText]}
          >
            {item.title}
          </Text>
          <Text variant="bodyMedium" style={styles.notificationBody}>
            {item.body}
          </Text>
          <Text variant="bodySmall" style={styles.notificationTime}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  }

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable style={styles.mainCard}>
          <BlurView intensity={20} style={styles.blurBackground} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineMedium" style={styles.title}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Text variant="bodyMedium" style={styles.subtitle}>
                  {unreadCount} unread
                </Text>
              )}
            </View>
            {unreadCount > 0 && (
              <Button
                mode="text"
                onPress={() => markAllRead.mutate()}
                textColor={Colors.darks.black}
                compact
              >
                Mark all read
              </Button>
            )}
          </View>
        </Pressable>

        {isLoading ? (
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading...
          </Text>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="notifications-none"
              size={48}
              color={Colors.darks.black}
              style={styles.emptyIcon}
            />
            <Text variant="titleMedium" style={styles.emptyText}>
              No notifications yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              You&apos;ll be notified when gift suggestions are ready
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: Colors.neutrals.light + "30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "hidden",
    position: "relative",
    padding: 24,
    marginBottom: 16,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.7,
    marginTop: 4,
  },
  list: {
    gap: 12,
    paddingBottom: 100,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutrals.light + "30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    padding: 16,
    overflow: "hidden",
    position: "relative",
  },
  unreadCard: {
    backgroundColor: Colors.neutrals.light + "60",
  },
  cardBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutrals.dark,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    zIndex: 1,
  },
  unreadIconContainer: {
    backgroundColor: Colors.pinks.dark,
  },
  notificationContent: {
    flex: 1,
    zIndex: 1,
  },
  notificationTitle: {
    color: Colors.darks.black,
    marginBottom: 2,
  },
  unreadText: {
    fontWeight: "700",
  },
  notificationBody: {
    color: Colors.darks.black,
    opacity: 0.8,
    marginBottom: 4,
  },
  notificationTime: {
    color: Colors.darks.black,
    opacity: 0.5,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.pinks.dark,
    marginLeft: 8,
    zIndex: 1,
  },
  loadingText: {
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.8,
    padding: 40,
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
  emptyIcon: {
    opacity: 0.4,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.darks.black,
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.darks.black,
    opacity: 0.6,
    textAlign: "center",
  },
});
