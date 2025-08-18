'use client';

import {
  Box,
  Container,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  Link,
  Badge,
  Card,
  Stat,
  Group,
  Separator,
  IconButton,
} from '@chakra-ui/react';
import { ColorModeButton } from '@/components/ui/color-mode';
import { FormButton } from '@/components';
import { FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { MdSpeed, MdSettings, MdSecurity } from 'react-icons/md';

export default function Home() {
  return (
    <Box minH="100vh">
      {/* Navigation */}
      <Box
        as="nav"
        position="sticky"
        top={0}
        zIndex={10}
        backdropFilter="blur(10px)"
        bg={{ base: 'bg.default/80', _dark: 'bg.default/80' }}
        borderBottomWidth="1px"
      >
        <Container maxW="7xl" py={4}>
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={2}>
              <Box
                w={10}
                h={10}
                bgGradient="to-br"
                gradientFrom="brand.500"
                gradientTo="brand.700"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontWeight="bold" fontSize="xl">
                  IW
                </Text>
              </Box>
              <Heading size="lg">IWE Web</Heading>
            </Flex>

            <Flex align="center" gap={6}>
              <Link href="#features" color="fg.muted" _hover={{ color: 'brand.600' }}>
                Features
              </Link>
              <Link href="#about" color="fg.muted" _hover={{ color: 'brand.600' }}>
                About
              </Link>
              <Link href="#contact" color="fg.muted" _hover={{ color: 'brand.600' }}>
                Contact
              </Link>
              <ColorModeButton />
              <FormButton variant="primary">Get Started</FormButton>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxW="7xl" py={20}>
        <Stack gap={8} align="center" textAlign="center">
          <Badge bg="brand.100" color="brand.700" size="lg" variant="subtle">
            🚀 Next.js + Chakra UI
          </Badge>

          <Heading size="5xl" fontWeight="bold">
            Welcome to{' '}
            <Text
              as="span"
              bgGradient="to-r"
              gradientFrom="brand.500"
              gradientTo="brand.700"
              bgClip="text"
            >
              IWE Web
            </Text>
          </Heading>

          <Text fontSize="xl" color="fg.muted" maxW="2xl">
            Build modern, scalable web applications with Next.js and Chakra UI. Experience the power
            of React with server-side rendering and a beautiful component library.
          </Text>

          <Group>
            <FormButton size="lg" variant="primary">
              Start Building
            </FormButton>
            <FormButton size="lg" variant="outline">
              View Documentation
            </FormButton>
          </Group>
        </Stack>
      </Container>

      {/* Features Section */}
      <Box bg="bg.subtle" py={20}>
        <Container maxW="7xl">
          <Stack gap={12}>
            <Stack gap={4} textAlign="center">
              <Heading size="3xl">Why Choose Our Platform?</Heading>
              <Text fontSize="lg" color="fg.muted">
                Everything you need to build amazing web applications
              </Text>
            </Stack>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
              <Card.Root>
                <Card.Body gap={4}>
                  <Flex
                    w={14}
                    h={14}
                    bg="brand.100"
                    _dark={{ bg: 'brand.900' }}
                    borderRadius="lg"
                    align="center"
                    justify="center"
                  >
                    <Icon color="brand.600">
                      <MdSpeed />
                    </Icon>
                  </Flex>
                  <Stack gap={2}>
                    <Heading size="lg">Lightning Fast</Heading>
                    <Text color="fg.muted">
                      Optimized for performance with automatic code splitting and intelligent
                      prefetching.
                    </Text>
                  </Stack>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Body gap={4}>
                  <Flex
                    w={14}
                    h={14}
                    bg="secondary.100"
                    _dark={{ bg: 'secondary.900' }}
                    borderRadius="lg"
                    align="center"
                    justify="center"
                  >
                    <Icon color="secondary.600">
                      <MdSettings />
                    </Icon>
                  </Flex>
                  <Stack gap={2}>
                    <Heading size="lg">Fully Customizable</Heading>
                    <Text color="fg.muted">
                      Complete control over your application with flexible configuration options.
                    </Text>
                  </Stack>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Body gap={4}>
                  <Flex
                    w={14}
                    h={14}
                    bg="accent.100"
                    _dark={{ bg: 'accent.900' }}
                    borderRadius="lg"
                    align="center"
                    justify="center"
                  >
                    <Icon color="accent.600">
                      <MdSecurity />
                    </Icon>
                  </Flex>
                  <Stack gap={2}>
                    <Heading size="lg">Secure by Default</Heading>
                    <Text color="fg.muted">
                      Built-in security features with automatic HTTPS and protection against
                      vulnerabilities.
                    </Text>
                  </Stack>
                </Card.Body>
              </Card.Root>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box bgGradient="to-r" gradientFrom="brand.600" gradientTo="brand.800" color="white" py={20}>
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={8}>
            <Stat.Root textAlign="center">
              <Stat.Label color="brand.100">Downloads</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">
                10M+
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center">
              <Stat.Label color="brand.100">Active Projects</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">
                50K+
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center">
              <Stat.Label color="brand.100">Uptime</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">
                99.9%
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center">
              <Stat.Label color="brand.100">Support</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">
                24/7
              </Stat.ValueText>
            </Stat.Root>
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxW="4xl" py={20}>
        <Stack gap={8} align="center" textAlign="center">
          <Heading size="3xl">Ready to Build Something Amazing?</Heading>
          <Text fontSize="xl" color="fg.muted">
            Join thousands of developers who are already building with our platform.
          </Text>
          <Group>
            <FormButton size="lg" variant="primary">
              Get Started Free
            </FormButton>
            <FormButton size="lg" variant="outline">
              Schedule Demo
            </FormButton>
          </Group>
        </Stack>
      </Container>

      {/* Footer */}
      <Box borderTopWidth="1px" py={12}>
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 1, md: 4 }} gap={8}>
            <Stack gap={4}>
              <Flex align="center" gap={2}>
                <Box
                  w={10}
                  h={10}
                  bgGradient="to-br"
                  gradientFrom="brand.500"
                  gradientTo="brand.700"
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontWeight="bold" fontSize="xl">
                    IW
                  </Text>
                </Box>
                <Heading size="lg">IWE Web</Heading>
              </Flex>
              <Text color="fg.muted">
                Building the future of web development, one component at a time.
              </Text>
            </Stack>

            <Stack gap={2}>
              <Heading size="md">Product</Heading>
              <Link color="fg.muted" _hover={{ color: 'brand.600' }}>
                Features
              </Link>
              <Link color="fg.muted" _hover={{ color: 'brand.600' }}>
                Pricing
              </Link>
              <Link color="fg.muted" _hover={{ color: 'brand.600' }}>
                Documentation
              </Link>
            </Stack>

            <Stack gap={2}>
              <Heading size="md">Company</Heading>
              <Link color="fg.muted" _hover={{ color: 'brand.600' }}>
                About
              </Link>
              <Link color="fg.muted" _hover={{ color: 'brand.600' }}>
                Blog
              </Link>
              <Link color="fg.muted" _hover={{ color: 'brand.600' }}>
                Careers
              </Link>
            </Stack>

            <Stack gap={2}>
              <Heading size="md">Connect</Heading>
              <Group>
                <IconButton aria-label="GitHub" size="sm" variant="ghost">
                  <FaGithub />
                </IconButton>
                <IconButton aria-label="Twitter" size="sm" variant="ghost">
                  <FaTwitter />
                </IconButton>
                <IconButton aria-label="LinkedIn" size="sm" variant="ghost">
                  <FaLinkedin />
                </IconButton>
              </Group>
            </Stack>
          </SimpleGrid>

          <Separator my={8} />

          <Text textAlign="center" color="fg.muted">
            © 2024 IWE Web. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
