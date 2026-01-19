#!/bin/bash

# Straico AI Manager Script
# Manages agents and RAG bases for Straico AI platform

# Load API key from environment or set it here
STRAICO_API_KEY="${STRAICO_API_KEY:-Zk-Ivz4BQ9dIM2fpJT9o8xjapspZcJyUQHuCU94sJoWE9V2udFg}"
BASE_URL="https://api.straico.com/v0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to make API requests
api_request() {
    local method="$1"
    local endpoint="$2"
    shift 2
    
    curl --silent --location --request "$method" "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${STRAICO_API_KEY}" \
        "$@"
}

# ==================== AGENT MANAGEMENT ====================

# List all agents
list_agents() {
    echo -e "${YELLOW}Listing all agents...${NC}"
    api_request GET "/agent" | jq '.'
}

# Get specific agent details
get_agent() {
    local agent_id="$1"
    if [ -z "$agent_id" ]; then
        echo -e "${RED}Error: Agent ID required${NC}"
        return 1
    fi
    echo -e "${YELLOW}Getting agent ${agent_id}...${NC}"
    api_request GET "/agent/${agent_id}" | jq '.'
}

# Create a new agent
create_agent() {
    local name="$1"
    local custom_prompt="$2"
    local default_llm="${3:-anthropic/claude-3.5-sonnet}"
    local description="${4:-}"
    
    if [ -z "$name" ] || [ -z "$custom_prompt" ]; then
        echo -e "${RED}Error: Name and custom prompt required${NC}"
        echo "Usage: create_agent <name> <custom_prompt> [llm] [description]"
        return 1
    fi
    
    echo -e "${YELLOW}Creating agent: ${name}${NC}"
    api_request POST "/agent" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "name=${name}" \
        --data-urlencode "custom_prompt=${custom_prompt}" \
        --data-urlencode "default_llm=${default_llm}" \
        --data-urlencode "description=${description}" | jq '.'
}

# Delete an agent
delete_agent() {
    local agent_id="$1"
    if [ -z "$agent_id" ]; then
        echo -e "${RED}Error: Agent ID required${NC}"
        return 1
    fi
    echo -e "${YELLOW}Deleting agent ${agent_id}...${NC}"
    api_request DELETE "/agent/${agent_id}" | jq '.'
}

# ==================== RAG MANAGEMENT ====================

# List all RAG bases
list_rags() {
    echo -e "${YELLOW}Listing all RAG bases...${NC}"
    api_request GET "/rag" | jq '.'
}

# Create a new RAG base with a file
create_rag() {
    local name="$1"
    local description="$2"
    local file_path="$3"
    
    if [ -z "$name" ] || [ -z "$file_path" ]; then
        echo -e "${RED}Error: Name and file path required${NC}"
        echo "Usage: create_rag <name> <description> <file_path>"
        return 1
    fi
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}Error: File not found: ${file_path}${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Creating RAG base: ${name}${NC}"
    echo -e "${YELLOW}Uploading file: ${file_path}${NC}"
    
    curl --silent --location "${BASE_URL}/rag" \
        -H "Authorization: Bearer ${STRAICO_API_KEY}" \
        -H "Content-Type: multipart/form-data" \
        -F "name=${name}" \
        -F "description=${description}" \
        -F "files=@${file_path}" | jq '.'
}

# Delete a RAG base
delete_rag() {
    local rag_id="$1"
    if [ -z "$rag_id" ]; then
        echo -e "${RED}Error: RAG ID required${NC}"
        return 1
    fi
    echo -e "${YELLOW}Deleting RAG base ${rag_id}...${NC}"
    api_request DELETE "/rag/${rag_id}" | jq '.'
}

# ==================== AGENT + RAG INTEGRATION ====================

# Connect a RAG base to an agent
connect_rag_to_agent() {
    local agent_id="$1"
    local rag_id="$2"
    
    if [ -z "$agent_id" ] || [ -z "$rag_id" ]; then
        echo -e "${RED}Error: Agent ID and RAG ID required${NC}"
        echo "Usage: connect_rag_to_agent <agent_id> <rag_id>"
        return 1
    fi
    
    echo -e "${YELLOW}Connecting RAG ${rag_id} to agent ${agent_id}...${NC}"
    api_request POST "/agent/${agent_id}/rag" \
        -H "Content-Type: application/json" \
        --data-raw "{\"rag\": \"${rag_id}\"}" | jq '.'
}

# ==================== USAGE INFORMATION ====================

show_help() {
    cat << EOF
${GREEN}Straico AI Manager - Usage Guide${NC}

${YELLOW}Agent Commands:${NC}
  list_agents                                    - List all agents
  get_agent <agent_id>                          - Get agent details
  create_agent <name> <prompt> [llm] [desc]     - Create new agent
  delete_agent <agent_id>                       - Delete an agent

${YELLOW}RAG Commands:${NC}
  list_rags                                      - List all RAG bases
  create_rag <name> <desc> <file_path>          - Create RAG with file
  delete_rag <rag_id>                           - Delete a RAG base

${YELLOW}Integration Commands:${NC}
  connect_rag_to_agent <agent_id> <rag_id>     - Connect RAG to agent

${YELLOW}Your Current Setup:${NC}
  Agent: Typebot Flow Builder
  Agent ID: 696d0843e25402da5edcd3c2
  RAG: Typebot V6 Documentation
  RAG ID: 696d0b02cee340ea475d9c25

${YELLOW}Examples:${NC}
  # List all agents
  ${GREEN}source straico-manager.sh && list_agents${NC}
  
  # Create a new RAG base
  ${GREEN}source straico-manager.sh && create_rag "My Docs" "Documentation" "./docs.txt"${NC}
  
  # Connect RAG to agent
  ${GREEN}source straico-manager.sh && connect_rag_to_agent "696d0843e25402da5edcd3c2" "696d0b02cee340ea475d9c25"${NC}

EOF
}

# Show help if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    show_help
fi
