import { useCallback, useState } from "react";

import { markFeedPostDeleted } from "./useFeed";

const DELETE_POST_METHOD = "delete_post";

export interface UseDeletePostReturn {
  deleting: boolean;
  error: string | null;
  deletePost: (postId: string | number, author: string) => Promise<void>;
  reset: () => void;
}

async function submitDeletePost(author: string, postId: string | number): Promise<void> {
  if (!author) {
    throw new Error("Connect your wallet before deleting this post.");
  }

  if (!postId) {
    throw new Error("Post ID is required.");
  }

  // Replace this mock submitter with wallet signing/broadcast once the mobile
  // Soroban transaction path is available. The contract method is delete_post.
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  const deletePostCall = { method: DELETE_POST_METHOD, author, postId: Number(postId) };
  void deletePostCall;
}

export function useDeletePost(): UseDeletePostReturn {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePost = useCallback(async (postId: string | number, author: string) => {
    setDeleting(true);
    setError(null);

    try {
      await submitDeletePost(author, postId);
      markFeedPostDeleted(postId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete post.";
      setError(message);
      throw new Error(message);
    } finally {
      setDeleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDeleting(false);
    setError(null);
  }, []);

  return { deleting, error, deletePost, reset };
}
