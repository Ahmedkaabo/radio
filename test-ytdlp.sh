#!/bin/bash

# Test yt-dlp download with MP3 conversion
# This tests the exact command used in the API

echo "🧪 Testing yt-dlp MP3 download..."

# Test with a short video
TEST_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
TEST_ID="test-$(date +%s)"
OUTPUT_DIR="/tmp/radio-test"

mkdir -p $OUTPUT_DIR

echo "📁 Output directory: $OUTPUT_DIR"
echo "🔗 Test URL: $TEST_URL"
echo "🆔 Test ID: $TEST_ID"

# The exact command from our API
COMMAND="python3 -m yt_dlp -x --audio-format mp3 --audio-quality 0 -o \"$OUTPUT_DIR/$TEST_ID.%(ext)s\" \"$TEST_URL\""

echo "⚙️ Running command: $COMMAND"
echo ""

# Run the command
eval $COMMAND

echo ""
echo "📋 Files created:"
ls -la $OUTPUT_DIR/$TEST_ID*

echo ""
echo "🧹 Cleaning up..."
rm -f $OUTPUT_DIR/$TEST_ID*

echo "✅ Test completed!"