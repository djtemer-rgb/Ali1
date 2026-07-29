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

for child in ['ali', 'said']:
    print(f"=== Streak Progress: {child} ===")
    prog = get_redis_key(f'aq:streak-progress:{child}')
    print(json.dumps(prog, indent=2, ensure_ascii=False))

    print(f"\n=== Days for {child} (2026-07-25 to 2026-07-29) ===")
    for d in ['2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29']:
        day_tasks = get_redis_key(f'aq:day:{child}:{d}')
        completed_count = len([t for t in (day_tasks or []) if t.get('completed')])
        total_count = len(day_tasks) if day_tasks else 0
        print(f"Date {d}: {completed_count}/{total_count} completed")
