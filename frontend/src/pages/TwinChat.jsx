// src/pages/TwinChat.jsx
// ─────────────────────────────────────────────────────────────────
// Twin Chat — Page 3 (route: /chat)
//
// What happens here:
// 1. Page loads → creates a chat session (saved to localStorage)
// 2. User sends a message → calls Task B → shows response + recs
// 3. Recommendation cards appear in the right sidebar
// 4. Quick action buttons pre-fill common requests
// 5. Session persists across page reloads per user
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  Heading,
  Badge,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { useApp } from "../context/AppContext";
import { sendMessageStream } from "../api/taskB";
import RecommendationCard from "../components/RecommendationCard";

// Quick action buttons — pre-fill common requests for easy demo
const QUICK_ACTIONS = [
  // { label: " Top 5 for tonight",   message: "Give me your top 5 recommendations for tonight" },
  { label: " Surprise me",          message: "Surprise me with something I would not normally pick" },
  // { label: " Spicy Nigerian food",  message: "I want something spicy and Nigerian to eat" },
  // { label: " Movie night",          message: "Recommend a good movie for tonight" },
];

export default function TwinChat() {
  const { selectedPersona, isNaija } = useApp();
  const [searchParams] = useSearchParams();

  // Chat state — messages is the full history sent to the backend each turn
  const [messages, setMessages]               = useState([]);
  // chatHistory is just for display (includes agent greeting etc.)
  const [chatHistory, setChatHistory]         = useState([]);
  const [inputValue, setInputValue]           = useState("");
  const [isLoading, setIsLoading]             = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError]                     = useState(null);

  // Ref to auto-scroll to bottom of chat
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Colors
  const chatBg        = useColorModeValue("white", "#1E1E1E");
  const borderColor   = useColorModeValue("gray.200", "gray.700");
  const userBubbleBg  = "#0F4C5C";   // brand teal — always teal regardless of mode
  const agentBubbleBg = useColorModeValue("gray.100", "gray.700");
  const agentTextColor = useColorModeValue("gray.800", "gray.100");
  const sidebarBg     = useColorModeValue("gray.50", "gray.800");
  const metaColor     = useColorModeValue("gray.500", "gray.400");

  // ── Pre-fill input if navigated from an item card ──────────────
  useEffect(() => {
    const itemTitle = searchParams.get("title");
    if (itemTitle) {
      setInputValue(
        `Tell me more about ${decodeURIComponent(itemTitle)} and whether I would like it`
      );
    }
  }, []);

  // ── Reset chat when persona changes ───────────────────────────
  useEffect(() => {
    if (!selectedPersona) return;
    const greeting = isNaija
      ? `Ehen! Na me be your Digital Twin. Wetin you wan discover today? 🇳🇬`
      : `Hey! I'm your Digital Twin (${selectedPersona.id.slice(0, 8)}). What would you like to discover today?`;

    setChatHistory([{ id: Date.now() + "-" + Math.random(), role: "agent", text: greeting }]);
    setMessages([]);
    setRecommendations([]);
    setError(null);
  }, [selectedPersona?.id]);

  // ── Auto-scroll to latest message ─────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  // ── Send a message ───────────────────────────────────────────
  async function handleSend(overrideText) {
    const text = overrideText || inputValue.trim();
    if (!text || !selectedPersona) return;

    setChatHistory((prev) => [...prev, { id: Date.now() + "-" + Math.random(), role: "user", text }]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    // Create a placeholder bubble for the agent response
    const agentMessageId = Date.now() + "-" + Math.random();
    setChatHistory((prev) => [
      ...prev,
      { id: agentMessageId, role: "agent", text: "" },
    ]);
    
    let accumulatedReply = "";

    try {
      await sendMessageStream(
        selectedPersona.id,
        newMessages,
        5, // top_k
        isNaija, // naijaMode
        (chunk) => {
          accumulatedReply += chunk;
          setChatHistory((prev) => 
            prev.map(msg => 
              msg.id === agentMessageId ? { ...msg, text: accumulatedReply } : msg
            )
          );
        },
        (recs) => {
          if (recs?.length > 0) {
            setRecommendations(recs);
          }
        }
      );

      // Append to the real conversation history for future turns
      setMessages((prev) => [...prev, { role: "assistant", content: accumulatedReply }]);

    } catch (err) {
      setError(`Chat error: ${err.message}`);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  // Send on Enter key
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Container maxW="1280px" py={6} px={{ base: 4, md: 8 }}>

      {/* ── Page Title ──────────────────────────────────────── */}
      <HStack justify="space-between" align="center" mb={4}>
        <HStack spacing={3}>
          <Heading size="md">Twin Chat</Heading>
          <Badge colorScheme="brand" borderRadius="full" px={3}>
            {selectedPersona?.id?.slice(0, 8)?.toUpperCase()}
          </Badge>
          {isNaija && (
            <Badge colorScheme="orange" borderRadius="full" px={3}>
              🇳🇬 Naija
            </Badge>
          )}
        </HStack>
        <Text fontSize="xs" color={metaColor}>
          Stateless · {messages.length} turns
        </Text>
      </HStack>

      {/* ── Quick Action Buttons ─────────────────────────────── */}
      <HStack spacing={2} wrap="wrap" mb={4}>
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            size="xs"
            variant="outline"
            borderRadius="full"
            colorScheme="gray"
            onClick={() => handleSend(action.message)}
            isDisabled={isLoading || !selectedPersona}
            _hover={{ colorScheme: "brand", borderColor: "brand.500" }}
          >
            {action.label}
          </Button>
        ))}
      </HStack>

      {/* ── Error Banner ─────────────────────────────────────── */}
      {error && (
        <Alert status="error" mb={4} borderRadius="xl">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* ── Main Layout: Chat + Sidebar ──────────────────────── */}
      <HStack align="start" spacing={4}>

        {/* ── LEFT: Chat Window ─────────────────────────────── */}
        <Box flex={1} display="flex" flexDirection="column">

          {/* Messages area */}
          <Box
            bg={chatBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            p={4}
            h="calc(100vh - 340px)"
            minH="380px"
            overflowY="auto"
            mb={3}
          >
            <VStack align="stretch" spacing={3}>
              {chatHistory.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  userBg={userBubbleBg}
                  agentBg={agentBubbleBg}
                  agentTextColor={agentTextColor}
                />
              ))}

              {/* Typing indicator while waiting */}
              {isLoading && (
                <Flex align="center" gap={2} pl={1}>
                  <Spinner size="xs" color="brand.500" />
                  <Text fontSize="xs" color={metaColor}>
                    Your twin is thinking…
                  </Text>
                </Flex>
              )}

              {/* Invisible anchor to scroll to */}
              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          {/* Input row */}
          <HStack spacing={2}>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isNaija
                  ? "Tell your twin wetin you want…"
                  : "Ask for a recommendation…"
              }
              borderRadius="xl"
              size="md"
              isDisabled={isLoading || !selectedPersona}
              _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #0F4C5C" }}
            />
            <Button
              colorScheme="brand"
              borderRadius="xl"
              px={6}
              onClick={() => handleSend()}
              isLoading={isLoading}
              isDisabled={!inputValue.trim() || !selectedPersona}
            >
              Send
            </Button>
          </HStack>
        </Box>

        {/* ── RIGHT: Recommendation Sidebar ─────────────────── */}
        <Box
          w="260px"
          flexShrink={0}
          display={{ base: "none", lg: "block" }}
        >
          <Box
            bg={sidebarBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            p={4}
            h="calc(100vh - 340px)"
            minH="380px"
            overflowY="auto"
          >
            <Text
              fontWeight="600"
              fontSize="xs"
              color={metaColor}
              textTransform="uppercase"
              letterSpacing="0.5px"
              mb={3}
            >
              Recommendations
            </Text>

            {recommendations.length === 0 ? (
              <VStack spacing={2} pt={4}>
                <Text fontSize="2xl"></Text>
                <Text fontSize="xs" color={metaColor} textAlign="center">
                  Send a message to see personalised recommendations here
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3}>
                {recommendations.map((rec) => (
                  <RecommendationCard key={rec.rank} rec={rec} />
                ))}
              </VStack>
            )}
          </Box>
        </Box>

      </HStack>
    </Container>
  );
}

// ── Sub-component: single chat bubble ────────────────────────────
function ChatBubble({ message, userBg, agentBg, agentTextColor }) {
  const isUser = message.role === "user";

  return (
    <Flex justify={isUser ? "flex-end" : "flex-start"}>
      <Box
        maxW="78%"
        bg={isUser ? userBg : agentBg}
        color={isUser ? "white" : agentTextColor}
        borderRadius={isUser ? "2xl 4px 2xl 2xl" : "4px 2xl 2xl 2xl"}
        px={4}
        py={3}
        fontSize="sm"
        lineHeight="1.7"
        boxShadow="sm"
      >
        {message.text}
      </Box>
    </Flex>
  );
}