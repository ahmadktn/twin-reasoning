// src/pages/PersonaSelect.jsx
// ─────────────────────────────────────────────────────────────────
// Persona Selection — shown on first load before any other page.
//
// What happens here:
// 1. AppContext fetches personas from GET /personas on mount
// 2. This page shows a loading spinner or the persona card grid
// 3. User clicks a card → selectPersona() is called → main app unlocks
// ─────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Flex,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import OnboardingChat from "./OnboardingChat";

const MotionBox = motion(Box);

// Short persona "names" derived from the ID — first 8 chars
function shortId(id) {
  return id.slice(0, 8).toUpperCase();
}

// Pick a deterministic avatar colour from the persona ID
const AVATAR_COLORS = [
  ["#0F4C5C", "#66a5b3"],
  ["#7B2D8B", "#c084fc"],
  ["#1a6b3a", "#6ee7b7"],
  ["#b45309", "#fcd34d"],
  ["#1d4ed8", "#93c5fd"],
  ["#be185d", "#f9a8d4"],
  ["#0f766e", "#5eead4"],
  ["#6d28d9", "#c4b5fd"],
];
function avatarColor(id, idx) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

// Star rating visualisation
function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <HStack spacing="1px">
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          fontSize="xs"
          color={i <= full ? "accent.500" : i === full + 1 && half ? "accent.300" : "gray.300"}
        >
          ★
        </Text>
      ))}
    </HStack>
  );
}

