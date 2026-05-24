// src/pages/ItemDetail.jsx
// ─────────────────────────────────────────────────────────────────
// Item Detail — Page 2 (route: /item/:itemId)
//
// What happens here:
// 1. Reads itemId from the URL
// 2. Finds the item from MOCK_ITEMS
// 3. Calls Task A to generate a FULL review
// 4. "Compare with" dropdown re-fetches for a different user
//    without changing the global selected user
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Button,
  Select,
  Divider,
  Alert,
  AlertIcon,
  Skeleton,
  SkeletonText,
  Flex,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { ArrowBackIcon, TimeIcon } from "@chakra-ui/icons";
import { useApp } from "../context/AppContext";
import { simulateReview } from "../api/taskA";
import StarRating from "../components/StarRating";

export default function ItemDetail() {
  // Get itemId from the URL — e.g. /item/I_001 → itemId = "I_001"
  const { itemId } = useParams();
  const navigate   = useNavigate();
  const { selectedPersona, isNaija } = useApp();

  const location = useLocation();

  const [item, setItem] = useState(
    location.state?.item || null
  );

  // Review data from the API
  const [review, setReview]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Fetch item metadata if not passed via location state
  useEffect(() => {
    if (item) return; // already have it
    fetch(`http://localhost:8000/twins/items/${itemId}`)
      .then(res => {
        if (!res.ok) throw new Error("Item not found");
        return res.json();
      })
      .then(data => {
        setItem({
          id: data.product_id,
          title: data.title !== "Unknown Product" ? data.title : data.product_id,
          category: data.category || "Product",
          description: `⭐ ${data.avg_rating} | ${data.num_reviews} reviews`,
          tags: ["Recommendation"],
          emoji: "🛍️",
          image: data.image,
          price: data.price
        });
      })
      .catch(err => {
        setItem({
          id: itemId,
          title: itemId,
          category: "Product",
          description: "Item details",
          tags: [],
          emoji: "🛍️"
        });
      });
  }, [itemId, item]);

  // No local compare-user: always uses the selected persona

  // Colors
  const cardBg       = useColorModeValue("gray.50", "#1E1E1E");
  const borderColor  = useColorModeValue("gray.200", "gray.700");
  const tagBg        = useColorModeValue("white", "gray.700");
  const metaColor    = useColorModeValue("gray.500", "gray.400");
  const reviewTextColor = useColorModeValue("gray.700", "gray.200");

  // ── Fetch review when persona or item changes ──────────────────
  useEffect(() => {
    if (!item || !selectedPersona) return;

    async function loadReview() {
      setLoading(true);
      setError(null);
      try {
        const result = await simulateReview(selectedPersona.id, item.id);
        setReview(result);
      } catch (err) {
        console.error("Failed to load review:", err);
        setError("Could not load review. Try again.");
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [selectedPersona?.id, itemId]);


  // ── Item not found ─────────────────────────────────────────────
  if (!item) {
    return (
      <Container maxW="800px" py={8}>
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          Item not found. It may have been removed.
        </Alert>
        <Button mt={4} onClick={() => navigate("/")} leftIcon={<ArrowBackIcon />}>
          Back to Feed
        </Button>
      </Container>
    );
  }

  // Short display label for the current persona
  const personaLabel = selectedPersona?.id?.slice(0, 8)?.toUpperCase() ?? "Twin";

  // Badge colour based on adapter type
  function adapterColor(adapter) {
    if (adapter === "user_adapter")       return "teal";
    if (adapter === "population_adapter") return "orange";
    return "gray";
  }

  // Badge label
  function adapterLabel(adapter) {
    if (adapter === "user_adapter")       return "Personal Twin";
    if (adapter === "population_adapter") return "Population Baseline";
    return adapter;
  }

  return (
    <Container maxW="860px" py={8} px={{ base: 4, md: 8 }}>

      {/* ── Back Button ─────────────────────────────────────── */}
      <Button
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        size="sm"
        mb={6}
        color="gray.500"
        onClick={() => navigate(-1)}
        _hover={{ color: "brand.500" }}
      >
        Back to Feed
      </Button>

      {/* ── Item Header ─────────────────────────────────────── */}
      <HStack spacing={5} align="start" mb={8}>
        {/* Emoji block */}
        <Flex
          w="90px"
          h="90px"
          flexShrink={0}
          bg={cardBg}
          borderRadius="2xl"
          border="1px solid"
          borderColor={borderColor}
          align="center"
          justify="center"
          fontSize="3xl"
        >
          {item.emoji}
        </Flex>

        {/* Item info */}
        <VStack align="start" spacing={2} flex={1}>
          <Heading size="lg">{item.title}</Heading>
          <Text color={metaColor} fontSize="sm">
            {item.description}
          </Text>
          {/* Category tags */}
          <HStack wrap="wrap" spacing={2}>
            {item.tags.map((tag) => (
              <Badge
                key={tag}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="500"
                bg={tagBg}
                border="1px solid"
                borderColor={borderColor}
                // Green for Nigerian/African cultural tags
                colorScheme={
                  tag.includes("Nigerian") ||
                  tag.includes("Naija") ||
                  tag.includes("Afro") ||
                  tag.includes("Nollywood")
                    ? "green"
                    : "gray"
                }
              >
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </HStack>
        </VStack>
      </HStack>

      <Divider mb={6} />

      {/* ── Review Section Header ────────────────────────────── */}
      <HStack
        justify="space-between"
        align="center"
        mb={4}
        wrap="wrap"
        gap={3}
      >
        {/* Left: whose review + badges */}
        <HStack spacing={2} wrap="wrap">
          <Text fontWeight="600" fontSize="sm">
            Twin {personaLabel}'s Review
          </Text>
          {review && !loading && (
            <Tooltip
              label="Generated by your Digital Twin"
              hasArrow
              fontSize="xs"
            >
              <Badge
                colorScheme="teal"
                borderRadius="full"
                px={3}
                fontSize="xs"
                cursor="help"
              >
                Personal Twin · {((review?.confidence ?? 0) * 100).toFixed(0)}% confidence
              </Badge>
            </Tooltip>
          )}
          {isNaija && (
            <Badge colorScheme="orange" borderRadius="full" px={3} fontSize="xs">
              🇳🇬 Naija
            </Badge>
          )}
        </HStack>

        {/* No compare dropdown — only one persona active at a time */}
      </HStack>

      {/* ── Review Card ──────────────────────────────────────── */}
      <Box
        bg={cardBg}
        borderRadius="2xl"
        p={6}
        borderLeft="4px solid"
        borderColor="brand.500"
        border="1px solid"
        borderLeftWidth="4px"
        borderLeftColor="brand.500"
        borderTopColor={borderColor}
        borderRightColor={borderColor}
        borderBottomColor={borderColor}
        mb={6}
        minH="160px"
      >
        {loading ? (
          // Skeleton while review loads
          <VStack align="start" spacing={4}>
            <Skeleton height="28px" width="140px" borderRadius="md" />
            <SkeletonText noOfLines={4} spacing={3} w="100%" />
            <Skeleton height="16px" width="120px" />
          </VStack>
        ) : error ? (
          <Alert status="error" borderRadius="xl">
            <AlertIcon />
            {error}
          </Alert>
        ) : (
          <VStack align="start" spacing={4}>
            {/* Star rating */}
            <StarRating rating={review?.predicted_rating} size="lg" />

            {/* Full review text — backend returns 'review' field */}
            <Text
              fontSize="md"
              lineHeight="1.9"
              fontStyle="italic"
              color={reviewTextColor}
            >
              "{review?.review}"
            </Text>
            <HStack spacing={3} fontSize="xs" color={metaColor}>
              <Text>Confidence: {((review?.confidence ?? 0) * 100).toFixed(0)}%</Text>
              <Text>•</Text>
              <Text>Persona Twin</Text>
            </HStack>
          </VStack>
        )}
      </Box>

      {/* ── Action Buttons ───────────────────────────────────── */}
      <HStack spacing={3} wrap="wrap">
        <Button
          colorScheme="brand"
          size="md"
          borderRadius="xl"
          onClick={() =>
            navigate(
              `/chat?item=${item.id}&title=${encodeURIComponent(item.title)}`
            )
          }
        >
          Ask your twin about this →
        </Button>
        <Button
          variant="outline"
          colorScheme="gray"
          size="md"
          borderRadius="xl"
          onClick={() => navigate("/")}
        >
          Back to Feed
        </Button>
      </HStack>

    </Container>
  );
}