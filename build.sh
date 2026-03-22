#!/bin/bash
# build.sh - Build script for One Year of Us website
# 
# This script:
# 1. Checks for and installs dependencies (if needed)
# 2. Converts any HEIC files to JPEG
# 3. Generates photo metadata
# 4. Builds static files to public/ directory
# 5. Optionally starts a local development server or deploys to Hostinger
#
# Usage:
#   ./build.sh              - Build and serve
#   ./build.sh --build      - Build only (no server)
#   ./build.sh --deploy     - Build and deploy to Hostinger
#   ./build.sh --help       - Show help

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PHOTOS_DIR="$SCRIPT_DIR/photos"
PUBLIC_DIR="$SCRIPT_DIR/public"
PORT=8080

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

show_help() {
    cat << EOF
One Year of Us - Build Script

Usage: ./build.sh [OPTIONS]

Options:
    --build       Build only, don't start server
    --deploy      Build and deploy to Hostinger (pushes to hostinger branch)
    --port PORT   Set server port (default: 8080)
    --help        Show this help message

Examples:
    ./build.sh              Build and serve on port 8080
    ./build.sh --build      Build only to public/
    ./build.sh --deploy     Build and deploy to Hostinger

Deployment:
    The --deploy option will:
    1. Build the public/ directory with all photos
    2. Commit with a timestamp message
    3. Push to the 'hostinger' branch
    4. Hostinger can pull from this branch for deployment

EOF
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed."
        exit 1
    fi
    
    # Check for photos dependencies
    if [ -f "$PHOTOS_DIR/package.json" ]; then
        cd "$PHOTOS_DIR"
        if ! node -e "require('sharp')" &> /dev/null; then
            log_info "Installing photo processing dependencies..."
            npm install
        fi
        cd "$SCRIPT_DIR"
    fi
    
    # Check for sips or ImageMagick
    if ! command -v sips &> /dev/null && ! command -v magick &> /dev/null; then
        log_warn "Neither sips nor ImageMagick found. HEIC conversion may not work."
    fi
    
    log_success "Dependencies OK"
}

