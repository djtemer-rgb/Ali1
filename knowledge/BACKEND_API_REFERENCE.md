# 3. Справочник API (Бэкенд)

Все серверные эндпоинты проекта реализованы с использованием Next.js 14 Route Handlers (`app/api/**/route.ts`).

---

## 📡 Список Эндпоинтов

### 1. Задачи и Расписание (`/api/tasks`)
* `GET /api/tasks/day?childId=ali&date=YYYY-MM-DD` — возвращает список задач на указанный день, при необходимости автоматически генерируя инстансы из активных шаблонов `aq:task-templates`.
* `POST /api/tasks/day` — сохраняет состояние задач на день (статусы выполнения, отметки подзадач, время завершения).
* `POST /api/tasks/revert` — откат выполнения задачи (возвращает статус в невыполнено, снимает звёзды из Ledger, восстанавливает разовые шаблоны).
* `GET /api/tasks/templates` — список шаблонов задач.
* `POST /api/tasks/templates` — создание/обновление шаблонов задач.
* `DELETE /api/tasks/templates?id=xxx` — удаление шаблона задачи.

---

### 2. Серия Дней и Сердечки (`/api/streak`)
* `GET /api/streak/progress?childId=ali&date=YYYY-MM-DD` — расчёт текущей серии дней с учётом пропусков через `processStreakAndHearts`. Если были пропуски, списывает сердечко и отправляет Telegram-уведомление.
* `POST /api/streak/complete-day` — закрытие дня на 100%. Увеличивает серию на 1, проверяет достижение наград `aq:streak-rewards`.
* `POST /api/streak/progress` — ручная корректировка сердечек (0, 1 или 2 ❤️) из панели родителей.

---

### 3. Звёзды и Транзакции (`/api/star-ledger`)
* `GET /api/star-ledger?childId=ali` — возвращает общий баланс звёзд и последние транзакции.
* `POST /api/star-ledger` — начисление звёзд (источники: `task`, `day-bonus`, `grade`, `streak-reward`, `parent-manual`).
* `DELETE /api/star-ledger?ledgerId=xxx&childId=ali` — удаление/откат транзакции.

---

### 4. Награды и Магазин (`/api/rewards`)
* `GET /api/rewards?childId=ali` — список активных наград магазина.
* `POST /api/rewards` — добавление/редактирование награды.
* `GET /api/rewards/status?childId=ali` — статусы покупок наград (`available`, `selected`, `fulfilled`).
* `POST /api/rewards/select` — выбор награды ребёнком (списание звёзд, создание события в инбокс).
* `POST /api/rewards/fulfill` — подтверждение родителем выполнения награды.

---

### 5. Бонусные Игры (`/api/bonus-games`)
* `GET /api/bonus-games?childId=ali` — состояние прохождения 5 игр за карточки серий.
* `POST /api/bonus-games` — сохранение факта прохождения игры (блокирует повторное прохождение в этот день).
* `DELETE /api/bonus-games?childId=ali` — сброс игр (для тестирования или смены суток).

---

### 6. События и Инбокс Родителя (`/api/events`)
* `GET /api/events` — получение списка всех уведомлений родительского инбокса.
* `POST /api/events` — создание нового события (задача выполнена, день завершён, награда куплена).
* `PATCH /api/events` — отметка события как прочитанное (`read: true`).
* `DELETE /api/events?id=xxx` — удаление события (с автоматической защитой от зависания наград).

---

### 7. Авторизация Родителя (`/api/auth/parent`)
* `POST /api/auth/parent/login` — валидация 4-6 значного PIN-кода (или слова восстановления) через bcrypt, генерация подписанного JWT токена `parent-session` в httpOnly Cookie.
* `GET /api/auth/parent/me` — проверка валидности родительской сессии.
* `POST /api/auth/parent/pin` — установка или смена PIN-кодов (PIN 1, PIN 2, Recovery Word).

---

### 8. Настройки и Интеграции (`/api/settings`, `/api/telegram`, `/api/push`)
* `GET /api/settings` / `POST /api/settings` — конфигурация системы.
* `POST /api/telegram/test` — проверка связи с Telegram-ботом.
* `POST /api/push/subscribe` — регистрация Web Push подписки браузера.
* `POST /api/push/send` — отправка Push-уведомления.
