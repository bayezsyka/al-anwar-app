// app/article/[slug].tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHtml from "react-native-render-html";
import { Article, getArticleDetail } from "../../lib/api";

const PRIMARY_GREEN = "#008362";

export default function ArticleDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentWidth = width - 32;

  const load = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);

      const res = await getArticleDetail(String(slug));
      setArticle(res.data);
    } catch (e: any) {
      console.log("Error getArticleDetail:", e?.message);
      setError(e?.message || "Gagal memuat artikel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header custom */}
      <View style={styles.topBar}>
        <Text
          style={styles.backTouchable}
          onPress={() => router.back()}
          suppressHighlighting
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Text>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.screenTitle}>Artikel</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && !article ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8 }}>Memuat artikel...</Text>
          </View>
        ) : null}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {article && (
          <View>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.meta}>
              {article.category?.name ?? "Artikel"} • {article.date ?? "-"} •{" "}
              {article.views ?? 0}x dibaca
            </Text>

            {article.image_url ? (
              <Image
                source={{ uri: article.image_url }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : null}

            <View style={{ marginTop: 16 }}>
              <RenderHtml
                source={{ html: article.content || "" }}
                contentWidth={contentWidth}
                tagsStyles={{
                  p: {
                    fontSize: 14,
                    lineHeight: 22,
                    color: "#111827",
                    marginBottom: 10,
                  },
                  strong: {
                    fontWeight: "700",
                    color: "#111827",
                  },
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backTouchable: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
});