convert_heic() {
    log_info "Checking for HEIC files..."
    
    heic_count=$(find "$PHOTOS_DIR" -maxdepth 1 \( -name "*.heic" -o -name "*.HEIC" \) -type f 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$heic_count" -eq 0 ]; then
        log_success "No HEIC files to convert"
        return
    fi
    
    log_info "Found $heic_count HEIC file(s), converting..."
    
    # Ensure backup directory exists
    mkdir -p "$PHOTOS_DIR/heic-backup"
    
    converted=0
    for file in "$PHOTOS_DIR"/*.heic "$PHOTOS_DIR"/*.HEIC; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            # Get base name with proper extension handling
            basename="${filename%.heic}"
            basename="${basename%.HEIC}"
            ext="${filename##*.}"
            jpg_file="$PHOTOS_DIR/${basename}.jpg"
            
            # Skip if JPEG already exists (never overwrite!)
            if [ -f "$jpg_file" ]; then
                log_info "Skipping: $filename (JPEG already exists)"
                mv "$file" "$PHOTOS_DIR/heic-backup/"
                continue
            fi
            
            log_info "Converting: $filename"
            
            if command -v sips &> /dev/null; then
                sips -s format jpeg -s formatOptions 95 "$file" --out "$jpg_file" 2>/dev/null
            elif command -v magick &> /dev/null; then
                magick "$file" "$jpg_file" 2>/dev/null
            fi
            
            # Only move to backup if conversion succeeded
            if [ -f "$jpg_file" ]; then
                mv "$file" "$PHOTOS_DIR/heic-backup/"
                log_success "Converted: ${basename}.jpg"
                ((converted++))
            else
                log_warn "Failed to convert: $filename"
            fi
        fi
    done
    log_info "Converted $converted file(s)"
    log_success "HEIC conversion complete"
}

build_metadata() {
    log_info "Building photo metadata..."
    
    if [ ! -f "$PHOTOS_DIR/build-photos.js" ]; then
        log_warn "build-photos.js not found, skipping metadata generation"
        return
    fi
    
    cd "$PHOTOS_DIR"
    node build-photos.js
    cd "$SCRIPT_DIR"
    
    log_success "Metadata built"
}

build_public() {
    log_info "Building public/ directory..."
    
    # Create directories
    mkdir -p "$PUBLIC_DIR"
    mkdir -p "$PUBLIC_DIR/photos"
    mkdir -p "$PUBLIC_DIR/svgs"
    mkdir -p "$PUBLIC_DIR/fonts"
    
    # Copy core files
    cp "$SCRIPT_DIR/index.html" "$PUBLIC_DIR/"
    cp "$SCRIPT_DIR/style.css" "$PUBLIC_DIR/"
    cp "$SCRIPT_DIR/script.js" "$PUBLIC_DIR/"
    
    # Copy SVGs
    if [ -d "$SCRIPT_DIR/svgs" ]; then
        cp -r "$SCRIPT_DIR/svgs/"* "$PUBLIC_DIR/svgs/"
    fi
    
    # Copy fonts
    if [ -d "$SCRIPT_DIR/fonts" ]; then
        mkdir -p "$PUBLIC_DIR/fonts"
        cp "$SCRIPT_DIR/fonts/"*.woff2 "$PUBLIC_DIR/fonts/"
        cp "$SCRIPT_DIR/fonts/fonts.css" "$PUBLIC_DIR/fonts/"
    fi
    
    # Copy photos and metadata
    if [ -d "$PHOTOS_DIR" ]; then
        # Copy only image files and metadata
        cp "$PHOTOS_DIR"/*.[Jj][Pp][Gg] "$PUBLIC_DIR/photos/" 2>/dev/null || true
        cp "$PHOTOS_DIR"/*.[Pp][Nn][Gg] "$PUBLIC_DIR/photos/" 2>/dev/null || true
        
        # Copy metadata
        if [ -f "$PHOTOS_DIR/photos-metadata.json" ]; then
            cp "$PHOTOS_DIR/photos-metadata.json" "$PUBLIC_DIR/photos/"
        fi
        
        # Generate inline photos data for file:// compatibility
        if [ -f "$PHOTOS_DIR/photos-metadata.json" ]; then
            node -e "
const fs = require('fs');
const metadata = JSON.parse(fs.readFileSync('$PHOTOS_DIR/photos-metadata.json', 'utf8'));
const js = 'const PHOTOS_METADATA = ' + JSON.stringify(metadata) + ';';
fs.writeFileSync('$PUBLIC_DIR/photos-data.js', js);
"
        fi
    fi
    
    log_success "Public directory built successfully"
    echo ""
    echo "Static files are ready in: $PUBLIC_DIR"
    echo "You can open $PUBLIC_DIR/index.html in a browser to preview"
}

deploy() {
    log_info "Deploying to Hostinger..."
    
    # Ensure we're on main branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$current_branch" != "main" ]; then
        log_warn "Not on main branch (currently on $current_branch)"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Check if remote exists
    if ! git remote get-url origin &>/dev/null; then
        log_error "No remote 'origin' configured. Run: git remote add origin <url>"
        exit 1
    fi
    
    # Use git subtree split to create a branch with only public/
    log_info "Creating deployment branch..."
    git subtree split --prefix public -b hostinger-deploy --quiet
    
    # Push to hostinger branch
    log_info "Pushing to hostinger branch..."
    git push origin hostinger-deploy:hostinger --force
    
    # Cleanup
    git branch -D hostinger-deploy --quiet
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_success "Deployment complete!"
    echo ""
    echo "  Deployed to: origin/hostinger"
    echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "  Hostinger will pull from this branch for deployment."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

start_server() {
    log_info "Starting development server on port $PORT..."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  One Year of Us - Development Server"
    echo ""
    echo "  Local:   http://localhost:$PORT"
    echo "  Network: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo ""
    echo "  Press Ctrl+C to stop"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    cd "$PUBLIC_DIR"
    python3 -m http.server "$PORT"
}

# Parse arguments
BUILD_ONLY=false
DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_ONLY=true
            shift
            ;;
        --deploy)
            DEPLOY=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main build process
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  One Year of Us - Build Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_dependencies
convert_heic
build_metadata
build_public

if [ "$DEPLOY" = true ]; then
    echo ""
    deploy
else
    echo ""
    log_success "Build complete!"

    if [ "$BUILD_ONLY" = true ]; then
        echo ""
        log_info "Run './build.sh' to start the server"
    else
        echo ""
        start_server
    fi
fi
