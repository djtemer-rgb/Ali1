import urllib.request
import json
import ssl

ctx = ssl._create_unverified_context()

# Read credentials from .env.local
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

# Inspect keys
print("=== aq:reward-status:ali ===")
reward_status = get_redis_key('aq:reward-status:ali')
print(json.dumps(reward_status, indent=2, ensure_ascii=False))

print("\n=== aq:star-ledger:ali (last 5 items) ===")
ledger = get_redis_key('aq:star-ledger:ali')
if ledger:
    for item in ledger[-5:]:
        print(json.dumps(item, indent=2, ensure_ascii=False))
else:
    print("Empty or not found")

print("\n=== aq:events:parent (last 5 items) ===")
events = get_redis_key('aq:events:parent')
if events:
    for e in events[-5:]:
        print(json.dumps(e, indent=2, ensure_ascii=False))
else:
    print("Empty or not found")
