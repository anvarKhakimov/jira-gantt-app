// Функция для определения связей между задачами
export const buildIssueHierarchy = (issues) => {
  // Создаем карту для быстрого доступа к задачам по ключу
  const issueMap = new Map();
  issues.forEach(issue => {
    issueMap.set(issue.key, {
      ...issue,
      children: [],
      level: 0, // Уровень в иерархии
      parent: null // Ссылка на родительскую задачу
    });
  });
  
  // Определяем связи родитель-потомок
  issues.forEach(issue => {
    // Проверяем поле parent_key, если оно есть
    if (issue.parent_key && issueMap.has(issue.parent_key)) {
      const parent = issueMap.get(issue.parent_key);
      const child = issueMap.get(issue.key);
      
      if (parent && child && !child.parent) {
        // Проверяем, не создаст ли это циклическую ссылку
        if (!isAncestor(child, parent.key, issueMap)) {
          parent.children.push(child);
          child.parent = parent.key; // Храним только ключ родителя, а не объект
        } else {
          console.warn(`Обнаружена циклическая ссылка: ${parent.key} -> ${child.key}`);
        }
      }
    }
    
    // Проверяем связи из Jira
    if (issue.links) {
      issue.links.forEach(link => {
        // Проверяем различные типы связей, которые указывают на иерархию
        const isInclusionLink = 
          link.type === 'consists of' || 
          link.type === 'includes' || 
          link.type === 'Inclusion' ||
          link.type === 'включает' ||
          link.type === 'состоит из';
        
        const isPartOfLink = 
          link.type === 'is part of' || 
          link.type === 'является частью' ||
          link.type === 'входит в состав';
        
        if (isInclusionLink) {
          const childKey = link.outwardIssue?.key;
          if (childKey && issueMap.has(childKey)) {
            const child = issueMap.get(childKey);
            const parent = issueMap.get(issue.key);
            
            if (parent && child && !child.parent) {
              // Проверяем, не создаст ли это циклическую ссылку
              if (!isAncestor(child, parent.key, issueMap)) {
                parent.children.push(child);
                child.parent = parent.key; // Храним только ключ родителя, а не объект
              } else {
                console.warn(`Обнаружена циклическая ссылка: ${parent.key} -> ${child.key}`);
              }
            }
          }
        } else if (isPartOfLink) {
          const parentKey = link.inwardIssue?.key;
          if (parentKey && issueMap.has(parentKey)) {
            const parent = issueMap.get(parentKey);
            const child = issueMap.get(issue.key);
            
            if (parent && child && !child.parent) {
              // Проверяем, не создаст ли это циклическую ссылку
              if (!isAncestor(child, parent.key, issueMap)) {
                parent.children.push(child);
                child.parent = parent.key; // Храним только ключ родителя, а не объект
              } else {
                console.warn(`Обнаружена циклическая ссылка: ${parent.key} -> ${child.key}`);
              }
            }
          }
        }
      });
    }
  });
  
  // Функция для проверки, является ли потенциальный родитель потомком задачи
  function isAncestor(issue, potentialParentKey, issueMap) {
    // Проверяем, не является ли потенциальный родитель потомком задачи
    const visited = new Set();
    
    function checkChildren(currentIssue) {
      if (!currentIssue || visited.has(currentIssue.key)) return false;
      visited.add(currentIssue.key);
      
      if (currentIssue.key === potentialParentKey) return true;
      
      for (const child of currentIssue.children) {
        if (checkChildren(child)) return true;
      }
      
      return false;
    }
    
    return checkChildren(issue);
  }
  
  // Вычисляем уровни в иерархии
  const calculateLevels = (issueKey, level, visited = new Set()) => {
    if (visited.has(issueKey)) return; // Предотвращаем бесконечную рекурсию
    visited.add(issueKey);
    
    const issue = issueMap.get(issueKey);
    if (!issue) return;
    
    issue.level = level;
    issue.children.forEach(child => calculateLevels(child.key, level + 1, visited));
  };
  
  // Находим корневые задачи (без родителей)
  const rootIssues = Array.from(issueMap.values()).filter(issue => !issue.parent);
  rootIssues.forEach(issue => calculateLevels(issue.key, 0, new Set()));
  
  return {
    rootIssues,
    allIssues: Array.from(issueMap.values())
  };
};

// Функция для определения основной задачи, если она не указана явно
export const determineMainIssue = (issues, mainIssueKey = null) => {
  if (mainIssueKey && issues.some(issue => issue.key === mainIssueKey)) {
    return mainIssueKey;
  }
  
  // Если основная задача не указана, пытаемся определить её
  // Вариант 1: Задача с наибольшим количеством связей
  const issueConnections = issues.map(issue => ({
    key: issue.key,
    connections: issues.filter(i => 
      i.parent_key === issue.key || 
      (i.links && i.links.some(link => 
        (link.outwardIssue?.key === issue.key || link.inwardIssue?.key === issue.key)
      ))
    ).length
  }));
  
  const mostConnected = issueConnections.sort((a, b) => b.connections - a.connections)[0];
  
  // Вариант 2: Задача с наивысшим уровнем (эпик или родительская задача)
  const epics = issues.filter(issue => issue.fields.issuetype.name === 'Epic');
  if (epics.length > 0) {
    return epics[0].key;
  }
  
  return mostConnected ? mostConnected.key : (issues[0]?.key || null);
}; 