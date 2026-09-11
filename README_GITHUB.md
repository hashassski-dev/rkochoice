# FOXRKO - запуск через GitHub + Netlify

Этот проект подготовлен для хранения кода в GitHub и бесплатного деплоя через Netlify.

> Важно: GitHub Pages подходит только для статической витрины. Админка `/panel/`, авторизация, cookie, Netlify Functions и сохранение карточек там работать не будут. Поэтому правильная схема для этого проекта: **GitHub хранит код -> Netlify запускает сайт и backend**.

## 1. Что установить

Нужны:

- Git
- Node.js 20+
- аккаунт GitHub
- аккаунт Netlify

Проверка:

```bash
git --version
node -v
npm -v
```

## 2. Загрузить проект в GitHub

Создайте новый пустой репозиторий на GitHub, например `foxrko-showcase`.

В терминале из папки проекта:

```bash
git init
git add .
git commit -m "Initial FOXRKO showcase"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/foxrko-showcase.git
git push -u origin main
```

Если GitHub попросит авторизацию, удобнее войти через GitHub Desktop или использовать Personal Access Token вместо пароля.

## 3. Подключить GitHub к Netlify

1. Откройте Netlify.
2. `Add new project` -> `Import an existing project`.
3. Выберите GitHub.
4. Разрешите Netlify доступ к репозиторию.
5. Выберите `foxrko-showcase`.
6. Build command оставьте пустым.
7. Publish directory уже задан в `netlify.toml`: `site`.
8. Functions directory уже задан: `netlify/functions`.
9. Нажмите Deploy.

После этого Netlify даст бесплатный адрес вида:

```text
https://foxrko-showcase.netlify.app
```

## 4. Настроить секреты админки

В Netlify откройте:

`Project configuration -> Environment variables`

Добавьте:

### AUTH_SECRET

Случайная строка минимум 32 символа, лучше 64+.

Пример генерации локально:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### ADMIN_PASSWORD_SALT и ADMIN_PASSWORD_HASH

Сначала установите зависимости:

```bash
npm install
```

Затем:

```bash
node scripts/hash-password.mjs "ВАШ_НОВЫЙ_СЛОЖНЫЙ_ПАРОЛЬ"
```

Скопируйте выведенные `ADMIN_PASSWORD_SALT` и `ADMIN_PASSWORD_HASH` в Netlify Environment Variables.

После добавления переменных сделайте новый deploy.

## 5. Проверить после публикации

Откройте:

```text
https://ВАШ-САЙТ.netlify.app/api/health
```

Должен вернуться JSON с `"ok": true`.

Потом:

```text
https://ВАШ-САЙТ.netlify.app/panel/
```

Проверьте вход, создание карточки, редактирование и удаление.

## 6. Как обновлять сайт

Любые изменения в VS Code:

```bash
git add .
git commit -m "Обновил карточки и дизайн"
git push
```

Netlify увидит новый commit и автоматически задеплоит новую версию.

## 7. Локальный запуск полной версии

Live Server показывает только статическую часть и не запускает backend.

Для полной версии:

```bash
npm install
npm i -g netlify-cli
netlify dev
```

Обычно:

```text
http://localhost:8888
http://localhost:8888/panel/
http://localhost:8888/api/health
```

## 8. Что уже настроено для GitHub

В проект добавлены:

- `.gitignore` - секреты, `node_modules` и локальные файлы не попадут в репозиторий;
- `.github/workflows/ci.yml` - GitHub Actions проверяет синтаксис функций и запускает security smoke test;
- `.github/dependabot.yml` - GitHub будет предлагать обновления npm-зависимостей;
- `netlify.toml` - готовые настройки публикации, функций и HTTP security headers.

## 9. Перед публичным запуском

- смените тестовый пароль;
- не коммитьте реальные секреты в GitHub;
- заполните сведения владельца сайта в `site/legal.html` и `site/privacy.html`;
- проверьте `LEGAL_CHECKLIST.md`;
- вставляйте только реальные партнерские ссылки;
- если карточка является рекламой, используйте корректные сведения рекламодателя и реальный erid;
- не используйте GitHub Issues/репозиторий для хранения ФИО, ИНН, паспортных данных и другой информации лидов.

## Данные карточек в JSON

В новой версии карточки работают как JSON-документ:

```json
{
  "version": 1,
  "updated_at": "2026-09-08T00:00:00.000Z",
  "offers": [ ... ]
}
```

- `site/data/offers.json` - стартовый JSON и fallback, если backend недоступен.
- После первого изменения через `/panel/` рабочий JSON хранится в Netlify Blobs под ключом `offers.json`.
- Главная страница получает только публичные поля через `/api/cards`.
- `partner`, `admin_note`, `active` и другие внутренние данные публичному посетителю не отдаются.
- `types`, `price_mode`, `search_tags` используются фильтрами, но сами по себе в карточке не отображаются.
- При `Сохранить` панель отправляет полный объект асинхронно, ждет подтверждения записи сервером и только после этого обновляет интерфейс. Это исключает потерю `link` при редактировании.

Если нужно полностью сбросить данные к стартовым, удалите blob `offers.json` в хранилище проекта либо разверните новый сайт/хранилище. Изменение `site/data/offers.json` само по себе не перезаписывает уже существующий runtime JSON в Blobs.
