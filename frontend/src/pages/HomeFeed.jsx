// src/pages/HomeFeed.jsx
// ─────────────────────────────────────────────────────────────────
// Home Feed — Page 1 (route: /)
//
// What happens here:
// 1. Page loads → shows skeleton grid immediately
// 2. Calls Task A for all 12 items in parallel
// 3. Replaces skeletons with real cards when data arrives
// 4. Re-fetches everything when user or locale changes
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useApp } from "../context/AppContext";
import { simulateReview } from "../api/taskA";
import { fetchTwinRecommendations } from "../api/personas";
import ItemCard from "../components/ItemCard";
import { SkeletonGrid } from "../components/LoadingSkeleton";

export default function HomeFeed() {
  const { selectedPersona, locale, isNaija } = useApp();
  const toast = useToast();

  // All items fetched from recommendations
  const [items, setItems] = useState([]);

  // reviews — maps item.id → review result from API
  const [reviews, setReviews]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const headingColor  = useColorModeValue("gray.800", "gray.100");
  const subTextColor  = useColorModeValue("gray.500", "gray.400");
  const filterBg      = useColorModeValue("white", "#1E1E1E");
  const filterBorder  = useColorModeValue("gray.200", "gray.700");

  // ── Load reviews whenever persona changes ────────────────────
  useEffect(() => {
    async function loadReviews() {
      if (!selectedPersona) return;
      // Debug
      // eslint-disable-next-line no-console
      console.log("[DEBUG] HomeFeed: selectedPersona.id=", selectedPersona.id);
      setLoading(true);
      setError(null);

      try {
        // Fetch recommendations to serve as the feed items
        const recsData = await fetchTwinRecommendations(selectedPersona.id).catch(() => ({ recommendations: [] }));
        const fetchedItems = (recsData.recommendations || []).map(r => ({
          id: r.product_id,
          title: r.title && r.title !== "Unknown Product" ? r.title : r.product_id,
          category: "Product",
          description: `Score: ${r.similarity_score.toFixed(3)} | ⭐ ${r.avg_rating ? r.avg_rating.toFixed(1) : 'N/A'}`,
          tags: ["Recommendation"],
          emoji: "🛍️",
          image: r.image,
          price: r.price,
          imageQuery: r.title && r.title !== "Unknown Product" ? r.title : "beauty product",
        }));
        
        setItems(fetchedItems);

        // Fetch reviews for all items in parallel against the real backend.
        const results = await Promise.all(
          fetchedItems.map((item) =>
            (async () => {
              const r = await simulateReview(selectedPersona.id, item.id);
              return r;
            })()
          )
        );

        // Convert array into a map: { "I_001": reviewData, ... }
        const reviewMap = {};
        fetchedItems.forEach((item, index) => {
          reviewMap[item.id] = results[index];
        });

        setReviews(reviewMap);
        // eslint-disable-next-line no-console
        console.log("[DEBUG] HomeFeed: setReviews, keys=", Object.keys(reviewMap));
      } catch (err) {
        console.error("Failed to load reviews:", err);
        setError(
          "Could not load reviews from the backend. Make sure it is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [selectedPersona?.id]); // re-runs when persona changes

  // ── Render ─────────────────────────────────────────

  return (
    <Container maxW="1280px" py={8} px={{ base: 4, md: 8 }}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <VStack align="start" spacing={1} mb={6}>
        <HStack spacing={3} align="center">
          <Heading size="lg" color={headingColor}>
            {isNaija ? "Your Feed 🇳🇬" : "Your Feed"}
          </Heading>
          {selectedPersona?.num_reviews <= 2 && (
            <Badge colorScheme="orange" borderRadius="full" px={3}>
              Cold Start
            </Badge>
          )}
        </HStack>
        <Text color={subTextColor} fontSize="sm">
          {isNaija
            ? "Your Digital Twin dey write reviews for you — Naija style 🔥"
            : `Personalised reviews from Twin ${selectedPersona?.id?.slice(0, 8)?.toUpperCase()} · ${selectedPersona?.num_reviews?.toLocaleString()} reviews trained`}
        </Text>
      </VStack>

      {/* Removed Category Filter Row */}

      {/* ── Error Banner ─────────────────────────────────────── */}
      {error && (
        <Alert status="error" borderRadius="xl" mb={6}>
          <AlertIcon />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Item Grid ────────────────────────────────────────── */}
      {loading ? (
        // Show skeletons while loading
        <SkeletonGrid count={12} />
      ) : (
        <>
          {/* Results count */}
          <Text fontSize="sm" color={subTextColor} mb={4}>
            Showing {items.length} recommendations
          </Text>

          {/* Real item cards */}
          <SimpleGrid
            columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
            spacing={4}
          >
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                review={reviews[item.id]}
              />
            ))}
          </SimpleGrid>

          {/* Empty state when filter has no results */}
          {items.length === 0 && (
            <VStack py={16} spacing={3}>
              <Text fontSize="2xl"></Text>
              <Text color={subTextColor}>
                No items found.
              </Text>
            </VStack>
          )}
        </>
      )}

      {/* ── Load More ────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <Box textAlign="center" mt={10}>
          <Button
            variant="outline"
            colorScheme="gray"
            size="md"
            onClick={() => {
              toast({
                title: "Loading more items...",
                description: "This feature is coming soon!",
                status: "info",
                duration: 3000,
                isClosable: true,
              });
            }}
          >
            Load more
          </Button>
        </Box>
      )}

    </Container>
  );
}