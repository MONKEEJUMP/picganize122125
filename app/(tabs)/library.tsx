import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import BrandMark from "@/components/BrandMark";
import ThemedButton from "@/components/ThemedButton";
import Colors from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import type { Item } from "@/types";
import { useItems } from "@/providers/ItemsProvider";
import { useTheme } from "@/providers/ThemeProvider";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = (SCREEN_WIDTH - 52) / 2;

type SortMode = "newest" | "oldest" | "aToZ";

const SORT_STORAGE_KEY = "picganize_sort_mode_v1";

function startOfLocalDayMs(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const FOUND_DECAY_MS = 24 * 60 * 60 * 1000;

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

function getFoundLabel(item: Item): string | null {
  if (!item.foundAt) return null;
  const elapsed = Date.now() - item.foundAt;
  if (elapsed >= FOUND_DECAY_MS) return null;
  if (elapsed < 60 * 60 * 1000) return "found recently";
  return "found today";
}

type Row = { key: string; left: Item; right?: Item };

type SectionTitle = "today" | "this week" | "earlier";

type Section = {
  title: SectionTitle;
  data: Row[];
};

type ListItem =
  | { type: "header"; key: string; title: SectionTitle }
  | { type: "row"; key: string; row: Row };

function buildRows(items: Item[]): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    if (!left) continue;
    out.push({
      key: `${left.id}_${right?.id ?? ""}`,
      left,
      right: right ?? undefined,
    });
  }
  return out;
}

function formatSortLabel(mode: SortMode): string {
  if (mode === "newest") return "newest";
  if (mode === "oldest") return "oldest";
  return "a to z";
}

function nextSortMode(mode: SortMode): SortMode {
  if (mode === "newest") return "oldest";
  if (mode === "oldest") return "aToZ";
  return "newest";
}

