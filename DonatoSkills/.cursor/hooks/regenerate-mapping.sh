#!/bin/bash
# regenerate-mapping.sh
# Cursor hook: Runs after any .feature.md file is edited
# Regenerates mapping.md from spec frontmatter

# Read and discard hook input (required by Cursor hooks protocol)
cat > /dev/null

# Find project root (where .specs directory is)
PROJECT_ROOT="$(pwd)"
while [ "$PROJECT_ROOT" != "/" ] && [ ! -d "$PROJECT_ROOT/.specs" ]; do
    PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

if [ -d "$PROJECT_ROOT/.specs" ]; then
    # Run the generate script silently
    cd "$PROJECT_ROOT"
    ./scripts/generate-mapping.sh > /dev/null 2>&1
    
    # Stage the regenerated file (optional - helps with commits)
    git add .specs/mapping.md 2>/dev/null || true
fi

# Exit successfully
exit 0
