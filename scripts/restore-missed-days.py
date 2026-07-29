import urllib.request
import json
import ssl
import time
import random
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

def Date_now_ms():
    return int(time.time() * 1000)

def Math_random_str():
    return hex(random.randint(100000, 999999))[2:]

templates = get_redis_key('aq:task-templates') or []
events = get_redis_key('aq:events:parent') or []

# Day 2026-07-27 (Monday = 1) and 2026-07-28 (Tuesday = 2)
dates_to_restore = [
    ('2026-07-27', 1),
    ('2026-07-28', 2)
]

for childId in ['ali', 'said']:
    child_name = 'Али' if childId == 'ali' else 'Саид'
    ledger_key = f'aq:star-ledger:{childId}'
    ledger = get_redis_key(ledger_key) or []
    
    for date_str, day_of_week in dates_to_restore:
        day_key = f'aq:day:{childId}:{date_str}'
        
        # Filter relevant active templates
        relevant_templates = [
            t for t in templates
            if t.get('active') and
            (t.get('childId') == childId or t.get('childId') == 'both') and
            (day_of_week in (t.get('repeatDays') or []))
        ]
        
        tasks_for_day = []
        for t in relevant_templates:
            t_id = f"task-restored-{Date_now_ms()}-{Math_random_str()}"
            subtasks = []
            if isinstance(t.get('subtasks'), list):
                for idx, st in enumerate(t['subtasks']):
                    subtasks.append({
                        'id': st.get('id', f'subtask-{idx}'),
                        'title': st.get('title', ''),
                        'done': True
                    })
            
            task_obj = {
                'id': t_id,
                'templateId': t['id'],
                'childId': childId,
                'date': date_str,
                'title': t['title'],
                'category': t.get('category', 'study'),
                'customCategory': t.get('customCategory', ''),
                'stars': t.get('stars', 1),
                'dueTime': t.get('dueTime'),
                'completed': True,
                'completedAt': f"{date_str}T20:00:00.000Z",
                'detailsOpened': True,
                'requiresOpenDetails': bool(t.get('requiresOpenDetails')),
                'detailsText': t.get('detailsText', ''),
                'subtasksMode': t.get('subtasksMode', 'none'),
                'subtasks': subtasks,
                'createdAt': f"{date_str}T08:00:00.000Z",
                'updatedAt': f"{date_str}T20:00:00.000Z"
            }
            tasks_for_day.append(task_obj)
            
            # Add star ledger entry
            ledger_item = {
                'id': f"ledger-restored-{Date_now_ms()}-{Math_random_str()}",
                'childId': childId,
                'date': date_str,
                'amount': t.get('stars', 1),
                'source': 'task',
                'sourceId': t_id,
                'reason': f"Выполнена задача: {t['title']} (восстановлено)",
                'details': {
                    'childName': child_name,
                    'taskId': t_id,
                    'taskTitle': t['title'],
                    'stars': t.get('stars', 1),
                    'completedAt': f"{date_str}T20:00:00.000Z"
                },
                'createdAt': f"{date_str}T20:00:00.000Z"
            }
            ledger.append(ledger_item)

        # Add Day Bonus (+5 stars)
        bonus_item = {
            'id': f"ledger-restored-bonus-{Date_now_ms()}-{Math_random_str()}",
            'childId': childId,
            'date': date_str,
            'amount': 5,
            'source': 'day-bonus',
            'sourceId': date_str,
            'reason': "Бонус за выполнение всех задач за день (+5 ⭐) (восстановлено)",
            'createdAt': f"{date_str}T20:01:00.000Z"
        }
        ledger.append(bonus_item)
        
        # Save day tasks
        set_redis_key(day_key, tasks_for_day)
        print(f"Saved {len(tasks_for_day)} completed tasks for {child_name} on {date_str}")
        
    # Save ledger
    set_redis_key(ledger_key, ledger)
    print(f"Updated star ledger for {child_name}")
    
    # Restore Streak progress & 2 Hearts
    streak_key = f'aq:streak-progress:{childId}'
    set_redis_key(streak_key, {
        'currentStreak': 43,
        'lastCompletedDate': '2026-07-28',
        'freezeHearts': 2,
        'lastHeartRestoreDate': '2026-07-28'
    })
    print(f"Restored streak (43 days) & 2 hearts for {child_name}")

# Add event log
events.append({
    'id': f"event-restored-{Date_now_ms()}",
    'childId': 'ali',
    'type': 'system',
    'title': 'Восстановление пропущенных дней',
    'body': 'Папа восстановил задания за 27 и 28 июля для Али и Саида, начислил звёзды и пополнил 2 сердечка серии! ❤️',
    'read': False,
    'createdAt': datetime.now().isoformat()
})
set_redis_key('aq:events:parent', events)

print("ALL RESTORATIONS COMPLETED SUCCESSFULLY!")
