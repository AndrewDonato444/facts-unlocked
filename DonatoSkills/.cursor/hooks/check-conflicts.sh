#!/bin/bash
# check-conflicts.sh
# Cursor hook: Runs at session start
# Checks for existing auto-generated PRs that might conflict

# Read hook input
input=$(cat)

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    # No gh CLI, just continue
    cat << 'EOF'
{
  "continue": true
}
EOF
    exit 0
fi

# Check for open auto PRs
OPEN_AUTO_PRS=$(gh pr list --search "head:auto/" --json number,headRefName --jq '.[].headRefName' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

if [ -n "$OPEN_AUTO_PRS" ]; then
    cat << EOF
{
  "continue": true,
  "additional_context": "INFO: There are existing auto-generated PRs that may need rebasing after merge: $OPEN_AUTO_PRS. When editing feature specs, update the YAML frontmatter - mapping.md will auto-regenerate."
}
EOF
else
    cat << 'EOF'
{
  "continue": true
}
EOF
fi
