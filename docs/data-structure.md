# Структура данных Jira

## Общее описание

Данные из Jira обрабатываются и структурируются для использования в приложении. Основная структура состоит из следующих компонентов:

```javascript
{
  hierarchy: {
    rootIssues: [...], // Корневые задачи
    allIssues: [...]   // Все задачи
  },
  main_issue_key: "PROJ-123",
  processed_issues: [...]
}
```

## Компоненты структуры

### 1. Иерархия задач (`hierarchy`)

Объект, содержащий структуру связей между задачами.

#### Свойства:
- `rootIssues`: Массив задач верхнего уровня, которые не являются подзадачами других задач
- `allIssues`: Полный список всех задач, включая подзадачи

#### Использование:
- Построение дерева зависимостей
- Определение главной задачи
- Подсчет общего количества задач

### 2. Главная задача (`main_issue_key`)

Ключ главной задачи, вокруг которой строится вся структура.

#### Свойства:
- Тип: строка
- Формат: "PROJ-123"

#### Использование:
- Определение центральной задачи
- Фильтрация связанных задач
- Построение иерархии

### 3. Обработанные задачи (`processed_issues`)

Массив задач с обработанными данными.

#### Структура задачи:
```javascript
{
  key: "PROJ-123",
  summary: "Название задачи",
  status: "In Progress",
  created_date: "2024-03-20 10:00:00",
  current_status: "In Progress",
  status_movements: [...],
  flag_changes: [...],
  status_durations: [...],
  total_duration: "48.5",
  total_duration_formatted: "2d 0h 30m",
  is_completed: false,
  completion_date: null,
  is_blocked: false,
  links: [...],
  parent_key: null,
  blocker_periods: [...],
  current_blockers: [...]
}
```

#### Использование:
- Построение диаграммы Ганта
- Генерация статистики
- Анализ зависимостей

## Процесс обработки данных

### 1. Загрузка данных
```javascript
const fetchData = async () => {
  const issues = await fetchJiraData(inputValues);
  const processed = issues.map(processJiraIssue);
  setProcessedIssues(processed);
  
  const hierarchy = buildIssueHierarchy(processed);
  setHierarchy(hierarchy);
};
```

### 2. Построение иерархии
```javascript
export const buildIssueHierarchy = (issues) => {
  const rootIssues = issues.filter(issue => !issue.parent_key);
  const allIssues = issues;
  
  return {
    rootIssues,
    allIssues
  };
};
```

### 3. Конвертация в формат Ганта
```javascript
export const convertToGanttFormat = (processedIssues, hierarchy) => {
  const mainIssue = processedIssues.find(issue => 
    issue.key === hierarchy.rootIssues[0]?.key);
  
  // Конвертация в формат Ганта
};
```

## Особенности обработки

### 1. Иерархическая структура
- Определяет связи между задачами
- Содержит задачи верхнего уровня
- Включает полный список всех задач

### 2. Главная задача
- Определяет центральную задачу
- Используется для фильтрации
- Служит основой для построения связей

### 3. Обработанные данные
- Содержит все задачи с обработанными данными
- Используется для визуализации
- Поддерживает анализ зависимостей

## Форматы данных

### 1. Длительность
- Хранится в часах
- Форматируется в читаемый вид (недели, дни, часы, минуты)
- Пример: "2d 0h 30m"

### 2. Даты
- Формат: "YYYY-MM-DD HH:mm:ss"
- Используется для всех временных меток
- Поддерживает сортировку и сравнение

### 3. Статусы
- Текущий статус задачи
- История изменений статусов
- Длительность каждого статуса

### 4. Блокеры
- Текущие активные блокеры
- История периодов блокировок
- Типы блокеров и время блокировки 