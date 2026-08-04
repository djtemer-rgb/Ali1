import urllib.request
import json
import ssl
from datetime import datetime

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

def set_redis_key(key, val):
    data = json.dumps(val).encode('utf-8')
    req = urllib.request.Request(
        f'{url}/set/{key}',
        data=data,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.status == 200
    except Exception as e:
        print(f"Error setting key {key}: {e}")
        return False

# Restore 1 heart for both ali and said
for childId in ['ali', 'said']:
    streak_key = f'aq:streak-progress:{childId}'
    prog = get_redis_key(streak_key) or {}
    prog['freezeHearts'] = 2
    prog['lastHeartRestoreDate'] = '2026-08-04'
    set_redis_key(streak_key, prog)
    print(f"Restored heart for {childId}: {prog}")

# Log system event for parent
events = get_redis_key('aq:events:parent') or []
events.append({
    'id': f"event-heart-restored-{int(datetime.now().timestamp()*1000)}",
    'childId': 'ali',
    'type': 'system',
    'title': 'Восстановление сердечка',
    'body': 'Папа восстановил 1 потерянное сердечко серии для Али и Саида! У обоих теперь 2 из 2. ❤️',
    'read': False,
    'createdAt': datetime.now().isoformat()
})
set_redis_key('aq:events:parent', events)
print("Hearts successfully restored to 2/2 for both children!")
