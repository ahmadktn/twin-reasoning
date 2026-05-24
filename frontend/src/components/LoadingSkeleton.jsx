// src/components/LoadingSkeleton.jsx
// ─────────────────────────────────────────────────────────────────
// Loading placeholders — shown while API calls are in progress
//
// Two exports:
//   <SkeletonCard />        — a single placeholder card
//   <SkeletonGrid count />  — a full grid of placeholder cards
// ─────────────────────────────────────────────────────────────────

import {
  Box,
  Skeleton,
  SkeletonText,
  SimpleGrid,
} from "@chakra-ui/react";



// A single skeleton card — matches the shape of a real ItemCard
export function SkeletonCard() {
  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      overflow="hidden"
      bg="white"
      _dark={{ bg: "#1E1E1E" }}
    >
      {/* Image area placeholder */}
      <Skeleton height="110px" />

      <Box p={4}>
        {/* Category badge placeholder */}
        <Skeleton height="18px" width="60px" mb={3} borderRadius="full" />
        {/* Title placeholder */}
        <Skeleton height="16px" mb={2} />
        {/* Stars placeholder */}
        <Skeleton height="14px" width="100px" mb={3} />
        {/* Review text placeholder */}
        <SkeletonText noOfLines={2} spacing={2} mb={4} />
        {/* Buttons placeholder */}
        <Skeleton height="28px" width="140px" borderRadius="md" />
      </Box>
    </Box>
  );
}

// A full grid of skeleton cards — use this on the Home Feed
export function SkeletonGrid({ count = 12 }) {
  return (
    <SimpleGrid
      columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
      spacing={4}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </SimpleGrid>
  );
}