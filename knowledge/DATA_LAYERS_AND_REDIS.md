# 2. Слои Данных и Схема Upstash Redis

Вся персистентность данных построена на базе **Upstash Redis REST API**.
Ключевой архитектурный принцип — **полное разделение данных детей (Ali vs Said)** на уровне ключей базы данных.

---

## 🔑 Пространство Ключей Redis

### 1. Общие настройки и профили
| Ключ | Тип | Описание |
| :--- | :--- | :--- |
| `aq:settings` | JSON Object | Общие настройки: `freezeRestoreDays`, `currencyEnabled`, `telegramBotToken`, `telegramChatId` |
| `aq:children` | JSON Array | Список детей: `[{ id: 'ali', name: 'Али', ... }, { id: 'said', name: 'Саид', ... }]` |
| `aq:parent:auth` | JSON Object | Хэши PIN-кодов родителей: `pin1Hash`, `pin2Hash`, `recoveryWordHash` |
| `aq:task-templates` | JSON Array | Шаблоны задач (активные/неактивные, дни повтора, привязка к `ali`/`said`/`both`) |
| `aq:rewards` | JSON Array | Каталог наград магазина (название, стоимость в звёздах, иконка, `childId`) |
| `aq:streak-rewards` | JSON Array | Награды за серию побед (карточки с играми, бонусными звёздами) |
| `aq:events:parent` | JSON Array | Единый инбокс родителя (выполненные задачи, покупки наград, системные события) |

---

### 2. Специфичные данные Али (`childId: 'ali'`)
| Ключ | Формат | Описание |
| :--- | :--- | :--- |
| `aq:day:ali:YYYY-MM-DD` | JSON Array | Список задач Али на конкретную дату со статусами выполнения, подзадачами, оценкой сложности |
| `aq:star-ledger:ali` | JSON Array | Журнал транзакций звёзд Али (начисления за задачи, бонусы дня, списания за покупки) |
| `aq:streak-progress:ali` | JSON Object | Серия дней: `{ currentStreak: number, lastCompletedDate: string, freezeHearts: 0..2, lastHeartRestoreDate: string }` |
| `aq:streak-rewards:earned:ali` | JSON Object | Счётчик полученных карточек серии: `{ [rewardId: string]: number }` |
| `aq:bonus-games:ali` | JSON Object | Статус прохождения 5 Canvas-игр: `{ [rewardId: string]: { completed: boolean, completedAt?: string, gameId?: string } }` |
| `aq:reward-status:ali` | JSON Array | Статусы покупок наград: `[{ rewardId, status: 'available' \| 'selected' \| 'fulfilled' }]` |
| `aq:child:ali:profile` | JSON Object | Профиль Али (выбранный AI-герой, настройки) |

---

### 3. Специфичные данные Саида (`childId: 'said'`)
| Ключ | Формат | Описание |
| :--- | :--- | :--- |
| `aq:day:said:YYYY-MM-DD` | JSON Array | Список задач Саида на конкретную дату |
| `aq:star-ledger:said` | JSON Array | Журнал транзакций звёзд Саида |
| `aq:streak-progress:said` | JSON Object | Серия дней, сердца заморозки и дата отсчёта Саида |
| `aq:streak-rewards:earned:said` | JSON Object | Полученные карточки наград Саида |
| `aq:bonus-games:said` | JSON Object | Прохождение бонусных игр Саида |
| `aq:reward-status:said` | JSON Array | Статусы покупок наград Саида |
| `aq:child:said:profile` | JSON Object | Профиль Саида (режим `littleHeroMode` для скрытия школьных оценок) |

---

## 🛡️ Правила Целостности Данных

1. **Неизменяемый Star Ledger**: Баланс звёзд рассчитывается динамически через `.reduce()` всех записей журнала. Прямое переписывание баланса числом запрещено — любые операции (награда за квест, покупка, откат) оформляются новой записью или удалением конкретного `ledgerId`.
2. **Безопасность покупок (Защита от зависания)**:
   При покупке награды звёзды замораживаются (`status: 'selected'`). Если родитель отменяет событие или удаляет его из инбокса, система автоматически возвращает звёзды ребёнку (`status: 'available'`).
3. **90-дневный TTL**: Старые ключи `aq:day:*` старше 90 дней архивируются и очищаются фоновым эндпоинтом `/api/cleanup`.
