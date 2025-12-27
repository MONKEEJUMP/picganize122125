import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import Colors from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import * as Haptics from "expo-haptics";

import { loadCelebrateFoundSetting } from "@/lib/storage";
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
  const { getItemById, replaceItem } = useItems();

  const item = useMemo(() => (id ? getItemById(id) : undefined), [getItemById, id]);

  const [celebrateFoundEnabled, setCelebrateFoundEnabled] = useState<boolean>(false);

  useEffect(() => {
    let didCancel = false;

    const run = async () => {
      console.log("[ItemDetail] hydrate celebrateFound start", { id });
      const enabled = await loadCelebrateFoundSetting();
      if (didCancel) return;
      console.log("[ItemDetail] hydrate celebrateFound done", { id, enabled });
      setCelebrateFoundEnabled(enabled);
    };

    run();

    return () => {
      didCancel = true;
    };
  }, [id]);

  const scale = useSharedValue<number>(1);
  const savedScale = useSharedValue<number>(1);
  const translateX = useSharedValue<number>(0);
  const translateY = useSharedValue<number>(0);
  const savedTranslateX = useSharedValue<number>(0);
  const savedTranslateY = useSharedValue<number>(0);

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
        console.log("[ItemDetail] pinch start", {
          scale: scale.value,
          translateX: translateX.value,
          translateY: translateY.value,
        });
      })
      .onUpdate((e) => {
        const nextScale = Math.min(3, Math.max(1, savedScale.value * e.scale));
        scale.value = nextScale;
      })
      .onEnd(() => {
        console.log("[ItemDetail] pinch end", {
          scale: scale.value,
          translateX: translateX.value,
          translateY: translateY.value,
        });
        if (scale.value < 1) {
          scale.value = withTiming(1, { duration: 160 });
          translateX.value = withTiming(0, { duration: 160 });
          translateY.value = withTiming(0, { duration: 160 });
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }
      });
  }, [savedScale, scale, savedTranslateX, savedTranslateY, translateX, translateY]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        if (scale.value <= 1) return;
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      })
      .onEnd(() => {
        if (scale.value <= 1) {
          translateX.value = withTiming(0, { duration: 140 });
          translateY.value = withTiming(0, { duration: 140 });
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        } else {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }
      });
  }, [savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const tapToResetGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDuration(220)
      .maxDistance(10)
      .onEnd(() => {
        const shouldReset =
          scale.value > 1.001 ||
          Math.abs(translateX.value) > 0.5 ||
          Math.abs(translateY.value) > 0.5;

        if (!shouldReset) return;

        console.log("[ItemDetail] tap reset", {
          scale: scale.value,
          translateX: translateX.value,
          translateY: translateY.value,
        });

        scale.value = withTiming(1, { duration: 190 });
        translateX.value = withTiming(0, { duration: 190 });
        translateY.value = withTiming(0, { duration: 190 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      });
  }, [savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const combinedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture, tapToResetGesture),
    [panGesture, pinchGesture, tapToResetGesture],
  );

  const photoAnimatedStyle = useAnimatedStyle(() => {
    const effectiveScale = Math.max(1, scale.value);
    return {
      transform: [
        { translateX: effectiveScale > 1 ? translateX.value : 0 },
        { translateY: effectiveScale > 1 ? translateY.value : 0 },
        { scale: effectiveScale },
      ],
    };
  }, []);

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]} testID="item-detail-not-found">
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="back"
          testID="item-detail-back"
        >
          <Text style={[styles.backText, { color: theme.text }]}>back</Text>
        </Pressable>
        <View style={styles.notFoundWrap}>
          <Text style={[styles.notFoundTitle, { color: theme.text }]}>item not found</Text>
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
          {photoUri ? (
            <GestureDetector gesture={combinedGesture}>
              <Animated.View style={[styles.photo, photoAnimatedStyle]} testID="item-detail-photo-zoom-wrap">
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" transition={0} />
              </Animated.View>
            </GestureDetector>
          ) : null}
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

          <View style={styles.actionsRow} testID="item-detail-actions">
            {celebrateFoundEnabled ? (
              <Pressable
                style={({ pressed }) => [
                  styles.updateLocationButton,
                  { borderColor: theme.text },
                  pressed && { opacity: 0.65 },
                ]}
                onPress={async () => {
                  const nextCount = (item.foundCount ?? 0) + 1;
                  console.log("[ItemDetail] found it press", { id: item.id, nextCount });

                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {
                    console.log("[ItemDetail] found it haptic error", e);
                  }

                  try {
                    await replaceItem({ ...item, foundCount: nextCount });
                    console.log("[ItemDetail] foundCount saved", { id: item.id, nextCount });
                  } catch (e) {
                    console.log("[ItemDetail] foundCount save error", e);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="found it"
                testID="item-detail-found-it"
              >
                <Text style={[styles.updateLocationText, { color: theme.text }]}>found it · {item.foundCount ?? 0}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.updateLocationButton,
                { borderColor: theme.text },
                pressed && { opacity: 0.65 },
              ]}
              onPress={() => {
                router.push(
                  {
                    pathname: "/(tabs)/camera",
                    params: { updateItemId: item.id },
                  } as unknown as Href,
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="update location"
              testID="item-detail-update-location"
            >
              <Text style={[styles.updateLocationText, { color: theme.text }]}>update location</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.updateLocationButton,
                { borderColor: theme.text },
                pressed && { opacity: 0.65 },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="back"
              testID="item-detail-back"
            >
              <Text style={[styles.updateLocationText, { color: theme.text }]}>back</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    height: Dimensions.get("window").height * 0.45,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    color: Colors.white,
    letterSpacing: -0.6,
    marginBottom: 4,
    textTransform: "lowercase",
    textAlign: "center",
  },
  location: {
    fontSize: fontSizes.sm,
    color: Colors.white,
    marginBottom: 6,
    textTransform: "lowercase",
    textAlign: "center",
  },
  timeEcho: {
    fontSize: 12,
    color: Colors.white,
    marginBottom: 4,
    textTransform: "lowercase",
    opacity: 0.6,
    textAlign: "center",
  },
  updateLocationButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  updateLocationText: {
    fontSize: 14,
    textTransform: "lowercase",
  },
});
