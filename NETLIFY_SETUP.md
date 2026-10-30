# Netlify: настройка панели РКО Пульс

## 1. Структура репозитория

В корне GitHub-репозитория должны лежать именно:

- `netlify.toml`
- `package.json`
- папка `site/`
- папка `netlify/functions/`
- папка `scripts/`

Если весь проект лежит внутри подпапки (например `RKO-Puls-site/`), укажите эту подпапку в Netlify как **Base directory**. Если перечисленные файлы уже находятся в корне репозитория, Base directory оставьте пустым.

`netlify.toml` уже задает:

- Publish directory: `site`
- Functions directory: `netlify/functions`

После деплоя проверьте адрес `/api/health`. Он должен вернуть JSON с `"ok": true`.

## 2. Логин панели

По умолчанию логин: `main_admin`.

Можно заменить через переменную Netlify:

`ADMIN_LOGIN`

## 3. Пароль панели

Готового пароля в репозитории нет. Это сделано специально, чтобы пароль нельзя было украсть из публичного GitHub.

Придумайте пароль длиной не менее 14 символов и локально из корня проекта выполните:

```bash
node scripts/hash-password.mjs "ВАШ_ПАРОЛЬ"
```

Скрипт напечатает две строки:

- `ADMIN_PASSWORD_SALT=...`
- `ADMIN_PASSWORD_HASH=...`

Добавьте оба значения в Netlify -> Project configuration -> Environment variables.

Также добавьте `AUTH_SECRET` - случайную секретную строку длиной минимум 32 символа. Например, можно сгенерировать:

```bash
openssl rand -hex 32
```

И добавить результат как значение `AUTH_SECRET`.

Итого в Netlify должны быть:

- `ADMIN_LOGIN` (необязательно; по умолчанию `main_admin`)
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `AUTH_SECRET`

После изменения environment variables запустите новый deploy.

## 4. Если панель пишет «API панели не найден»

Это HTTP 404 от `/api/session` или `/api/login`. Значит проблема еще до проверки логина и пароля: Netlify не задеплоил Functions для этого проекта.

Проверьте:

1. корень проекта / Base directory;
2. что `netlify.toml` попал в GitHub;
3. что `netlify/functions/session.js`, `login.js` и остальные функции находятся в репозитории;
4. что деплой завершился без ошибки установки `@netlify/blobs`;
5. откройте `/api/health` на опубликованном домене.

## 5. Картинки карточек

В панели можно загрузить PNG, JPG/JPEG или WebP. Перед отправкой большая картинка уменьшается до разумного размера и конвертируется в сжатый WebP, когда браузер это поддерживает.

Файл хранится в Netlify Blobs в бинарном виде, отдельно от JSON карточек. В карточке сохраняется только URL изображения. Изображения доступны через `/api/card-image?id=...`.
