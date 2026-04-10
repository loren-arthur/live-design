import { Box, Button, Container, Flex, Heading, Section, Text, Badge } from "@radix-ui/themes";

export default function Hero() {
  return (
    <Section size="4" style={{ background: "var(--accent-2)" }}>
      <Container size="3">
        <Flex direction="column" align="center" gap="5" py="6">
          <Badge color="indigo" size="2" variant="soft">
            Now in Beta
          </Badge>
          <Heading size="9" align="center" style={{ maxWidth: "32rem" }}>
            Ship products penguins love
          </Heading>
          <Text size="5" color="gray" align="center" style={{ maxWidth: "36rem" }}>
            Launchpad gives your team the analytics, feedback tools, and deployment
            pipeline to go from idea to production — faster than ever.
          </Text>
          <Flex gap="3" mt="2">
            <Button size="4" asChild>
              <a href="#pricing">Get Started Free</a>
            </Button>
            <Button size="4" variant="soft" asChild>
              <a href="#features">See Features</a>
            </Button>
          </Flex>
        </Flex>
      </Container>
    </Section>
  );
}
