# get_transcript.py
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]

try:
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    texts = " ".join([entry['text'] for entry in transcript])
    print(json.dumps(texts))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
