// Преобразует обработанные данные Jira в формат для диаграммы Ганта
export const convertToGanttFormat = (processedIssues, hierarchy) => {
  const tasks = [];
  let idCounter = 1;
  const issueIdMap = new Map(); // Для сопоставления ключей задач с ID в диаграмме
  
  // Сначала обрабатываем корневые задачи
  hierarchy.rootIssues.forEach(rootIssue => {
    const rootId = idCounter++;
    issueIdMap.set(rootIssue.key, rootId);
    
    // Создаем фазы для задачи
    const phases = rootIssue.status_durations ? rootIssue.status_durations.map(duration => ({
      status: duration.status.toLowerCase().replace(/\s+/g, '_'),
      startDate: new Date(duration.start_date),
      endDate: new Date(duration.end_date || new Date())
    })) : [];
    
    // Добавляем корневую задачу
    tasks.push({
      id: rootId,
      jiraId: rootIssue.key,
      name: rootIssue.summary,
      isParent: rootIssue.children && rootIssue.children.length > 0,
      isExpanded: true,
      children: [],
      phases: phases
    });
    
    // Рекурсивно обрабатываем дочерние задачи
    const processChildren = (parent, parentId) => {
      if (!parent.children) return;
      
      parent.children.forEach(child => {
        const childId = idCounter++;
        issueIdMap.set(child.key, childId);
        
        const childPhases = child.status_durations ? child.status_durations.map(duration => ({
          status: duration.status.toLowerCase().replace(/\s+/g, '_'),
          startDate: new Date(duration.start_date),
          endDate: new Date(duration.end_date || new Date())
        })) : [];
        
        // Добавляем дочернюю задачу
        tasks.push({
          id: childId,
          jiraId: child.key,
          name: child.summary,
          parentId: parentId, // Всегда устанавливаем родителя на основе иерархии
          isParent: child.children && child.children.length > 0,
          isExpanded: true,
          children: [],
          phases: childPhases
        });
        
        // Добавляем ID дочерней задачи в список детей родителя
        const parentTask = tasks.find(t => t.id === parentId);
        if (parentTask) {
          parentTask.children.push(childId);
        }
        
        // Рекурсивно обрабатываем детей этой задачи
        if (child.children && child.children.length > 0) {
          processChildren(child, childId);
        }
      });
    };
    
    // Запускаем рекурсивную обработку для каждой корневой задачи
    processChildren(rootIssue, rootId);
  });
  
  return tasks;
};

// Фильтрует задачи по выбранным статусам
export const filterTasksByStatuses = (tasks, selectedStatuses) => {
  if (!tasks || tasks.length === 0 || !selectedStatuses || selectedStatuses.length === 0) {
    return tasks;
  }
  
  // Нормализуем статусы для сравнения
  const normalizedStatuses = selectedStatuses.map(status => 
    status.toLowerCase().replace(/\s+/g, '_')
  );
  
  // Фильтруем фазы в каждой задаче
  const tasksWithFilteredPhases = tasks.map(task => {
    // Для родительских задач без фаз просто возвращаем задачу как есть
    if (task.isParent && (!task.phases || task.phases.length === 0)) {
      return { ...task };
    }
    
    // Фильтруем фазы по выбранным статусам
    const filteredPhases = task.phases.filter(phase => 
      normalizedStatuses.includes(phase.status.toLowerCase())
    );
    
    return { ...task, phases: filteredPhases };
  });
  
  // Возвращаем только задачи, у которых есть фазы или это родительские задачи
  return tasksWithFilteredPhases.filter(task => 
    task.isParent || (task.phases && task.phases.length > 0)
  );
};

