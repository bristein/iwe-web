#!/bin/bash

# Development server with Caddy for custom domain support
# This script provides robust process management and error handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}✗ $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to check if Caddy is installed
check_caddy() {
    if ! command -v caddy &> /dev/null; then
        print_error "Caddy is not installed!"
        print_info "Please install Caddy first:"
        print_info "  macOS: brew install caddy"
        print_info "  Linux: See https://caddyserver.com/docs/install"
        exit 1
    fi
    print_success "Caddy is installed"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_error "Port $port is already in use!"
        print_info "Please stop the process using port $port and try again"
        return 1
    fi
    return 0
}

# Function to stop Caddy
stop_caddy() {
    print_info "Stopping any existing Caddy process..."
    caddy stop 2>/dev/null || true
    sleep 1
}

# Function to start Caddy
start_caddy() {
    print_info "Starting Caddy server..."
    
    # Check if Caddyfile exists
    if [ ! -f "Caddyfile" ]; then
        print_error "Caddyfile not found in current directory!"
        exit 1
    fi
    
    # Start Caddy in the background
    if ! caddy start --config Caddyfile 2>/dev/null; then
        print_error "Failed to start Caddy!"
        print_info "Check if port 80 requires sudo or is already in use"
        exit 1
    fi
    
    print_success "Caddy started successfully"
    print_info "Local domain available at: http://app.iwe.localhost"
}

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    echo ""
    print_info "Shutting down..."
    
    # Stop Caddy
    caddy stop 2>/dev/null || true
    
    # Kill Next.js dev server if it's running
    if [ ! -z "$NEXT_PID" ]; then
        kill $NEXT_PID 2>/dev/null || true
    fi
    
    if [ $exit_code -eq 0 ]; then
        print_success "Shutdown complete"
    else
        print_error "Shutdown due to error"
    fi
    
    exit $exit_code
}

# Main execution
main() {
    print_info "Starting development environment with Caddy..."
    echo ""
    
    # Check prerequisites
    check_caddy
    
    # Check if required ports are available
    if ! check_port 3000; then
        print_error "Port 3000 is required for Next.js dev server"
        exit 1
    fi
    
    # Note: Port 80 check might require sudo to bind
    # We'll let Caddy handle this and report errors
    
    # Stop any existing Caddy process
    stop_caddy
    
    # Start Caddy
    start_caddy
    
    # Wait a moment for Caddy to initialize
    sleep 2
    
    # Set up cleanup trap
    trap cleanup EXIT INT TERM
    
    # Start Next.js dev server
    print_info "Starting Next.js development server..."
    echo ""
    
    # Run Next.js in the foreground so script remains running
    # This allows our trap to handle cleanup properly
    exec pnpm next dev
}

# Run main function
main "$@"