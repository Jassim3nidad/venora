"use client";

import { useState, useTransition } from "react";
import { toggleHelpfulVoteAction } from "../application/actions";

export function useHelpfulVote(reviewId: string, initialCount: number) {
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    const previousVoted = voted;
    const previousCount = count;

    // Optimistic update, corrected/rolled back once the server responds.
    setVoted(!previousVoted);
    setCount(previousVoted ? previousCount - 1 : previousCount + 1);

    startTransition(async () => {
      const result = await toggleHelpfulVoteAction({ reviewId });
      if (result.error) {
        setVoted(previousVoted);
        setCount(previousCount);
        setError(result.error.message);
        return;
      }
      setVoted(result.data.voted);
      setCount(result.data.helpfulCount);
    });
  }

  return { voted, count, toggle, isPending, error };
}
