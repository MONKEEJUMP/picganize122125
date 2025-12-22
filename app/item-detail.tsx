import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { useItems } from "@/providers/ItemsProvider";
import { useTheme } from "@/providers/ThemeProvider";

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

  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  if (months < 24) return months === 1 ? "1 month ago" : `${months} months ago`;
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default function ItemDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItemById, markFound } = useItems();
  const [justMarkedFound, setJustMarkedFound] = useState(false);

  const item = useMemo(() => (id ? getItemById(id) : undefined), [getItemById, id]);

  if (!item) {
    return (
      <View style={styles.container} testID="item-detail-not-found">
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="back"
          testID="item-detail-back"
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
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="item-detail-screen">
      <ScrollView bounces={false}>
        <View style={[styles.photoWrap, { backgroundColor: theme.background }]}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" transition={0} /> : null}
          <View style={styles.headerOverlay}>
            <Pressable
              style={[styles.headerPill, { backgroundColor: theme.background, borderColor: theme.text }]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="back"
              testID="item-detail-back"
            >
              <Text style={[styles.headerPillText, { color: theme.text }]}>back</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, { color: theme.text }]} testID="item-detail-name">
            {item.name}
          </Text>
          {locationText ? (
            <Text style={[styles.location, { color: theme.text }]} testID="item-detail-location">
              {locationText}
            </Text>
          ) : null}

          {item.createdAt ? (
            <Text style={[styles.timeEcho, { color: theme.text }]} testID="item-detail-added">
              added {formatRelativeTime(item.createdAt)}
            </Text>
          ) : null}
          {item.foundAt ? (
            <Text style={[styles.timeEcho, { color: theme.text }]} testID="item-detail-found">
              found {formatRelativeTime(item.foundAt)}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.foundItButton,
              { borderColor: theme.text },
              pressed && { opacity: 0.65 },
            ]}
            onPress={() => {
              markFound(item.id);
              setJustMarkedFound(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="found it"
            testID="item-detail-found-it"
          >
            <Text style={[styles.foundItText, { color: theme.text }]}>
              {justMarkedFound ? "found!" : "found it"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  backButton: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backText: {
    fontSize: fontSizes.md,
    color: Colors.white,
  },
  notFoundWrap: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  notFoundTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: Colors.white,
  },
  photoWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: Colors.black,
  },
  photo: {
    width: "100%",
    height: "100%",
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
    backgroundColor: Colors.black,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: Colors.white,
    minHeight: 44,
    justifyContent: "center",
  },
  headerPillText: {
    color: Colors.white,
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
    color: Colors.white,
    letterSpacing: -0.6,
    marginBottom: 8,
    textTransform: "lowercase",
  },
  location: {
    fontSize: fontSizes.md,
    color: Colors.white,
    marginBottom: 10,
    textTransform: "lowercase",
  },
  timeEcho: {
    fontSize: fontSizes.sm,
    color: Colors.white,
    marginBottom: 6,
    textTransform: "lowercase",
    opacity: 0.7,
  },
  foundItButton: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  foundItText: {
    fontSize: fontSizes.sm,
    textTransform: "lowercase",
  },
});
