// src/pages/EvalPanel.jsx
// ─────────────────────────────────────────────────────────────────
// Evaluation Panel — Page 5 (route: /eval)
//
// Hidden from main navigation. Password-gated for judges only.
// Shows AI performance metrics with charts.
// Password: alterego2026
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  Container,
  Heading,
  Text,
  SimpleGrid,
  Box,
  VStack,
  HStack,
  Badge,
  Input,
  Button,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { fetchMetrics } from "../api/metrics";

const JUDGE_PASSWORD = "alterego2026";

export default function EvalPanel() {
  const [password, setPassword]       = useState("");
  const [unlocked, setUnlocked]       = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);

  const cardBg      = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const metaColor   = useColorModeValue("gray.500", "gray.400");

  // ── Metrics state — must be declared unconditionally before any early return
  const [metricsData, setMetricsData]       = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    setMetricsLoading(true);
    fetchMetrics()
      .then(setMetricsData)
      .catch(() => setMetricsData(null))
      .finally(() => setMetricsLoading(false));
  }, [unlocked]);

  function handleUnlock() {
    if (password === JUDGE_PASSWORD) {
      setUnlocked(true);
      setWrongPassword(false);
    } else {
      setWrongPassword(true);
      setPassword("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      handleUnlock();
    }
  }

  // ── Locked View (Password Gate) ────────────────────────────────
  if (!unlocked) {
    return (
      <Container maxW="400px" py={16} px={{ base: 4, md: 8 }}>
        <VStack spacing={6}>
          <VStack spacing={1} textAlign="center">
            <Heading size="md"> Judge Access</Heading>
            <Text color={metaColor} fontSize="sm">
              Enter the evaluation panel password
            </Text>
          </VStack>

          {wrongPassword && (
            <Alert status="error" borderRadius="xl" variant="solid">
              <AlertIcon />
              Incorrect password
            </Alert>
          )}

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            borderRadius="xl"
            size="md"
            _focus={{ borderColor: "brand.500" }}
          />

          <Button
            colorScheme="brand"
            w="100%"
            borderRadius="xl"
            onClick={handleUnlock}
          >
            Unlock Eval Panel
          </Button>
        </VStack>
      </Container>
    );
  }


  if (metricsLoading) {
    return (
      <Container maxW="1200px" py={16} textAlign="center">
        <Box fontSize="2xl">⏳</Box>
        <Text mt={2} fontSize="sm" color={metaColor}>Loading metrics…</Text>
      </Container>
    );
  }

  // Adapt real backend metrics shape to chart format
  const rm = metricsData?.review_metrics || {};
  const ratingM = metricsData?.rating_metrics || {};

  // Format data for Recharts bar charts
  const trackAData = [
    { name: "ROUGE-L",   actual: rm.avg_rouge_l ?? 0,         target: 0.3 },
    { name: "Naija %",   actual: (rm.has_nigerian_phrases ?? 0) / 100, target: 0.5 },
    { name: "RMSE",      actual: ratingM.rmse ?? 0,            target: 0.8 },
  ];

  const trackBData = [
    { name: "Success Rate", actual: ratingM.success_rate ?? 0, target: 0.7 },
    { name: "Avg Words/100", actual: Math.min((rm.avg_word_count ?? 0) / 100, 1), target: 0.8 },
  ];

  return (
    <Container maxW="1200px" py={8} px={{ base: 4, md: 8 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <HStack justify="space-between" align="center" mb={8}>
        <VStack align="start" spacing={1}>
          <HStack spacing={3} align="center">
            <Heading size="lg">Evaluation Panel</Heading>
            <Badge colorScheme="purple" borderRadius="full" px={3}>
              Judge Mode
            </Badge>
          </HStack>
          <Text color={metaColor} fontSize="sm">
            AI performance metrics for Track A (Review Simulation) and Track B
            (Recommendations)
          </Text>
        </VStack>
        <Button
          size="sm"
          variant="outline"
          colorScheme="red"
          onClick={() => setUnlocked(false)}
          borderRadius="xl"
        >
          Lock
        </Button>
      </HStack>

      {/* ── Summary Info ────────────────────────────────────── */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={8}>
        <InfoCard
          label="Track A Samples"
          value={metricsData?.summary?.find(s => s.Metric === "Total Predictions Generated")?.Value ?? "—"}
          description="Total predictions generated"
          icon=""
        />
        <InfoCard
          label="Track B Sessions"
          value={metricsData?.summary?.find(s => s.Metric === "Unique Users Tested")?.Value ?? "—"}
          description="Unique users tested"
          icon=""
        />
      </SimpleGrid>

      {/* ── Metric Charts ───────────────────────────────────── */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>

        {/* Track A Metrics */}
        <MetricSection
          title="Track A — Review Simulation"
          description="How well the AI generates personalised reviews"
          data={trackAData}
          subtitle="Higher is better (except RMSE, lower is better)"
        />

        {/* Track B Metrics */}
        <MetricSection
          title="Track B — Recommendations"
          description="How well the AI ranks items for users"
          data={trackBData}
          subtitle="Higher is better"
        />

      </SimpleGrid>

      {/* ── Footer Note ─────────────────────────────────────– */}
      <Box mt={8} p={4} bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
        <Text fontSize="xs" color={metaColor} lineHeight="1.6">
          <strong>Green bars:</strong> Actual performance |{" "}
          <strong>Grey bars:</strong> Target threshold | The system passes if
          actual meets or exceeds target on all metrics.
        </Text>
      </Box>

    </Container>
  );
}

// ── Sub-component: metric section with chart ────────────────────
function MetricSection({ title, description, data, subtitle }) {
  const cardBg = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const metaColor = useColorModeValue("gray.500", "gray.400");

  return (
    <Box
      bg={cardBg}
      borderRadius="2xl"
      border="1px solid"
      borderColor={borderColor}
      p={6}
    >
      <VStack align="start" spacing={3} mb={4}>
        <Heading size="sm">{title}</Heading>
        <Text fontSize="xs" color={metaColor}>
          {description}
        </Text>
      </VStack>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis fontSize={12} domain={[0, 1]} />
          <Tooltip
            contentStyle={{
              background: "#1e1e1e",
              border: "1px solid #444",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => value.toFixed(3)}
          />
          <Legend />
          {/* Green bar for actual scores */}
          <Bar dataKey="actual" name="Actual" fill="#0F4C5C" radius={[4, 4, 0, 0]} />
          {/* Grey bar for target threshold */}
          <Bar dataKey="target" name="Target" fill="#CBD5E0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Subtitle */}
      <Text fontSize="10px" color={metaColor} mt={3}>
        {subtitle}
      </Text>
    </Box>
  );
}

// ── Sub-component: info card ────────────────────────────────────
function InfoCard({ label, value, description, icon }) {
  const cardBg = useColorModeValue("white", "#1E1E1E");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const metaColor = useColorModeValue("gray.500", "gray.400");

  return (
    <Box
      bg={cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      p={4}
    >
      <HStack justify="space-between" align="start">
        <VStack align="start" spacing={1}>
          <Text fontSize="sm" color={metaColor} textTransform="uppercase">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="700">
            {value}
          </Text>
          <Text fontSize="xs" color={metaColor}>
            {description}
          </Text>
        </VStack>
        <Text fontSize="2xl">{icon}</Text>
      </HStack>
    </Box>
  );
}