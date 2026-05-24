// src/components/Header.jsx
// ─────────────────────────────────────────────────────────────────
// Global Header — appears on every page (after persona is selected)
//
// Contains:
// - TwinReason logo (links to home)
// - Nav links: Feed, Twin Chat, Dashboard
// - Current twin badge (click to switch)
// - Naija toggle
// - Dark mode toggle
// ─────────────────────────────────────────────────────────────────

import {
  Box,
  Flex,
  Text,
  Button,
  HStack,
  Badge,
  useColorMode,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  const bg        = useColorModeValue("white", "#1E1E1E");
  const border    = useColorModeValue("gray.200", "gray.700");
  const logoColor = useColorModeValue("brand.500", "brand.300");

  const { selectedPersona, selectPersona, isNaija, toggleLocale } = useApp();
  const location = useLocation();

  function isActive(path) {
    return location.pathname === path;
  }

  // Reset to persona selector by clearing the selection
  function handleSwitchTwin() {
    selectPersona(null);
    toast({
      title: "Switched Twin",
      description: "You have returned to the Persona Selection screen.",
      status: "info",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  }

  function handleToggleLocale() {
    toggleLocale();
    const willBeNaija = !isNaija;
    toast({
      title: willBeNaija ? "Naija Mode Enabled 🇳🇬" : "Naija Mode Disabled",
      description: willBeNaija ? "Your twin dey reason Naija style now!" : "Returned to standard English.",
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  }

  const shortId = selectedPersona
    ? selectedPersona.id.slice(0, 8).toUpperCase()
    : "";

  return (
    <Box
      as="header"
      bg={bg}
      borderBottom="1px solid"
      borderColor={border}
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={100}
      backdropFilter="blur(8px)"
      boxShadow="sm"
    >
      <Flex align="center" justify="space-between" maxW="1280px" mx="auto">

        {/* ── LEFT: Logo + Nav Links ───────────────────────── */}
        <HStack spacing={8}>

          {/* Logo */}
          <Link to="/">
            <Text
              fontWeight="700"
              fontSize="xl"
              color={logoColor}
              letterSpacing="-0.5px"
            >
              TwinReason
            </Text>
          </Link>

          {/* Nav Links */}
          <HStack spacing={1}>
            <NavLink to="/"          label="Feed"       active={isActive("/")} />
            <NavLink to="/chat"      label="Twin Chat"  active={isActive("/chat")} />
            <NavLink to="/dashboard" label="My Twin"    active={isActive("/dashboard")} />
          </HStack>
        </HStack>

        {/* ── RIGHT: Controls ──────────────────────────────── */}
        <HStack spacing={3}>

          {/* Current Twin Badge + Switch button */}
          {selectedPersona && (
            <HStack spacing={2}>
              <Badge
                colorScheme="brand"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="xs"
                fontWeight="600"
              >
                🤖 Twin {shortId}
              </Badge>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="gray"
                borderRadius="full"
                fontSize="xs"
                onClick={handleSwitchTwin}
                _hover={{ bg: "gray.100", _dark: { bg: "gray.700" } }}
              >
                Switch
              </Button>
            </HStack>
          )}

          {/* Naija Toggle */}
          <Button
            size="sm"
            onClick={handleToggleLocale}
            borderRadius="full"
            fontWeight="600"
            fontSize="xs"
            px={4}
            bg={isNaija ? "accent.500" : "transparent"}
            color={isNaija ? "white" : "gray.500"}
            border="1px solid"
            borderColor={isNaija ? "accent.500" : "gray.300"}
            _hover={{ bg: isNaija ? "accent.600" : "gray.100" }}
          >
            🇳🇬 {isNaija ? "Naija ON" : "Naija OFF"}
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            size="sm"
            onClick={toggleColorMode}
            variant="ghost"
            borderRadius="full"
            aria-label="Toggle dark mode"
          >
            {colorMode === "light" ? (
              <MoonIcon color="gray.500" />
            ) : (
              <SunIcon color="yellow.300" />
            )}
          </Button>

        </HStack>
      </Flex>
    </Box>
  );
}

// ── Sub-component: single nav link ───────────────────────────────
function NavLink({ to, label, active }) {
  const activeColor   = useColorModeValue("brand.500", "brand.300");
  const inactiveColor = useColorModeValue("gray.600", "gray.400");

  return (
    <Link to={to}>
      <Box
        px={3}
        py={2}
        fontSize="sm"
        fontWeight={active ? "600" : "400"}
        color={active ? activeColor : inactiveColor}
        borderBottom="2px solid"
        borderColor={active ? "brand.500" : "transparent"}
        transition="all 0.15s"
        _hover={{ color: activeColor }}
      >
        {label}
      </Box>
    </Link>
  );
}