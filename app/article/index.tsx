// app/article/index.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Article, PaginatedMeta, getArticles } from "../../lib/api";

const PRIMARY_GREEN = "#008362";

export default function ArticleListScreen() {
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadArticles = async (p: number = 1, opts?: { refresh?: boolean }) => {
    try {
      if (!opts?.refresh) setLoading(true);
      setError(null);

      const res = await getArticles(p);

      if (p === 1) {
        setArticles(res.data);
      } else {
        setArticles((prev) => [...prev, ...res.data]);
      }

      setMeta(res.meta);
      setPage(res.meta.current_page);
    } catch (e: any) {
      console.log("Error getArticles:", e?.message);
      setError(e?.message || "Gagal memuat artikel.");
    } finally {
      setLoading(false);
      setInitialLoaded(true);
      if (opts?.refresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadArticles(1);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadArticles(1, { refresh: true });
  };

  const loadMore = () => {
    if (!meta) return;
    if (page < meta.last_page && !loading) {
      loadArticles(page + 1);
    }
  };

  const goToDetail = (slug: string) => {
    router.push({
      pathname: "/article/[slug]",
      params: { slug },
    });
  };

  const renderItem = ({ item }: { item: Article }) => (
    <Pressable onPress={() => goToDetail(item.slug)}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.metaText}>
              {item.category?.name ?? "Tanpa Kategori"} • {item.date ?? "-"}
            </Text>
          </View>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : null}
        </View>
        <Text numberOfLines={3} style={styles.excerpt}>
          {item.excerpt}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header custom */}
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.screenTitle}>Artikel</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!initialLoaded && loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Memuat artikel...</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text>Tidak ada artikel.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  metaText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  excerpt: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 4,
  },
});
