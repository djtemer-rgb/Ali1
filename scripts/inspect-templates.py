import urllib.request
import json
import ssl

ctx = ssl._create_unverified_context()

url = ''
token = ''
with open('.env.local') as f:
    for line in f:
        if line.startswith('UPSTASH_REDIS_REST_URL='):
            url = line.split('=', 1)[1].strip().strip('"').strip("'")
        if line.startswith('UPSTASH_REDIS_REST_TOKEN='):
            token = line.split('=', 1)[1].strip().strip('"').strip("'")

def get_redis_key(key):
    req = urllib.request.Request(
        f'{url}/get/{key}',
        headers={'Authorization': f'Bearer {token}'}
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res = json.loads(response.read().decode('utf-8'))
            if res.get('result'):
                return json.loads(res['result'])
            return None
    except Exception as e:
        print(f"Error getting key {key}: {e}")
        return None

templates = get_redis_key('aq:task-templates') or []
print(f"Total templates: {len(templates)}")
for t in templates:
    print(f"Title: {t.get('title')}, childId: {t.get('childId')}, repeatDays: {t.get('repeatDays')}, active: {t.get('active')}, stars: {t.get('stars')}")
