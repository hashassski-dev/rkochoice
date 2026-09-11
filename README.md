# РКО Выбор - Netlify hardened build

Стек: HTML + CSS + vanilla JS + Netlify Functions + Netlify Blobs.

## Папки

- `site/` - только публичные файлы, которые Netlify раздает пользователям.
- `netlify/functions/` - backend, не публикуется как статические файлы.
- `SECURITY.md` - что сделано по безопасности.
- `LEGAL_CHECKLIST.md` - что проверить по рекламе и персональным данным перед запуском.
- `LEAD_SCRIPT.md` - базовый скрипт обработки лида.

## Локальный просмотр

Обычный Live Server показывает только публичную витрину. `/panel/` через него не авторизуется, потому что Live Server не запускает Netlify Functions.

Для полной версии:

```bash
npm install
npm i -g netlify-cli
netlify dev
```

Обычно сайт будет на `http://localhost:8888`, панель на `http://localhost:8888/panel/`, проверка backend: `http://localhost:8888/api/health`.


## GitHub

Проект полностью подготовлен для хранения в GitHub. Пошаговая инструкция лежит в [`README_GITHUB.md`](README_GITHUB.md).

Рекомендуемая схема публикации: **GitHub -> Netlify**. Не публикуйте этот проект только через GitHub Pages, если нужна рабочая `/panel/`: GitHub Pages не исполняет Netlify Functions.

## Бесплатный деплой на Netlify

1. Распакуйте проект и загрузите его в GitHub-репозиторий целиком.
2. В Netlify: `Add new project` -> `Import an existing project` -> GitHub.
3. Build command: пусто.
4. Publish directory Netlify возьмет из `netlify.toml`: `site`.
5. Functions directory: `netlify/functions`.
6. После первого деплоя откройте `Project configuration` -> `Environment variables`.
7. Добавьте `AUTH_SECRET` - случайную строку минимум 32 символа. Лучше 64+ случайных символа.
8. Сгенерируйте salt/hash командой `node scripts/hash-password.mjs "ВАШ_ПАРОЛЬ"` и добавьте в Netlify переменные `ADMIN_PASSWORD_SALT` и `ADMIN_PASSWORD_HASH`.
9. Сделайте новый deploy.
10. Проверьте `/api/health`. Должен вернуться JSON с `"ok":true`.
11. Проверьте `/panel/` и вход.

Netlify выдаст бесплатный адрес `https://имя-проекта.netlify.app`. Свой домен не нужен.

### Важно по безопасности

Текущий логин: `main_admin`. Пароль, который был задан для теста, перед реальным публичным запуском лучше заменить на случайный пароль из менеджера паролей.

`AUTH_SECRET`, `ADMIN_PASSWORD_SALT` и `ADMIN_PASSWORD_HASH` не имеют рабочих fallback-значений в исходниках. Если переменные не заданы, панель намеренно не даст войти.

Netlify на всех планах дает базовую сетевую DDoS-защиту. В коде дополнительно включены две rate-limit политики, доступные на Free: жесткая на `/api/login` и более широкая на `/api/admin/cards`. После deploy проверьте post-processing log Netlify, чтобы убедиться, что правила приняты.

## Как сменить пароль

В проекте используется scrypt-хеш. Можно оставить тестовый hash/salt, но для production лучше задать свои `ADMIN_PASSWORD_SALT` и `ADMIN_PASSWORD_HASH` через Netlify Environment Variables и не коммитить их в публичный GitHub.

Пример генерации:

```bash
node scripts/hash-password.mjs "НОВЫЙ_СЛОЖНЫЙ_ПАРОЛЬ"
```

Скопируйте выведенные значения в Netlify как `ADMIN_PASSWORD_SALT` и `ADMIN_PASSWORD_HASH`.

## Юридический чек перед запуском

Откройте `LEGAL_CHECKLIST.md`. В первую очередь заполните сведения владельца в `site/legal.html` и `site/privacy.html`, а для рекламных размещений используйте реальные данные рекламодателя и полученный через корректный процесс erid. Не придумывайте erid.
