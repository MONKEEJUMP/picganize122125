import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "./constants/colors";
import { fontSizes, fontWeights } from "./constants/typography";
import { useItems } from "./providers/ItemsProvider";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const nowDate = new Date(now);
  const tsDate = new Date(timestamp);
  const isToday = nowDate.toDateString() === tsDate.toDateString();
  if (isToday) return "today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === tsDate.toDateString()) return "yesterday";

  if (days < 7) return days === 1 ? "1 day ago" : days + " days ago";
  if (weeks < 5) return weeks === 1 ? "1 week ago" : weeks + " weeks ago";
  if (months < 24) return months === 1 ? "1 month ago" : months + " months ago";
  return years === 1 ? "1 year ago" : years + " years ago";
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItemById } = useItems();

  const item = useMemo(() => (id ? getItemById(id) : undefined), [getItemById, id]);

  if (!item) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>back</Text>
        </Pressable>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>item not found</Text>
        </View>
      </View>
    );
  }

  const photoUri = item.photoUri;
  const locationText = item.location ?? "";

  return (
    <View style={styles.container}>
      <ScrollView bounces={false}>
        <View style={styles.photoWrap}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photo}
              contentFit="cover"
              transition={0}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>no photo</Text>
            </View>
          )}
          <View style={styles.headerOverlay}>
            <Pressable
              style={styles.headerPill}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.headerPillText}>back</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{item.name}</Text>
          
          {locationText ? (
            <Text style={styles.location}>{locationText}</Text>
          ) : null}

          {item.createdAt ? (
            <Text style={styles.timeText}>
              added {formatRelativeTime(item.createdAt)}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.actionPill,
              pressed && { opacity: 0.65 },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back to library"
          >
            <Text style={styles.actionPillText}>back to library</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  backButton: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backText: {
    fontSize: fontSizes.md,
    color: Colors.background,
    textTransform: "lowercase",
  },
  notFoundWrap: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  notFoundTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: Colors.background,
    textTransform: "lowercase",
  },
  photoWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: Colors.secondary,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
  },
  photoPlaceholderText: {
    color: Colors.background,
    fontSize: fontSizes.md,
    opacity: 0.5,
    textTransform: "lowercase",
  },
  headerOverlay: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  headerPill: {
    backgroundColor: Colors.secondary,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: Colors.background,
    minHeight: 44,
    justifyContent: "center",
  },
  headerPillText: {
    color: Colors.background,
    fontSize: fontSizes.sm,
    textTransform: "lowercase",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  name: {
    fontSize: 32,
    fontWeight: fontWeights.bold,
    color: Colors.background,
    letterSpacing: -0.6,
    marginBottom: 8,
    textTransform: "lowercase",
  },
  location: {
    fontSize: fontSizes.md,
    color: Colors.background,
    marginBottom: 10,
    textTransform: "lowercase",
  },
  timeText: {
    fontSize: fontSizes.sm,
    color: Colors.background,
    marginBottom: 16,
    textTransform: "lowercase",
    opacity: 0.7,
  },
  actionPill: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    marginTop: 8,
  },
  actionPillText: {
    fontSize: fontSizes.sm,
    color: Colors.background,
    textTransform: "lowercase",
  },
});
