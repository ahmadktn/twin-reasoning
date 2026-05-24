// src/components/Footer.jsx
// ─────────────────────────────────────────────────────────────────
// Global Footer — matches Figma design
// Three columns: Brand | Quick Links | Special Access
// ─────────────────────────────────────────────────────────────────

import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { LockIcon } from "@chakra-ui/icons";
import { Link, useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate    = useNavigate();
  const bg          = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor   = useColorModeValue("gray.600", "gray.400");
  const headingColor = useColorModeValue("gray.800", "gray.100");
  const logoColor   = useColorModeValue("brand.500", "brand.300");
  const linkHover   = useColorModeValue("brand.500", "brand.300");

  return (
    <Box
      as="footer"
      bg={bg}
      borderTop="1px solid"
      borderColor={borderColor}
      pt={10}
      pb={6}
      px={6}
      mt="auto"
    >
      <SimpleGrid
        columns={{ base: 1, md: 3 }}
        spacing={10}
        maxW="1280px"
        mx="auto"
        mb={8}
      >

        {/* ── Column 1: Brand ──────────────────────────────── */}
        <VStack align="start" spacing={3}>
          {/* Logo row */}
          <HStack spacing={2}>
            {/* Circle logo icon */}
            <Box
              w="36px"
              h="36px"
              borderRadius="full"
              border="3px solid"
              borderColor="brand.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg="accent.500"
              />
            </Box>
            <Text
              fontWeight="700"
              fontSize="lg"
              color={logoColor}
              letterSpacing="-0.5px"
            >
              TwinReason
            </Text>
          </HStack>

          {/* Tagline */}
          <Text fontSize="sm" color={textColor} lineHeight="1.6" maxW="220px">
            Your digital twin. Your voice. Your recommendations.
          </Text>
        </VStack>

        {/* ── Column 2: Quick Links ─────────────────────────── */}
        <VStack align="start" spacing={4}>
          <Text
            fontWeight="600"
            fontSize="sm"
            color={headingColor}
            textTransform="none"
          >
            Quick Links
          </Text>
          <VStack align="start" spacing={3}>
            <FooterLink to="/" label="Home" hoverColor={linkHover} textColor={textColor} />
            <FooterLink to="/chat" label="Chat" hoverColor={linkHover} textColor={textColor} />
            <FooterLink to="/dashboard" label="My Twin" hoverColor={linkHover} textColor={textColor} />
          </VStack>
        </VStack>

        {/* ── Column 3: Special Access ──────────────────────── */}
        <VStack align="start" spacing={4}>
          <Text
            fontWeight="600"
            fontSize="sm"
            color={headingColor}
          >
            Special Access
          </Text>
          <VStack align="start" spacing={1}>
            {/* Judge Mode link */}
            <HStack
              spacing={2}
              cursor="pointer"
              onClick={() => navigate("/eval")}
              _hover={{ color: "accent.500" }}
              color={textColor}
              transition="color 0.15s"
            >
              <LockIcon boxSize={3} />
              <Text fontSize="sm" fontWeight="500">
                Judge Mode
              </Text>
            </HStack>
            <Text fontSize="xs" color={textColor} pl={5}>
              For evaluators and technical reviewers
            </Text>
          </VStack>
        </VStack>

      </SimpleGrid>

      {/* ── Bottom Divider + Sub-footer ──────────────────────── */}
      <Divider borderColor={borderColor} mb={4} maxW="1280px" mx="auto" />

      <Flex
        justify="space-between"
        align="center"
        maxW="1280px"
        mx="auto"
        wrap="wrap"
        gap={2}
      >
        <Text fontSize="xs" color={textColor}>
          &copy; {new Date().getFullYear()} TwinReason. All rights reserved.
        </Text>
        <Text fontSize="xs" color={textColor}>
          
        </Text>
      </Flex>
    </Box>
  );
}

// ── Sub-component: footer nav link ───────────────────────────────
function FooterLink({ to, label, hoverColor, textColor }) {
  return (
    <Link to={to}>
      <Text
        fontSize="sm"
        color={textColor}
        _hover={{ color: hoverColor }}
        transition="color 0.15s"
      >
        {label}
      </Text>
    </Link>
  );
}