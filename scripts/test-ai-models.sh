#!/bin/bash
# Tests each provider/model combo against the refine-prompt edge function.
# A 200 with a "refinedPrompt" key = pass. Anything else = fail.

SUPABASE_URL="https://qgcyndtymegkobgfcpdh.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnY3luZHR5bWVna29iZ2ZjcGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1Mjc4NDIsImV4cCI6MjA2ODEwMzg0Mn0.etBsIv3ZRtMD2KyCG9xBR4SrCmXiG0JQQ8mgqOZAHyY"
ENDPOINT="${SUPABASE_URL}/functions/v1/refine-prompt"

PAYLOAD_TEMPLATE='{"currentPrompt":"You are a gift advisor.","userInstruction":"Make it friendlier.","overrideProvider":"%s","overrideModel":"%s"}'

PASS=0
FAIL=0

run_test() {
  local provider="$1"
  local model="$2"
  local payload
  payload=$(printf "$PAYLOAD_TEMPLATE" "$provider" "$model")

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 60)

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "200" ]] && echo "$body" | grep -q "revisedPrompt"; then
    echo "  PASS  [$provider / $model]"
    ((PASS++))
  else
    echo "  FAIL  [$provider / $model] HTTP $http_code — $(echo "$body" | head -c 200)"
    ((FAIL++))
  fi
}

echo "=== Testing OpenAI models ==="
run_test "openai" "gpt-4o-mini"
run_test "openai" "gpt-4o"
run_test "openai" "gpt-4.5-preview"
run_test "openai" "o1-mini"
run_test "openai" "o1"
run_test "openai" "o3-mini"

echo ""
echo "=== Testing Anthropic models ==="
run_test "anthropic" "claude-haiku-4-5-20251001"
run_test "anthropic" "claude-sonnet-4-6"
run_test "anthropic" "claude-opus-4-7"

echo ""
echo "=== Testing Google models ==="
run_test "google" "gemini-2.0-flash"
run_test "google" "gemini-2.0-pro"
run_test "google" "gemini-1.5-pro"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
