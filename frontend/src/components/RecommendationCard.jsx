// src/components/RecommendationCard.jsx
// ─────────────────────────────────────────────────────────────────
// Recommendation Card — used in the Twin Chat sidebar
//
// Props:
//   rec — { rank, item_id, title, twin_score, explanation, category, emoji }
// ─────────────────────────────────────────────────────────────────

import {
  Box,
  Text,
  Badge,
  HStack,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import StarRating from "./StarRating";

export default function RecommendationCard({ rec }) {
  const navigate = useNavigate();

  const cardBg      = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const metaColor   = useColorModeValue("gray.500", "gray.400");

  return (
    <Box
      bg={cardBg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      p={3}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        shadow: "sm",
        borderColor: "brand.300",
        transform: "translateY(-1px)",
      }}
      onClick={() => navigate(`/item/${rec.product_id}`)}
      w="100%"
    >
      {/* Rank badge + category */}
      <HStack justify="space-between" mb={2}>
        <Badge
          colorScheme="brand"
          borderRadius="full"
          fontSize="10px"
          px={2}
        >
          #{rec.rank}
        </Badge>
        <Text fontSize="10px" color={metaColor}>
          {rec.category}
        </Text>
      </HStack>

      {/* Image & Title */}
      <HStack align="start" mb={1} spacing={3}>
        {rec.image ? (
          <img
            src={rec.image}
            alt={rec.title}
            style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <Box fontSize="2xl">{rec.emoji || "🛍️"}</Box>
        )}
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="600" fontSize="sm" noOfLines={2} lineHeight="1.2" title={rec.title || rec.product_id}>
            {rec.title || rec.product_id}
          </Text>
          {rec.price && (
            <Text fontSize="xs" color="green.500" fontWeight="500">
              ${rec.price.toFixed(2)}
            </Text>
          )}
        </VStack>
      </HStack>

      {/* Twin score as stars */}
      <StarRating rating={rec.relevance_score ? rec.relevance_score * 5 : 0} size="sm" />

      {/* Explanation */}
      <Text fontSize="xs" color={metaColor} mt={1} noOfLines={2} lineHeight="1.4">
        {rec.explanation}
      </Text>
    </Box>
  );
}