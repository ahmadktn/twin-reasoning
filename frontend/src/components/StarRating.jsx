// src/components/StarRating.jsx
// ─────────────────────────────────────────────────────────────────
// Reusable star rating display
//
// Usage:
//   <StarRating rating={4.5} size="sm" />
//   <StarRating rating={3.0} size="md" />
//   <StarRating rating={5.0} size="lg" />
// ─────────────────────────────────────────────────────────────────

import { HStack, Text } from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";

export default function StarRating({ rating, size = "md" }) {
  // Safely convert to number, default to 0 if missing or null
  const numRating = Number(rating) || 0;

  // Icon and text sizes based on size prop
  const iconSize  = size === "sm" ? 3 : size === "lg" ? 5 : 4;
  const textSize  = size === "sm" ? "xs" : size === "lg" ? "md" : "sm";

  return (
    <HStack spacing={1} align="center">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          boxSize={iconSize}
          // Gold if the star is within the rating, gray if not
          color={star <= Math.round(numRating) ? "#E67E22" : "gray.300"}
          transition="color 0.15s"
        />
      ))}
      {/* Numeric rating shown next to the stars */}
      <Text fontSize={textSize} color="gray.500" ml={1} fontWeight="500">
        {numRating.toFixed(1)}
      </Text>
    </HStack>
  );
}