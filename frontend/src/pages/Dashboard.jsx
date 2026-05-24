// src/pages/Dashboard.jsx
// ─────────────────────────────────────────────────────────────────
// Twin Dashboard — Page 4 (route: /dashboard)
//
// Fetches the full twin profile from GET /twins/{persona_id}
// and shows stats, review samples, and rating distribution.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  SimpleGrid,
  Box,
  Progress,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";
import { useApp } from "../context/AppContext";
import { fetchTwin, fetchTwinRecommendations } from "../api/personas";

export default function Dashboard() {
  const { selectedPersona, isNaija } = useApp();

  const [twin, setTwin]       = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const cardBg      = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const metaColor   = useColorModeValue("gray.500", "gray.400");
  const textColor   = useColorModeValue("gray.700", "gray.200");

  useEffect(() => {
    if (!selectedPersona) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [data, recsData] = await Promise.all([
          fetchTwin(selectedPersona.id),
          fetchTwinRecommendations(selectedPersona.id).catch(() => ({ recommendations: [] }))
        ]);
        setTwin(data);
        setRecommendations(recsData.recommendations || []);
      } catch (err) {
        setError("Could not load twin profile from the backend.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedPersona?.id]);

  if (loading) {
    return (
      <Container maxW="900px" py={16} textAlign="center">
        <Spinner size="xl" color="brand.500" />
        <Text mt={4} color={metaColor}>Loading twin profile…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="900px" py={8}>
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  const isColdStart = (twin?.num_reviews ?? 0) <= 2;
  const ratingBias = twin ? round2(twin.avg_rating - 3.5) : 0;
  const biasDirection = ratingBias > 0 ? "higher" : ratingBias < 0 ? "lower" : "neutral";

  function round2(n) { return Math.round(n * 100) / 100; }

  return (
    <Container maxW="900px" py={8} px={{ base: 4, md: 8 }}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <VStack align="start" spacing={1} mb={8}>
        <HStack spacing={3} align="center">
          <Heading size="lg">Your Digital Twin</Heading>
          {isColdStart && (
            <Badge colorScheme="orange" borderRadius="full" px={3}>
              Cold Start
            </Badge>
          )}
          {isNaija && (
            <Badge colorScheme="orange" borderRadius="full" px={3}>
              🇳🇬 Naija Mode
            </Badge>
          )}
        </HStack>
        <Text color={metaColor} fontSize="sm" fontFamily="mono">
          ID: {selectedPersona?.id}
        </Text>
      </VStack>

      {/* ── Stats Grid ──────────────────────────────────────── */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
        <StatCard label="Reviews trained on" value={twin?.num_reviews?.toLocaleString()} icon="📝" />
        <StatCard label="Average rating" value={twin?.avg_rating?.toFixed(2)} icon="⭐" />
        <StatCard label="Rating std dev" value={twin?.rating_std?.toFixed(2)} icon="📊" />
        <StatCard label="Products reviewed" value={twin?.products_reviewed_count?.toLocaleString()} icon="🛍️" isSmall />
      </SimpleGrid>

      <Divider mb={8} />

      {/* ── Review Samples ────────────────────────────────── */}
      {twin?.review_samples?.length > 0 && (
        <VStack align="start" spacing={3} mb={8}>
          <Heading size="sm">Writing Style Samples</Heading>
          {twin.review_samples.map((sample, i) => (
            <Box
              key={i}
              bg={cardBg}
              borderRadius="xl"
              border="1px solid"
              borderColor={borderColor}
              p={5}
              borderLeft="4px solid"
              borderLeftColor="brand.500"
              w="100%"
            >
              <Text lineHeight="1.8" color={textColor} fontSize="sm">
                "{sample}"
              </Text>
            </Box>
          ))}
        </VStack>
      )}

      {/* ── Rating Tendency ─────────────────────────────────── */}
      <VStack align="start" spacing={3} mb={8}>
        <Heading size="sm">Rating Tendency</Heading>
        <Box
          bg={cardBg}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
          p={5}
          w="100%"
        >
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="500" fontSize="sm">
              Rates {biasDirection} than average
            </Text>
            <Badge
              colorScheme={ratingBias > 0 ? "green" : ratingBias < 0 ? "orange" : "gray"}
              fontSize="sm"
              px={3}
            >
              {Math.abs(ratingBias).toFixed(2)} stars {biasDirection}
            </Badge>
          </HStack>
          <Progress
            value={Math.min((twin?.avg_rating ?? 3) * 20, 100)}
            max={100}
            borderRadius="full"
            size="sm"
            colorScheme={ratingBias > 0 ? "green" : ratingBias < 0 ? "orange" : "gray"}
          />
          <Text fontSize="xs" color={metaColor} mt={3}>
            Average user rates ~3.5 stars. This twin averages {twin?.avg_rating?.toFixed(2)}.
          </Text>
        </Box>
      </VStack>

      {/* ── Recommendations ─────────────────────────────────── */}
      {recommendations.length > 0 && (
        <VStack align="start" spacing={3} mb={8}>
          <Heading size="sm">Suggested Items (FAISS Vector Search)</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
            {recommendations.map((rec) => (
              <Box
                key={rec.product_id}
                bg={cardBg}
                borderRadius="xl"
                border="1px solid"
                borderColor={borderColor}
                p={4}
                _hover={{ borderColor: "brand.300", shadow: "sm" }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="600" fontSize="sm" noOfLines={1}>
                    {rec.title !== "Unknown Product" ? rec.title : rec.product_id}
                  </Text>
                  <Badge colorScheme="blue" fontSize="xs">
                    Score: {rec.similarity_score?.toFixed(3)}
                  </Badge>
                </HStack>
                <HStack spacing={4} color={metaColor} fontSize="xs">
                  <HStack spacing={1}>
                    <Text>⭐</Text>
                    <Text>{rec.avg_rating?.toFixed(1) || "N/A"}</Text>
                  </HStack>
                  <Text>{rec.num_reviews} reviews</Text>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      )}

    </Container>
  );
}

// ── Sub-component: stat card ────────────────────────────────────
function StatCard({ label, value, icon, isSmall = false }) {
  const cardBg      = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const metaColor   = useColorModeValue("gray.500", "gray.400");

  return (
    <Box
      bg={cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      p={4}
      textAlign="center"
      transition="all 0.2s"
      _hover={{ shadow: "sm", borderColor: "brand.300" }}
    >
      <Text fontSize="2xl" mb={2}>{icon}</Text>
      <Text fontSize="10px" color={metaColor} textTransform="uppercase" mb={1}>{label}</Text>
      <Text fontSize={isSmall ? "xs" : "xl"} fontWeight="600">{value ?? "—"}</Text>
    </Box>
  );
}
