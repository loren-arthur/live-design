import { Badge, Box, Button, Card, Container, Flex, Heading, Section, Text } from "@radix-ui/themes";

interface PlanProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

function PlanCard({ name, price, period, description, features, cta, highlighted }: PlanProps) {
  return (
    <Card size="4" variant={highlighted ? "classic" : "surface"} style={{ flex: "1 1 18rem", maxWidth: "24rem", position: "relative" }}>
      {highlighted && (
        <Box style={{ position: "absolute", top: "-0.75rem", left: "50%", transform: "translateX(-50%)" }}>
          <Badge color="indigo" size="2">Most Popular</Badge>
        </Box>
      )}
      <Heading size="5" mb="1">{name}</Heading>
      <Text size="2" color="gray" mb="4" as="p">{description}</Text>
      <Flex align="baseline" gap="1" mb="5">
        <Text size="9" weight="bold">{price}</Text>
        <Text size="2" color="gray">{period}</Text>
      </Flex>
      <Flex direction="column" gap="2" mb="5">
        {features.map((feature) => (
          <Flex key={feature} gap="2" align="start">
            <Text color="indigo" weight="bold">✓</Text>
            <Text size="2">{feature}</Text>
          </Flex>
        ))}
      </Flex>
      <Button size="3" variant={highlighted ? "solid" : "soft"} style={{ width: "100%" }}>{cta}</Button>
    </Card>
  );
}

export default function Pricing() {
  return (
    <Section size="4" id="pricing" style={{ background: "var(--gray-2)" }}>
      <Container size="4">
        <Box mb="7" style={{ textAlign: "center" }}>
          <Text size="2" weight="bold" color="indigo" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Pricing
          </Text>
          <Heading size="8" mt="2" mb="3">Start free, scale when ready</Heading>
          <Text size="4" color="gray">No credit card required. Upgrade when your team needs more.</Text>
        </Box>
        <Flex gap="5" wrap="wrap" justify="center">
          <PlanCard
            name="Free"
            price="$0"
            period="/month"
            description="For individuals and small side projects."
            features={[
              "Up to 3 projects",
              "1,000 events / month",
              "Community support",
              "Basic analytics",
              "1 team member",
            ]}
            cta="Get Started"
          />
          <PlanCard
            name="Pro"
            price="$29"
            period="/month"
            description="For teams shipping real products."
            features={[
              "Unlimited projects",
              "100,000 events / month",
              "Priority support",
              "Advanced analytics",
              "Unlimited team members",
              "Custom domains",
              "CI/CD integrations",
            ]}
            cta="Start Free Trial"
            highlighted
          />
        </Flex>
      </Container>
    </Section>
  );
}
