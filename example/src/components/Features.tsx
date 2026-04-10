import { Box, Card, Container, Grid, Heading, Section, Text } from "@radix-ui/themes";

const features = [
  {
    icon: "📊",
    title: "Real-time Analytics",
    description:
      "Track every metric that matters. Funnel analysis, cohort reports, and live dashboards — all in one place.",
  },
  {
    icon: "🚀",
    title: "One-click Deploy",
    description:
      "Push to production with confidence. Automated rollbacks, canary releases, and zero-downtime deployments.",
  },
  {
    icon: "🛡️",
    title: "Built-in Security",
    description:
      "SOC2-ready out of the box. Role-based access, audit logs, and encrypted data at rest and in transit.",
  },
  {
    icon: "💬",
    title: "User Feedback",
    description:
      "Collect and organize user feedback directly in your workflow. Prioritize what your users actually want.",
  },
  {
    icon: "⚡",
    title: "Edge Functions",
    description:
      "Run serverless code at the edge with sub-millisecond cold starts. Deploy globally in seconds.",
  },
  {
    icon: "🔄",
    title: "CI/CD Pipelines",
    description:
      "Automate your entire build, test, and release workflow. Integrate with GitHub, GitLab, and Bitbucket.",
  },
];

export default function Features() {
  return (
    <Section size="4" id="features">
      <Container size="4">
        <Box mb="7">
          <Text size="2" weight="bold" color="indigo" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Features
          </Text>
          <Heading size="8" mt="2" mb="3">
            Everything you need to launch
          </Heading>
          <Text size="4" color="gray">
            A complete toolkit for modern product teams. No glue code required.
          </Text>
        </Box>
        <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
          {features.map((f) => (
            <Card key={f.title} size="3">
              <Box mb="2" style={{ fontSize: "2rem" }}>{f.icon}</Box>
              <Heading size="4" mb="2">{f.title}</Heading>
              <Text size="2" color="gray">{f.description}</Text>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
