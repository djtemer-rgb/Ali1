import urllib.request
import json
import ssl
import time

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
    with urllib.request.urlopen(req, context=ctx) as response:
        res = json.loads(response.read().decode('utf-8'))
        if res.get('result'):
            return json.loads(res['result'])
        return None

def set_redis_key(key, val):
    payload = json.dumps(val)
    req = urllib.request.Request(
        f'{url}/set/{key}',
        data=payload.encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    with urllib.request.urlopen(req, context=ctx) as response:
        res = json.loads(response.read().decode('utf-8'))
        return res.get('result') == 'OK'

# 1. Update reward status
reward_status_key = 'aq:reward-status:ali'
statuses = get_redis_key(reward_status_key) or []
target_reward_id = 'reward-1780872607957-faojevhnt'

updated_statuses = []
found_status = False
for s in statuses:
    if s.get('rewardId') == target_reward_id:
        s['status'] = 'available'
        if 'selectedAt' in s:
            del s['selectedAt']
        if 'fulfilledAt' in s:
            del s['fulfilledAt']
        found_status = True
    updated_statuses.append(s)

if not found_status:
    updated_statuses.append({
        "rewardId": target_reward_id,
        "childId": "ali",
        "status": "available"
    })

# 2. Append refund item to star ledger
ledger_key = 'aq:star-ledger:ali'
ledger = get_redis_key(ledger_key) or []

refund_item = {
    "id": f"ledger-refund-{int(time.time() * 1000)}",
    "childId": "ali",
    "date": "2026-06-21",
    "amount": 250,
    "source": "adjustment",
    "sourceId": target_reward_id,
    "reason": "Отмена выбора награды: Брелок - Рональдиньо (+250 ⭐)",
    "createdAt": "2026-06-21T14:08:00.000Z"
}
ledger.append(refund_item)

# 3. Append reverted event to parent events
events_key = 'aq:events:parent'
events = get_redis_key(events_key) or []

reverted_event = {
    "id": f"event-refund-{int(time.time() * 1000)}",
    "childId": "ali",
    "type": "reward-selected",
    "title": "Выбор награды отменён",
    "body": "Али: отмена выбора награды \"Брелок - Рональдиньо\" (+250 ⭐)",
    "rewardId": target_reward_id,
    "details": {
        "childName": "Али",
        "rewardTitle": "Брелок - Рональдиньо",
        "costStars": 250,
        "status": "available",
        "reverted": True
    },
    "read": True,
    "createdAt": "2026-06-21T14:08:00.000Z"
}
events.append(reverted_event)

# Write everything back
status_ok = set_redis_key(reward_status_key, updated_statuses)
ledger_ok = set_redis_key(ledger_key, ledger)
events_ok = set_redis_key(events_key, events)

print(f"Status update: {status_ok}")
print(f"Ledger update: {ledger_ok}")
print(f"Events update: {events_ok}")
