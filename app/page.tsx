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
        <Container maxW="6xl" py={4} mx="auto">
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
      <Container maxW="6xl" py={{ base: 16, md: 24, lg: 32 }} mx="auto">
        <Stack gap={{ base: 6, md: 8, lg: 10 }} align="center" textAlign="center">
          <Badge bg="brand.100" color="brand.700" size="lg" variant="subtle" px={4} py={2}>
            🚀 Next.js + Chakra UI
          </Badge>

          <Heading
            size={{ base: '3xl', md: '4xl', lg: '5xl' }}
            fontWeight="bold"
            lineHeight="shorter"
            maxW="4xl"
          >
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

          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            color="fg.muted"
            maxW="3xl"
            lineHeight="relaxed"
          >
            Build modern, scalable web applications with Next.js and Chakra UI. Experience the power
            of React with server-side rendering and a beautiful component library.
          </Text>

          <Group gap={{ base: 4, md: 6 }} mt={{ base: 4, md: 6 }}>
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
      <Box bg="bg.subtle" py={{ base: 16, md: 20, lg: 24 }}>
        <Container maxW="6xl" mx="auto">
          <Stack gap={{ base: 10, md: 12, lg: 16 }}>
            <Stack gap={{ base: 3, md: 4 }} textAlign="center" maxW="3xl" mx="auto">
              <Heading size={{ base: '2xl', md: '3xl' }} lineHeight="shorter">
                Why Choose Our Platform?
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" lineHeight="relaxed">
                Everything you need to build amazing web applications
              </Text>
            </Stack>

            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              gap={{ base: 6, md: 8 }}
              placeItems="center"
            >
              <Card.Root
                w="full"
                maxW="sm"
                bg="bg.default"
                shadow="md"
                borderRadius="xl"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Card.Body gap={6} p={8} textAlign="center">
                  <Flex
                    w={16}
                    h={16}
                    bg="brand.100"
                    _dark={{ bg: 'brand.900' }}
                    borderRadius="xl"
                    align="center"
                    justify="center"
                    mx="auto"
                  >
                    <Icon color="brand.600" boxSize={8}>
                      <MdSpeed />
                    </Icon>
                  </Flex>
                  <Stack gap={3}>
                    <Heading size="lg" lineHeight="shorter">
                      Lightning Fast
                    </Heading>
                    <Text color="fg.muted" lineHeight="relaxed">
                      Optimized for performance with automatic code splitting and intelligent
                      prefetching.
                    </Text>
                  </Stack>
                </Card.Body>
              </Card.Root>

              <Card.Root
                w="full"
                maxW="sm"
                bg="bg.default"
                shadow="md"
                borderRadius="xl"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Card.Body gap={6} p={8} textAlign="center">
                  <Flex
                    w={16}
                    h={16}
                    bg="secondary.100"
                    _dark={{ bg: 'secondary.900' }}
                    borderRadius="xl"
                    align="center"
                    justify="center"
                    mx="auto"
                  >
                    <Icon color="secondary.600" boxSize={8}>
                      <MdSettings />
                    </Icon>
                  </Flex>
                  <Stack gap={3}>
                    <Heading size="lg" lineHeight="shorter">
                      Fully Customizable
                    </Heading>
                    <Text color="fg.muted" lineHeight="relaxed">
                      Complete control over your application with flexible configuration options.
                    </Text>
                  </Stack>
                </Card.Body>
              </Card.Root>

              <Card.Root
                w="full"
                maxW="sm"
                bg="bg.default"
                shadow="md"
                borderRadius="xl"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Card.Body gap={6} p={8} textAlign="center">
                  <Flex
                    w={16}
                    h={16}
                    bg="accent.100"
                    _dark={{ bg: 'accent.900' }}
                    borderRadius="xl"
                    align="center"
                    justify="center"
                    mx="auto"
                  >
                    <Icon color="accent.600" boxSize={8}>
                      <MdSecurity />
                    </Icon>
                  </Flex>
                  <Stack gap={3}>
                    <Heading size="lg" lineHeight="shorter">
                      Secure by Default
                    </Heading>
                    <Text color="fg.muted" lineHeight="relaxed">
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
      <Box
        bgGradient="to-r"
        gradientFrom="brand.600"
        gradientTo="brand.800"
        color="white"
        py={{ base: 16, md: 20, lg: 24 }}
      >
        <Container maxW="6xl" mx="auto">
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={{ base: 8, md: 12 }} placeItems="center">
            <Stat.Root textAlign="center" maxW="200px">
              <Stat.Label color="brand.100" fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium">
                Downloads
              </Stat.Label>
              <Stat.ValueText
                fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                fontWeight="bold"
                lineHeight="none"
              >
                10M+
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center" maxW="200px">
              <Stat.Label color="brand.100" fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium">
                Active Projects
              </Stat.Label>
              <Stat.ValueText
                fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                fontWeight="bold"
                lineHeight="none"
              >
                50K+
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center" maxW="200px">
              <Stat.Label color="brand.100" fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium">
                Uptime
              </Stat.Label>
              <Stat.ValueText
                fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                fontWeight="bold"
                lineHeight="none"
              >
                99.9%
              </Stat.ValueText>
            </Stat.Root>

            <Stat.Root textAlign="center" maxW="200px">
              <Stat.Label color="brand.100" fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium">
                Support
              </Stat.Label>
              <Stat.ValueText
                fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                fontWeight="bold"
                lineHeight="none"
              >
                24/7
              </Stat.ValueText>
            </Stat.Root>
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxW="4xl" py={{ base: 16, md: 20, lg: 24 }} mx="auto">
        <Stack gap={{ base: 6, md: 8 }} align="center" textAlign="center">
          <Heading size={{ base: '2xl', md: '3xl' }} lineHeight="shorter" maxW="3xl">
            Ready to Build Something Amazing?
          </Heading>
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            color="fg.muted"
            lineHeight="relaxed"
            maxW="2xl"
          >
            Join thousands of developers who are already building with our platform.
          </Text>
          <Group gap={{ base: 4, md: 6 }} mt={{ base: 4, md: 6 }}>
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
      <Box borderTopWidth="1px" py={{ base: 12, md: 16 }} bg="bg.subtle">
        <Container maxW="6xl" mx="auto">
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={{ base: 8, md: 12 }}>
            <Stack gap={4} gridColumn={{ base: '1', sm: '1 / -1', md: '1' }}>
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
              <Text color="fg.muted" lineHeight="relaxed" maxW="sm">
                Building the future of web development, one component at a time.
              </Text>
            </Stack>

            <Stack gap={3}>
              <Heading size="md" color="fg.default">
                Product
              </Heading>
              <Stack gap={2}>
                <Link color="fg.muted" _hover={{ color: 'brand.600' }} fontSize="sm">
                  Features
                </Link>
                <Link color="fg.muted" _hover={{ color: 'brand.600' }} fontSize="sm">
                  Pricing
                </Link>
                <Link color="fg.muted" _hover={{ color: 'brand.600' }} fontSize="sm">
                  Documentation
                </Link>
              </Stack>
            </Stack>

            <Stack gap={3}>
              <Heading size="md" color="fg.default">
                Company
              </Heading>
              <Stack gap={2}>
                <Link color="fg.muted" _hover={{ color: 'brand.600' }} fontSize="sm">
                  About
                </Link>
                <Link color="fg.muted" _hover={{ color: 'brand.600' }} fontSize="sm">
                  Blog
                </Link>
                <Link color="fg.muted" _hover={{ color: 'brand.600' }} fontSize="sm">
                  Careers
                </Link>
              </Stack>
            </Stack>

            <Stack gap={3}>
              <Heading size="md" color="fg.default">
                Connect
              </Heading>
              <Group gap={1}>
                <IconButton
                  aria-label="GitHub"
                  size="sm"
                  variant="ghost"
                  color="fg.muted"
                  _hover={{ color: 'brand.600' }}
                >
                  <FaGithub />
                </IconButton>
                <IconButton
                  aria-label="Twitter"
                  size="sm"
                  variant="ghost"
                  color="fg.muted"
                  _hover={{ color: 'brand.600' }}
                >
                  <FaTwitter />
                </IconButton>
                <IconButton
                  aria-label="LinkedIn"
                  size="sm"
                  variant="ghost"
                  color="fg.muted"
                  _hover={{ color: 'brand.600' }}
                >
                  <FaLinkedin />
                </IconButton>
              </Group>
            </Stack>
          </SimpleGrid>

          <Separator my={{ base: 6, md: 8 }} />

          <Text textAlign="center" color="fg.muted" fontSize="sm">
            © 2024 IWE Web. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