export default function LibraryScreen() {
  const { items, isLoading, reload } = useItems();
  const { theme } = useTheme();
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPrefsLoaded, setIsPrefsLoaded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadPrefs = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SORT_STORAGE_KEY);
      if (raw === "newest" || raw === "oldest" || raw === "aToZ") {
        setSortMode(raw);
      } else if (raw === "name") {
        setSortMode("aToZ");
      } else if (raw === "a to z") {
        setSortMode("aToZ");
      }
    } catch {
      
    } finally {
      setIsPrefsLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrefs();
    }, [loadPrefs])
  );

  const filteredItems = useMemo<Item[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const name = it.name.toLowerCase();
      const location = (it.location ?? "").toLowerCase();
      return name.includes(q) || location.includes(q);
    });
  }, [items, searchTerm]);

  const sorted = useMemo<Item[]>(() => {
    const next = [...filteredItems];
    if (sortMode === "newest") {
      next.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === "oldest") {
      next.sort((a, b) => a.createdAt - b.createdAt);
    } else {
      next.sort((a, b) => a.name.localeCompare(b.name));
    }
    return next;
  }, [filteredItems, sortMode]);

  const sections = useMemo<Section[]>(() => {
    if (sortMode === "aToZ") {
      return [{ title: "earlier", data: buildRows(sorted) }];
    }

    const now = Date.now();
    const todayStart = startOfLocalDayMs(now);
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

    const today: Item[] = [];
    const week: Item[] = [];
    const earlier: Item[] = [];

    for (const it of sorted) {
      if (it.createdAt >= todayStart) {
        today.push(it);
      } else if (it.createdAt >= weekStart) {
        week.push(it);
      } else {
        earlier.push(it);
      }
    }

    const out: Section[] = [];
    if (today.length) out.push({ title: "today", data: buildRows(today) });
    if (week.length) out.push({ title: "this week", data: buildRows(week) });
    if (earlier.length) out.push({ title: "earlier", data: buildRows(earlier) });
    return out;
  }, [sortMode, sorted]);

  const showEmptyState = items.length === 0;

  const listRef = useRef<FlatList<ListItem> | null>(null);

  const setSortPersisted = useCallback(async (mode: SortMode) => {
    setSortMode(mode);
    try {
      await AsyncStorage.setItem(SORT_STORAGE_KEY, mode);
    } catch {
      
    }
  }, []);

  const listData = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    for (const s of sections) {
      if (sortMode !== "aToZ") {
        out.push({ type: "header", key: `h_${s.title}`, title: s.title });
      }
      for (const row of s.data) {
        out.push({ type: "row", key: row.key, row });
      }
    }
    return out;
  }, [sections, sortMode]);

  if (isLoading || !isPrefsLoaded) {
    return <View style={styles.container} testID="library-screen-loading" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="library-screen">
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View style={styles.headerTopRow} testID="library-header-top-row">
          <View style={styles.brandSlot} testID="library-header-left-slot">
            <BrandMark />
          </View>

          <View style={styles.centerSpacer} testID="library-header-center-slot" />

          <View style={styles.rightSlot} testID="library-header-right-slot">
            <Pressable
              style={({ pressed }) => [
                styles.sortButton,
                { borderColor: theme.text },
                pressed && { opacity: 0.65 },
              ]}
              onPress={() => {
                const next = nextSortMode(sortMode);
                setSortPersisted(next);
                listRef.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              accessibilityRole="button"
              accessibilityLabel="sort"
              testID="library-sort"
            >
              <Text style={[styles.sortText, { color: theme.text }]}>{formatSortLabel(sortMode)}</Text>
            </Pressable>
          </View>
        </View>

      </View>

      {showEmptyState ? (
        <View style={styles.emptyState} testID="library-empty-state">
          <Text style={[styles.emptyLine, { color: theme.text }]}>you haven’t saved anything yet.</Text>
          <ThemedButton
            title="add item"
            onPress={() => router.navigate("/(tabs)/camera")}
            style={[styles.primaryButton, styles.primaryButtonEmpty]}
            textStyle={styles.primaryButtonText}
            accessibilityLabel="add item"
            testID="library-add-item-empty"
          />
        </View>
      ) : (
        <>
          <View style={styles.searchWrap} testID="library-search-wrap">
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="search"
              placeholderTextColor={theme.text}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
              selectionColor={theme.accent}
              testID="library-search"
            />
          </View>
          <FlatList
            ref={(r) => {
              listRef.current = r;
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={async () => {
                  if (items.length === 0) return;
                  setIsRefreshing(true);
                  try {
                    await reload();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                tintColor={theme.text}
                colors={[theme.text]}
              />
            }
            data={listData}
            keyExtractor={(it) => it.key}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={14}
            windowSize={10}
            maxToRenderPerBatch={12}
            removeClippedSubviews
            updateCellsBatchingPeriod={50}
            renderItem={({ item }) => {
              if (item.type === "header") {
                return (
                  <Text
                    style={[
                      styles.sectionTitle,
                      { backgroundColor: theme.text, color: theme.background, borderColor: theme.background },
                    ]}
                    testID={`library-section-${item.title}`}
                  >
                    {item.title}
                  </Text>
                );
              }
              return <ItemRow row={item.row} />;
            }}
            ListFooterComponent={<View style={{ height: 120 }} />}
            testID="library-grid"
          />

          <View style={[styles.footer, { backgroundColor: theme.background }]} testID="library-footer">
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => router.navigate("/(tabs)/camera")}
              accessibilityRole="button"
              accessibilityLabel="add item"
              testID="library-add-item"
            >
              <Text style={[styles.primaryButtonText, { color: theme.onPrimary }]}>add item</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const ItemCard = React.memo(function ItemCard({ item }: { item: Item }) {
  const photoUri = item.photoUri;
  const location = item.location ?? "";
  const foundLabel = getFoundLabel(item);

  const handlePress = useCallback(() => {
    router.push({ pathname: "/item-detail", params: { id: item.id } });
  }, [item.id]);

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`item ${item.name}`}
      testID={`library-item-${item.id}`}
    >
      <View style={styles.cardPhoto}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photo}
            contentFit="cover"
            transition={0}
            recyclingKey={item.id}
          />
        ) : null}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        {location ? (
          <Text style={styles.cardLocationText} numberOfLines={1}>
            {location}
          </Text>
        ) : null}
        <Text style={styles.cardTimeEcho} numberOfLines={1}>
          added {formatRelativeTime(item.createdAt)}
        </Text>
        {foundLabel ? (
          <Text style={styles.cardFoundLabel} numberOfLines={1}>
            {foundLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const ItemRow = React.memo(function ItemRow({ row }: { row: Row }) {
  return (
    <View style={styles.row} testID={`library-row-${row.key}`}>
      <ItemCard item={row.left} />
      {row.right ? <ItemCard item={row.right} /> : <View style={styles.cardSpacer} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 18,
    gap: 12,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    width: "100%",
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 14,
    fontSize: 14,
    textTransform: "lowercase",
  },
  brandSlot: {
    width: 168,
    height: 44,
    justifyContent: "center",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
  },
  centerSpacer: {
    flex: 1,
    height: 44,
  },
  rightSlot: {
    width: 120,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 22,
  },
  sortButton: {
    width: 104,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  sortText: {
    fontSize: 12,
    textTransform: "lowercase",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    gap: 18,
  },
  sectionTitle: {
    alignSelf: "flex-start",
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    fontSize: 12,
    color: Colors.black,
    textTransform: "lowercase",
    marginTop: 6,
    marginBottom: -6,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  cardSpacer: {
    width: ITEM_WIDTH,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.black,
  },
  cardPhoto: {
    height: 140,
    backgroundColor: Colors.black,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    padding: 12,
  },
  cardName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: Colors.black,
    textTransform: "lowercase",
  },
  cardLocationText: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.black,
    textTransform: "lowercase",
  },
  cardTimeEcho: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.black,
    textTransform: "lowercase",
    opacity: 0.5,
  },
  cardFoundLabel: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.black,
    textTransform: "lowercase",
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  emptyLine: {
    fontSize: fontSizes.md,
    textAlign: "center",
    textTransform: "lowercase",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.black,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  primaryButtonEmpty: {
    width: 240,
    maxWidth: "100%",
  },
  primaryButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    textTransform: "lowercase",
  },
});
