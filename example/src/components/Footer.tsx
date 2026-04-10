import { Box, Container, Flex, Heading, Link, Section, Separator, Text } from "@radix-ui/themes";

const columns = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Docs"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Press"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "GDPR"],
  },
];

export default function Footer() {
  return (
    <Section size="3" asChild>
      <footer>
        <Container size="4">
          <Flex wrap="wrap" gap="6" justify="between" mb="6">
            <Box style={{ flex: "1 1 16rem" }}>
              <Heading size="5" mb="2">
                <Text color="indigo">Launch</Text>pad
              </Heading>
              <Text size="2" color="gray" style={{ maxWidth: "20rem" }}>
                The modern platform for product teams who move fast and ship with confidence.
              </Text>
            </Box>
            {columns.map((col) => (
              <Box key={col.title} style={{ minWidth: "8rem" }}>
                <Text size="1" weight="bold" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {col.title}
                </Text>
                <Flex direction="column" gap="2">
                  {col.links.map((link) => (
                    <Link key={link} href="#" size="2" color="gray">
                      {link}
                    </Link>
                  ))}
                </Flex>
              </Box>
            ))}
          </Flex>
          <Separator size="4" />
          <Box mt="4" style={{ textAlign: "center" }}>
            <Text size="1" color="gray">
              © 2026 Launchpad. All rights reserved. Built with live-design.
            </Text>
          </Box>
        </Container>
      </footer>
    </Section>
  );
}
