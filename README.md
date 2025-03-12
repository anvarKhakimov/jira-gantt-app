# Jira Gantt App

## О проекте

Jira Gantt App - это приложение для визуализации задач из Jira в формате диаграммы Ганта. Приложение позволяет:

- Отображать длительность задач с указанием фаз (статусов)
- Планировать фазы задач в будущем
- Наглядно представлять временные рамки и иерархию между задачами

## Установка

1. Склонируйте репозиторий:
```bash
git clone <url-репозитория>
cd jira-gantt-app
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env-example` и настройте необходимые переменные окружения:
   - `REACT_APP_JIRA_USERNAME` и `REACT_APP_JIRA_PASSWORD` - учетные данные для доступа к Jira
   - `REACT_APP_JIRA_URL` - URL сервера Jira
   - `REACT_APP_PROXY_PORT` - порт для запуска прокси-сервера (по умолчанию 3001)
   - `REACT_APP_PROXY_HOST` - хост прокси-сервера (по умолчанию localhost)

## Запуск приложения

### 1. Запуск прокси-сервера

Сначала необходимо запустить прокси-сервер для обхода ограничений CORS при работе с API Jira:

```bash
npm run proxy
```

Прокси-сервер запустится на порту, указанном в переменной окружения `REACT_APP_PROXY_PORT` (по умолчанию 3001).

### 2. Запуск клиентского приложения

В отдельном терминале запустите клиентское приложение:

```bash
npm start
```

Приложение будет доступно по адресу http://localhost:3000.

## Технологии

- React
- Material UI
- Express (для прокси-сервера)
- Tailwind CSS

## Текущий статус

Проект находится в активной разработке. Планируется значительное расширение функциональности и улучшение пользовательского интерфейса.

## Лицензия

MIT