export default function PersonaSelect() {
  const { personas, personasLoading, personasError, selectPersona } = useApp();
  const [hoveredId, setHoveredId] = useState(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const toast = useToast();

  const bg              = useColorModeValue("#F9F9FB", "#0d0d0d");
  const cardBg          = useColorModeValue("white", "#1a1a2e");
  const cardBorder      = useColorModeValue("gray.200", "gray.700");
  const metaColor       = useColorModeValue("gray.500", "gray.400");
  const headingColor    = useColorModeValue("gray.800", "gray.50");
  const reviewStyleBg   = useColorModeValue("gray.50", "#111");

  // ── Loading ────────────────────────────────────────────────────
  if (personasLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg={bg} direction="column" gap={4}>
        <Spinner size="xl" color="brand.500" thickness="4px" speed="0.8s" />
        <Text color={metaColor} fontSize="sm">
          Loading personas from backend…
        </Text>
      </Flex>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (personasError) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg={bg} p={8}>
        <Alert
          status="error"
          borderRadius="2xl"
          maxW="500px"
          flexDirection="column"
          alignItems="center"
          textAlign="center"
          py={8}
          gap={3}
        >
          <AlertIcon boxSize={8} />
          <AlertTitle fontSize="lg">Backend Unreachable</AlertTitle>
          <AlertDescription>{personasError}</AlertDescription>
          <Button
            mt={2}
            colorScheme="red"
            variant="outline"
            borderRadius="xl"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Alert>
      </Flex>
    );
  }

  if (isOnboarding) {
    return <OnboardingChat />;
  }

  // ── Main selector ──────────────────────────────────────────────
  return (
    <Box minH="100vh" bg={bg}>
      <Container maxW="1100px" py={16} px={{ base: 4, md: 8 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <VStack spacing={3} mb={10} textAlign="center">
          <HStack spacing={3} justify="center">
            <Text fontSize="3xl">🤖</Text>
            <Heading
              size="2xl"
              bgGradient="linear(to-r, brand.500, brand.300)"
              bgClip="text"
              fontWeight="800"
              letterSpacing="-1px"
            >
              TwinReason
            </Heading>
          </HStack>
          <Text
            fontSize="lg"
            color={metaColor}
            maxW="520px"
            lineHeight="1.7"
          >
            Choose a <strong>Digital Twin</strong> to get started.
            Your twin will generate personalised reviews and recommendations
            based on their real Amazon review history.
          </Text>
          <HStack spacing={4} mt={4}>
            <Badge
              colorScheme="brand"
              borderRadius="full"
              px={4}
              py={1.5}
              fontSize="xs"
              fontWeight="600"
              letterSpacing="0.5px"
            >
              {personas.length} personas available
            </Badge>
            <Button
              colorScheme="brand"
              variant="solid"
              borderRadius="full"
              size="sm"
              onClick={() => setIsOnboarding(true)}
            >
              + Create New Profile
            </Button>
          </HStack>
        </VStack>

        {/* ── Persona Card Grid ─────────────────────────────── */}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={5}>
          {personas.map((persona, idx) => {
            const [bgColor, accentColor] = avatarColor(persona.id, idx);
            const isHovered = hoveredId === persona.id;
            const isColdStart = persona.num_reviews <= 2;

            return (
              <MotionBox
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onHoverStart={() => setHoveredId(persona.id)}
                onHoverEnd={() => setHoveredId(null)}
              >
                <Box
                  bg={cardBg}
                  borderRadius="2xl"
                  border="2px solid"
                  borderColor={isHovered ? "brand.400" : cardBorder}
                  p={5}
                  cursor="pointer"
                  onClick={() => {
                    selectPersona(persona);
                    toast({
                      title: "Digital Twin Selected",
                      description: `You are now interacting as Twin ${shortId(persona.id)}`,
                      status: "success",
                      duration: 3000,
                      isClosable: true,
                      position: "top",
                    });
                  }}
                  transition="all 0.2s ease"
                  boxShadow={isHovered ? "0 12px 32px rgba(15,76,92,0.18)" : "sm"}
                  position="relative"
                  overflow="hidden"
                  role="button"
                  aria-label={`Select persona ${shortId(persona.id)}`}
                  _active={{ transform: "scale(0.97)" }}
                >
                  {/* Gradient accent bar at top */}
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    h="3px"
                    bgGradient={`linear(to-r, ${bgColor}, ${accentColor})`}
                    borderTopRadius="2xl"
                    opacity={isHovered ? 1 : 0.6}
                    transition="opacity 0.2s"
                  />

                  <VStack spacing={4} align="stretch">
                    {/* Avatar + cold-start badge */}
                    <HStack justify="space-between" align="start">
                      <Flex
                        w={12}
                        h={12}
                        borderRadius="xl"
                        bgGradient={`linear(to-br, ${bgColor}, ${accentColor})`}
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <Text fontSize="xs" fontWeight="800" color="white" letterSpacing="1px">
                          {shortId(persona.id).slice(0, 3)}
                        </Text>
                      </Flex>
                      {isColdStart && (
                        <Badge colorScheme="orange" borderRadius="full" fontSize="9px" px={2}>
                          Cold Start
                        </Badge>
                      )}
                    </HStack>

                    {/* Persona ID (short) */}
                    <VStack align="start" spacing={0.5}>
                      <Text
                        fontWeight="700"
                        fontSize="sm"
                        letterSpacing="-0.3px"
                        noOfLines={1}
                      >
                        Twin #{idx + 1}
                      </Text>
                      <Text fontSize="10px" color={metaColor} fontFamily="mono" noOfLines={1}>
                        {persona.id.slice(0, 16)}…
                      </Text>
                    </VStack>

                    {/* Stats */}
                    <VStack align="start" spacing={1.5}>
                      <HStack justify="space-between" w="100%">
                        <Text fontSize="xs" color={metaColor}>Reviews</Text>
                        <Text fontSize="xs" fontWeight="600">{persona.num_reviews.toLocaleString()}</Text>
                      </HStack>
                      <HStack justify="space-between" w="100%">
                        <Text fontSize="xs" color={metaColor}>Avg Rating</Text>
                        <Stars rating={persona.avg_rating} />
                      </HStack>
                      <HStack justify="space-between" w="100%">
                        <Text fontSize="xs" color={metaColor}>Products</Text>
                        <Text fontSize="xs" fontWeight="600">
                          {persona.products_reviewed_count ?? "—"}
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Review style excerpt */}
                    {persona.review_style && (
                      <Box
                        bg={reviewStyleBg}
                        borderRadius="lg"
                        p={3}
                        borderLeft="3px solid"
                        borderLeftColor={accentColor}
                      >
                        <Text
                          fontSize="10px"
                          color={metaColor}
                          noOfLines={3}
                          lineHeight="1.6"
                          fontStyle="italic"
                        >
                          "{persona.review_style.slice(0, 110)}…"
                        </Text>
                      </Box>
                    )}

                    {/* CTA */}
                    <Button
                      size="sm"
                      borderRadius="xl"
                      colorScheme="brand"
                      variant={isHovered ? "solid" : "outline"}
                      transition="all 0.2s"
                      w="100%"
                      fontSize="xs"
                      fontWeight="600"
                    >
                      {isHovered ? "Select Twin →" : "View Twin"}
                    </Button>
                  </VStack>
                </Box>
              </MotionBox>
            );
          })}
        </SimpleGrid>

        {/* ── Footer note ───────────────────────────────────── */}
        <Text textAlign="center" fontSize="xs" color={metaColor} mt={14}>
          Personas are sourced from the Amazon Beauty dataset. All review data is real.
        </Text>
      </Container>
    </Box>
  );
}
