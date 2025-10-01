-- Fix YouTube URLs missing https:// protocol in existing records
UPDATE tracks 
SET youtube_url = 'https://' || youtube_url 
WHERE youtube_url NOT LIKE 'http://%' 
  AND youtube_url NOT LIKE 'https://%'
  AND youtube_url IS NOT NULL 
  AND youtube_url != '';

-- Show the updated URLs for verification
SELECT id, title, youtube_url 
FROM tracks 
ORDER BY created_at DESC;