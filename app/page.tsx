'use client'

import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
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
} from '@chakra-ui/react'
import { ColorModeButton } from '../components/ui/color-mode'
import { FaRocket, FaCode, FaShieldAlt, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa'
import { MdSpeed, MdSettings, MdSecurity } from 'react-icons/md'

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
        bg={{ base: "white/80", _dark: "gray.900/80" }}
        borderBottomWidth="1px"
      >
        <Container maxW="7xl" py={4}>
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={2}>
              <Box 
                w={10} 
                h={10} 
                bgGradient="to-br"
                gradientFrom="blue.500"
                gradientTo="purple.600"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontWeight="bold" fontSize="xl">IW</Text>
              </Box>
              <Heading size="lg">IWE Web</Heading>
            </Flex>
            
            <Flex align="center" gap={6}>
              <Link href="#features" _hover={{ color: "blue.500" }}>Features</Link>
              <Link href="#about" _hover={{ color: "blue.500" }}>About</Link>
              <Link href="#contact" _hover={{ color: "blue.500" }}>Contact</Link>
              <ColorModeButton />
              <Button colorPalette="blue" variant="solid">
                Get Started
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxW="7xl" py={20}>
        <Stack gap={8} align="center" textAlign="center">
          <Badge colorPalette="blue" size="lg" variant="subtle">
            🚀 Next.js + Chakra UI
          </Badge>
          
          <Heading size="5xl" fontWeight="bold">
            Welcome to{' '}
            <Text 
              as="span"
              bgGradient="to-r"
              gradientFrom="blue.500"
              gradientTo="purple.600"
              bgClip="text"
            >
              IWE Web
            </Text>
          </Heading>
          
          <Text fontSize="xl" color={{ base: "gray.600", _dark: "gray.400" }} maxW="2xl">
            Build modern, scalable web applications with Next.js and Chakra UI. 
            Experience the power of React with server-side rendering and a beautiful component library.
          </Text>
          
          <Group>
            <Button size="lg" colorPalette="blue" variant="solid">
              Start Building
            </Button>
            <Button size="lg" variant="outline">
              View Documentation
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Features Section */}
      <Box bg={{ base: "gray.50", _dark: "gray.800" }} py={20}>
        <Container maxW="7xl">
          <Stack gap={12}>
            <Stack gap={4} textAlign="center">
              <Heading size="3xl">Why Choose Our Platform?</Heading>
              <Text fontSize="lg" color={{ base: "gray.600", _dark: "gray.400" }}>
                Everything you need to build amazing web applications
              </Text>
            </Stack>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
              <Card.Root>
                <Card.Body gap={4}>
                  <Flex 
                    w={14} 
                    h={14} 
                    bg="blue.100"
                    _dark={{ bg: "blue.900" }}
                    borderRadius="lg"
                    align="center"
                    justify="center"
                  >
                    <Icon color="blue.500">
                      <MdSpeed />
                    </Icon>
                  </Flex>
                  <Stack gap={2}>
                    <Heading size="lg">Lightning Fast</Heading>
                    <Text color={{ base: "gray.600", _dark: "gray.400" }}>
                      Optimized for performance with automatic code splitting and intelligent prefetching.
                    </Text>
                  </Stack>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Body gap={4}>
                  <Flex 
                    w={14} 
                    h={14} 
                    bg="purple.100"
                    _dark={{ bg: "purple.900" }}
                    borderRadius="lg"
                    align="center"
                    justify="center"
                  >
                    <Icon color="purple.500">
                      <MdSettings />
                    </Icon>
                  </Flex>
                  <Stack gap={2}>
                    <Heading size="lg">Fully Customizable</Heading>
                    <Text color={{ base: "gray.600", _dark: "gray.400" }}>
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
                    bg="green.100"
                    _dark={{ bg: "green.900" }}
                    borderRadius="lg"
                    align="center"
                    justify="center"
                  >
                    <Icon color="green.500">
                      <MdSecurity />
                    </Icon>
                  </Flex>
                  <Stack gap={2}>
                    <Heading size="lg">Secure by Default</Heading>
                    <Text color={{ base: "gray.600", _dark: "gray.400" }}>
                      Built-in security features with automatic HTTPS and protection against vulnerabilities.
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
        gradientFrom="blue.500"
        gradientTo="purple.600"
        color="white"
        py={20}
      >
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={8}>
            <Stat.Root textAlign="center">
              <Stat.Label color="blue.100">Downloads</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">10M+</Stat.ValueText>
            </Stat.Root>
            
            <Stat.Root textAlign="center">
              <Stat.Label color="blue.100">Active Projects</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">50K+</Stat.ValueText>
            </Stat.Root>
            
            <Stat.Root textAlign="center">
              <Stat.Label color="blue.100">Uptime</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">99.9%</Stat.ValueText>
            </Stat.Root>
            
            <Stat.Root textAlign="center">
              <Stat.Label color="blue.100">Support</Stat.Label>
              <Stat.ValueText fontSize="5xl" fontWeight="bold">24/7</Stat.ValueText>
            </Stat.Root>
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxW="4xl" py={20}>
        <Stack gap={8} align="center" textAlign="center">
          <Heading size="3xl">Ready to Build Something Amazing?</Heading>
          <Text fontSize="xl" color={{ base: "gray.600", _dark: "gray.400" }}>
            Join thousands of developers who are already building with our platform.
          </Text>
          <Group>
            <Button size="lg" colorPalette="blue">Get Started Free</Button>
            <Button size="lg" variant="outline">Schedule Demo</Button>
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
                  bg="gradient.to-br"
                  bgGradient="to-br"
                  gradientFrom="blue.500"
                  gradientTo="purple.600"
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontWeight="bold" fontSize="xl">IW</Text>
                </Box>
                <Heading size="lg">IWE Web</Heading>
              </Flex>
              <Text color={{ base: "gray.600", _dark: "gray.400" }}>
                Building the future of web development, one component at a time.
              </Text>
            </Stack>
            
            <Stack gap={2}>
              <Heading size="md">Product</Heading>
              <Link color={{ base: "gray.600", _dark: "gray.400" }} _hover={{ color: "blue.500" }}>Features</Link>
              <Link color={{ base: "gray.600", _dark: "gray.400" }} _hover={{ color: "blue.500" }}>Pricing</Link>
              <Link color={{ base: "gray.600", _dark: "gray.400" }} _hover={{ color: "blue.500" }}>Documentation</Link>
            </Stack>
            
            <Stack gap={2}>
              <Heading size="md">Company</Heading>
              <Link color={{ base: "gray.600", _dark: "gray.400" }} _hover={{ color: "blue.500" }}>About</Link>
              <Link color={{ base: "gray.600", _dark: "gray.400" }} _hover={{ color: "blue.500" }}>Blog</Link>
              <Link color={{ base: "gray.600", _dark: "gray.400" }} _hover={{ color: "blue.500" }}>Careers</Link>
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
          
          <Text textAlign="center" color={{ base: "gray.600", _dark: "gray.400" }}>
            © 2024 IWE Web. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  )
}