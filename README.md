<p align="center">
  <b>Русский</b> | 
  <a href="README_EN.md">English</a> | 
  <a href="README_ZH.md">中文</a> | 
  <a href="README_ES.md">Español</a> | 
  <a href="README_HI.md">हिन्दी</a> | 
  <a href="README_AR.md">العربية</a>
</p>

# 🧠 Карта знаний

Интерактивная карта знаний с генерацией через LLM. Пользователи вводят свой URL и модель LLM для генерации деревьев знаний.

**Live Demo:** https://knowledge-graph-swart.vercel.app

## Возможности

- 🌳 Генерация деревьев знаний (12-15 узлов) через LLM
- 🔍 Web-search для актуальной информации (DuckDuckGo)
- 🎨 Интерактивная визуализация D3.js (зум, перетаскивание, hover-эффекты)
- 📝 AI-действия: подробнее, проще, ребёнку, примеры, тесты, ошибки, конспекты
- 💾 Сохранение деревьев в localStorage
- 🌍 Мультиязычность (6 языков: ru, en, zh, es, hi, ar)
- 🎯 Тёмная и светлая темы
- 📄 Экспорт в PDF

## Живой демо

https://knowledge-graph-swart.vercel.app

1. Откройте демо
2. Перейдите в Настройки
3. Введите URL вашего LLM сервера (LM Studio, Ollama, OpenAI-compatible)
4. Укажите модель
5. Вернитесь на главную и введите тему

## Быстрый старт (Vercel)

Проект уже развёрнут на Vercel. Для использования:

1. Откройте https://knowledge-graph-swart.vercel.app
2. Нажмите ⚙️ Настройки
3. Введите URL вашего LLM сервера (например: `http://localhost:1234/v1/chat/completions`)
4. Введите имя модели (например: `google/gemma-4-12b-qat`)
5. Вернитесь на главную и введите тему для генерации дерева знаний

## Локальная установка

### Клиент + API (Vercel-compatible)

```bash
git clone https://github.com/CaBaGG4811/knowledge-graph.git
cd knowledge-graph
npm install
npx vercel dev
```

### Полный стек (Express + SQLite)

```bash
cd server
npm install
npm start
```

Откройте http://localhost:3000

## Структура проекта

```
knowledge-graph/
├── api/                    # Vercel Serverless Functions
│   ├── _lib.js            # Утилиты (LLM, web-search, парсинг)
│   ├── generate.js        # Генерация деревьев
│   ├── generate/
│   │   ├── check.js       # Проверка темы
│   │   └── action.js      # AI-действия
│   ├── settings.js        # Настройки
│   ├── trees.js           # CRUD деревьев
│   └── trees/[id].js      # Дерево по ID
├── client/                 # Фронтенд (SPA)
│   ├── index.html
│   ├── scripts/
│   │   ├── app.js         # Точка входа
│   │   ├── graph.js       # D3.js визуализация
│   │   ├── modal.js       # Модалки с AI-действиями
│   │   ├── pages/
│   │   │   ├── home.js    # Главная + sidebar
│   │   │   └── settings.js
│   │   ├── router.js      # Hash-роутинг
│   │   ├── api.js         # HTTP-клиент
│   │   ├── i18n.js        # Переводы (6 языков)
│   │   └── store.js       # Глобальное состояние
│   └── styles/
│       ├── main.css
│       └── themes/
├── server/                 # Express сервер (для локальной разработки)
│   ├── server.js
│   ├── db.js              # SQLite
│   └── routes/
├── vercel.json
└── package.json
```

## Поддерживаемые LLM

Проект работает с любым LLM-сервером, совместимым с OpenAI API:

- **LM Studio** — локальный сервер
- **Ollama** — локальный сервер
- **OpenAI API** — облачный API
- **Google Gemini** — облачный API (через OpenAI-совместимый прокси)
- **Anthropic** — облачный API (через OpenAI-совместимый прокси)
- **Любой OpenAI-compatible сервер**

## Технологии

- **Фронтенд:** Vanilla JS, D3.js, CSS
- **Бэкенд:** Node.js, Express (локально) / Vercel Serverless Functions (облако)
- **БД:** SQLite (локально) / In-memory + localStorage (облако)
- **LLM:** OpenAI-compatible API

## Лицензия

MIT