// Создает тестовые данные для диаграммы
export const createTestGanttData = () => {
    // Получаем текущую дату
    const currentDate = new Date();
    
    // Создаем даты для задач
    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);
    
    const oneWeekLater = new Date(currentDate);
    oneWeekLater.setDate(currentDate.getDate() + 7);
    
    const twoWeeksLater = new Date(currentDate);
    twoWeeksLater.setDate(currentDate.getDate() + 14);
    
    // Создаем тестовый набор данных с 3 уровнями вложенности
    const testTasks = [
      {
        id: 1,
        jiraId: 'TEST-100',
        name: 'Тестовый проект',
        isParent: true,
        isExpanded: true,
        children: [2, 3, 7],
        phases: []
      },
      {
        id: 2,
        jiraId: 'TEST-101',
        name: 'Завершенная задача',
        parentId: 1,
        isParent: true,
        isExpanded: true,
        children: [5, 6],
        phases: [
          { 
            status: 'backlog', 
            startDate: new Date(oneWeekAgo.getTime() - 5 * 24 * 60 * 60 * 1000),
            endDate: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'development', 
            startDate: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000),
            endDate: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'testing', 
            startDate: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000),
            endDate: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'completed', 
            startDate: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000),
            endDate: oneWeekAgo
          }
        ]
      },
      {
        id: 5,
        jiraId: 'TEST-104',
        name: 'Подзадача 1 завершенной задачи',
        parentId: 2,
        phases: [
          { 
            status: 'backlog', 
            startDate: new Date(oneWeekAgo.getTime() - 5 * 24 * 60 * 60 * 1000),
            endDate: new Date(oneWeekAgo.getTime() - 3 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'completed', 
            startDate: new Date(oneWeekAgo.getTime() - 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        id: 6,
        jiraId: 'TEST-105',
        name: 'Подзадача 2 завершенной задачи',
        parentId: 2,
        phases: [
          { 
            status: 'development', 
            startDate: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000),
            endDate: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'testing', 
            startDate: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000),
            endDate: oneWeekAgo
          }
        ]
      },
      {
        id: 3,
        jiraId: 'TEST-102',
        name: 'Задача на следующую неделю',
        parentId: 1,
        isParent: true,
        isExpanded: true,
        children: [4],
        phases: [
          { 
            status: 'backlog', 
            startDate: currentDate,
            endDate: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'development', 
            startDate: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            endDate: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'testing', 
            startDate: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000),
            endDate: oneWeekLater
          }
        ]
      },
      {
        id: 4,
        jiraId: 'TEST-103',
        name: 'Задача на две недели вперед',
        parentId: 3,
        phases: [
          { 
            status: 'backlog', 
            startDate: oneWeekLater,
            endDate: new Date(oneWeekLater.getTime() + 3 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'development', 
            startDate: new Date(oneWeekLater.getTime() + 3 * 24 * 60 * 60 * 1000),
            endDate: twoWeeksLater
          }
        ]
      },
      {
        id: 7,
        jiraId: 'TEST-106',
        name: 'Еще одна родительская задача',
        parentId: 1,
        isParent: true,
        isExpanded: true,
        children: [8],
        phases: [
          { 
            status: 'backlog', 
            startDate: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000)
          },
          { 
            status: 'development', 
            startDate: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            endDate: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        id: 8,
        jiraId: 'TEST-107',
        name: 'Подзадача новой родительской задачи',
        parentId: 7,
        phases: [
          { 
            status: 'backlog', 
            startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
            endDate: currentDate
          },
          { 
            status: 'development', 
            startDate: currentDate,
            endDate: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000)
          }
        ]
      }
    ];
    
    // Создаем формат данных, совместимый с formattedData
    const testFormattedData = {
      main_issue: {
        key: 'TEST-100',
        summary: 'Тестовый проект',
        status_durations: []
      },
      linked_issues: [
        {
          key: 'TEST-101',
          summary: 'Завершенная задача',
          parent_key: 'TEST-100',
          status_durations: [
            { status: 'Backlog', start_date: new Date(oneWeekAgo.getTime() - 5 * 24 * 60 * 60 * 1000), end_date: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000) },
            { status: 'Development', start_date: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000), end_date: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000) },
            { status: 'Testing', start_date: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000), end_date: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000) },
            { status: 'Completed', start_date: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000), end_date: oneWeekAgo }
          ]
        },
        {
          key: 'TEST-104',
          summary: 'Подзадача 1 завершенной задачи',
          parent_key: 'TEST-101',
          status_durations: [
            { status: 'Backlog', start_date: new Date(oneWeekAgo.getTime() - 5 * 24 * 60 * 60 * 1000), end_date: new Date(oneWeekAgo.getTime() - 3 * 24 * 60 * 60 * 1000) },
            { status: 'Completed', start_date: new Date(oneWeekAgo.getTime() - 3 * 24 * 60 * 60 * 1000), end_date: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000) }
          ]
        },
        {
          key: 'TEST-105',
          summary: 'Подзадача 2 завершенной задачи',
          parent_key: 'TEST-101',
          status_durations: [
            { status: 'Development', start_date: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000), end_date: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000) },
            { status: 'Testing', start_date: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000), end_date: oneWeekAgo }
          ]
        },
        {
          key: 'TEST-102',
          summary: 'Задача на следующую неделю',
          parent_key: 'TEST-100',
          status_durations: [
            { status: 'Backlog', start_date: currentDate, end_date: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000) },
            { status: 'Development', start_date: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000), end_date: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000) },
            { status: 'Testing', start_date: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000), end_date: oneWeekLater }
          ]
        },
        {
          key: 'TEST-103',
          summary: 'Задача на две недели вперед',
          parent_key: 'TEST-102',
          status_durations: [
            { status: 'Backlog', start_date: oneWeekLater, end_date: new Date(oneWeekLater.getTime() + 3 * 24 * 60 * 60 * 1000) },
            { status: 'Development', start_date: new Date(oneWeekLater.getTime() + 3 * 24 * 60 * 60 * 1000), end_date: twoWeeksLater }
          ]
        },
        {
          key: 'TEST-106',
          summary: 'Еще одна родительская задача',
          parent_key: 'TEST-100',
          status_durations: [
            { status: 'Backlog', start_date: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000), end_date: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000) },
            { status: 'Development', start_date: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000), end_date: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000) }
          ]
        },
        {
          key: 'TEST-107',
          summary: 'Подзадача новой родительской задачи',
          parent_key: 'TEST-106',
          status_durations: [
            { status: 'Backlog', start_date: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000), end_date: currentDate },
            { status: 'Development', start_date: currentDate, end_date: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000) }
          ]
        }
      ]
    };
    
    // Создаем статусы для фильтрации
    const testStatuses = ['Backlog', 'Development', 'Testing', 'Completed'];
    
    // Создаем формат данных для StatusFilter
    const projectStatuses = [
      {
        id: 'test-issue-type',
        name: 'Тестовый тип задачи',
        statuses: testStatuses.map((status, index) => ({ 
          id: `status-${index}`,
          name: status,
          statusCategory: {
            name: status === 'Completed' ? 'Done' : 
                  status === 'Backlog' ? 'To Do' : 'In Progress'
          }
        }))
      }
    ];
    
    return {
      ganttTasks: testTasks,
      formattedData: testFormattedData,
      selectedStatuses: testStatuses,
      projectStatuses: projectStatuses
    };
  }; 