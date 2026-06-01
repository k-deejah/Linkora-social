import React, { useMemo } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useToast } from "../../context/ToastContext";
import { getFeedPostById } from "../../hooks/useFeed";
import { useDeletePost } from "../../hooks/useDeletePost";
import { useWallet } from "../../hooks/useWallet";
import { useTheme } from "../../theme/useTheme";

type PostParams = {
  id: string;
};

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<PostParams>();
  const router = useRouter();
  const { address } = useWallet();
  const { deletePost, deleting } = useDeletePost();
  const { showToast, showError } = useToast();
  const post = useMemo(() => (id ? getFeedPostById(String(id)) : null), [id]);
  const isAuthor = Boolean(post?.author && address && post.author === address);

  const handleDelete = () => {
    if (!post) return;

    Alert.alert("Delete post?", "This will remove the post from your feed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.id, post.author);
            showToast({
              kind: "success",
              title: "Post deleted",
              message: "Your post was removed from the feed.",
            });
            router.replace("/(tabs)/feed" as Parameters<typeof router.replace>[0]);
          } catch (err) {
            showError(err instanceof Error ? err.message : "Failed to delete post.");
          }
        },
      },
    ]);
  };

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.label}>Post</Text>
          <Text style={styles.id}>#{id}</Text>
          <Text style={styles.placeholder}>Post not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Post</Text>
        <Text style={styles.id}>#{post.id}</Text>
        <Text style={styles.author}>{post.username}</Text>
        <Text style={styles.address}>{post.author}</Text>
        <Text style={styles.contentText}>{post.content}</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>♥ {post.like_count}</Text>
          <Text style={styles.stat}>◎ {post.tip_total}</Text>
        </View>
        {isAuthor ? (
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete post"
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.text.onBrand} />
            ) : (
              <Text style={styles.deleteButtonText}>Delete post</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface.background,
    },
    content: {
      padding: 24,
    },
    label: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    id: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text.primary,
      marginBottom: 16,
      fontFamily: "monospace",
    },
    placeholder: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    author: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    address: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      fontFamily: "monospace",
      marginBottom: 20,
    },
    contentText: {
      fontSize: 16,
      color: theme.colors.text.primary,
      lineHeight: 24,
      marginBottom: 20,
    },
    stats: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 28,
    },
    stat: {
      color: theme.colors.text.secondary,
      fontSize: 13,
    },
    deleteButton: {
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: "#dc2626",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    deleteButtonDisabled: {
      opacity: 0.65,
    },
    deleteButtonText: {
      color: theme.colors.text.onBrand,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
