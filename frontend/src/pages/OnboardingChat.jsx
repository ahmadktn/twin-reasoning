import { useState, useRef, useEffect } from "react";
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Heading,
  Flex,
  useColorModeValue,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { createPersona } from "../api/personas";
import { useApp } from "../context/AppContext";

const QUESTIONS = [
  "Welcome! Let's build your Digital Twin. To start, what kind of beauty products do you usually buy?",
  "Awesome! Do you prefer luxury brands or are you more into finding drugstore gems?",
  "How important is eco-friendly or cruelty-free packaging to you?",
  "What's your skin type and what is your main skin concern?",
  "Finally, how critical are you when reviewing products? Are you an easy 5-star rater or very strict?",
];

export default function OnboardingChat() {
  const { selectPersona } = useApp();
  const [messages, setMessages] = useState([{ id: 1, role: "agent", text: QUESTIONS[0] }]);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const toast = useToast();
  
  const messagesEndRef = useRef(null);

  const bg = useColorModeValue("#F9F9FB", "#0d0d0d");
  const chatBg = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const userBubbleBg = "#0F4C5C";
  const agentBubbleBg = useColorModeValue("gray.100", "gray.700");
  const agentTextColor = useColorModeValue("gray.800", "gray.100");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    const userText = inputValue.trim();
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: userText }]);
    setInputValue("");
    setIsTyping(true);
    
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: Date.now(), role: "agent", text: QUESTIONS[step + 1] }]);
        setStep(step + 1);
        setIsTyping(false);
      }, 1000);
    } else {
      setTimeout(async () => {
        setMessages((prev) => [
          ...prev, 
          { id: Date.now(), role: "agent", text: "Thanks! I've learned enough. Setting up your Digital Twin now..." }
        ]);
        
        try {
          // Combine all user answers to form a pseudo review_style for the backend
          const allUserAnswers = messages
            .filter((m) => m.role === "user")
            .map((m) => m.text)
            .join(" ");
          
          const finalStyle = allUserAnswers + " " + userText;
          
          const newPersona = await createPersona(finalStyle);
          
          // Toast success
          toast({
            title: "Digital Twin Created!",
            description: "Your personalized AI agent is ready.",
            status: "success",
            duration: 4000,
            isClosable: true,
            position: "top",
          });
          
          // Wait a brief moment so user can read the final message
          setTimeout(() => {
            selectPersona(newPersona);
          }, 1500);
        } catch (err) {
          console.error("Failed to create profile", err);
          toast({
            title: "Error creating profile",
            description: err.message,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), role: "agent", text: "Oops, something went wrong saving your profile." }
          ]);
          setIsTyping(false);
        }
      }, 1000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box minH="100vh" bg={bg} py={8}>
      <Container maxW="800px">
        <VStack spacing={4} align="stretch">
          <Box textAlign="center" mb={4}>
            <Heading size="lg">Create Your Digital Twin</Heading>
            <Text color="gray.500" mt={2}>Answer a few questions so we can learn your preferences.</Text>
          </Box>
          
          <Box
            bg={chatBg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            p={4}
            h="60vh"
            overflowY="auto"
          >
            <VStack align="stretch" spacing={3}>
              {messages.map((msg) => (
                <Flex key={msg.id} justify={msg.role === "user" ? "flex-end" : "flex-start"}>
                  <Box
                    maxW="78%"
                    bg={msg.role === "user" ? userBubbleBg : agentBubbleBg}
                    color={msg.role === "user" ? "white" : agentTextColor}
                    borderRadius={msg.role === "user" ? "2xl 4px 2xl 2xl" : "4px 2xl 2xl 2xl"}
                    px={4}
                    py={3}
                    fontSize="sm"
                    lineHeight="1.7"
                    boxShadow="sm"
                  >
                    {msg.text}
                  </Box>
                </Flex>
              ))}
              
              {isTyping && (
                <Flex justify="flex-start">
                  <Box
                    bg={agentBubbleBg}
                    borderRadius="4px 2xl 2xl 2xl"
                    px={4}
                    py={3}
                  >
                    <Spinner size="xs" color="brand.500" />
                  </Box>
                </Flex>
              )}
              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          <HStack spacing={2}>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              borderRadius="xl"
              size="md"
              isDisabled={isTyping}
              _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #0F4C5C" }}
            />
            <Button
              colorScheme="brand"
              borderRadius="xl"
              px={6}
              onClick={handleSend}
              isLoading={isTyping}
              isDisabled={!inputValue.trim()}
            >
              Send
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}
