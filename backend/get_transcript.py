import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

video_id = sys.argv[1]

ytt_api = YouTubeTranscriptApi(
    proxy_config=GenericProxyConfig(
        http_url="http://87.238.192.63:39272",
        https_url="https://87.238.192.63:39272",
    )
)


try:
    transcript = ytt_api.get_transcript(video_id)
    texts = " ".join([entry['text'] for entry in transcript])
    print(json.dumps(texts))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
