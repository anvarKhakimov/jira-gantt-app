import React, { useState, useRef, useEffect } from 'react';

// Функция для генерации цветов на основе статусов
const generateStatusColors = (statuses) => {
  // Предопределенные цвета для часто используемых статусов
  const predefinedColors = {
    backlog: '#E0E0E0',
    development: '#90CAF9',
    review: '#FFE082',
    testing: '#A5D6A7',
    completed: '#81C784',
  };
  
  // Набор цветов для автоматической генерации
  const colorPalette = [
    '#F48FB1', // розовый
    '#CE93D8', // фиолетовый
    '#9FA8DA', // индиго
    '#81D4FA', // голубой
    '#80DEEA', // циан
    '#80CBC4', // бирюзовый
    '#C5E1A5', // светло-зеленый
    '#E6EE9C', // лаймовый
    '#FFE082', // янтарный
    '#FFCC80', // оранжевый
    '#FFAB91', // глубокий оранжевый
    '#BCAAA4', // коричневый
    '#B0BEC5', // синевато-серый
  ];
  
  const result = {};
  let colorIndex = 0;
  
  statuses.forEach(status => {
    if (predefinedColors[status]) {
      // Используем предопределенный цвет, если он существует
      result[status] = predefinedColors[status];
    } else {
      // Иначе берем цвет из палитры
      result[status] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
  });
  
  return result;
};

// Вспомогательные функции для работы с датами
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // корректировка для недели, начинающейся с понедельника
  return new Date(d.setDate(diff));
};

const getEndOfWeek = (date) => {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return endOfWeek;
};

const formatWeekLabel = (date) => {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = getEndOfWeek(date);
  return `${startOfWeek.getDate()}.${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}.${endOfWeek.getMonth() + 1}`;
};

const isSameDay = (date1, date2) => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
};

const isSameWeek = (date1, date2) => {
  const startOfWeek1 = getStartOfWeek(date1);
  const startOfWeek2 = getStartOfWeek(date2);
  return isSameDay(startOfWeek1, startOfWeek2);
};

// Функция для работы с localStorage
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Ошибка при чтении из localStorage (${key}):`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Ошибка при записи в localStorage (${key}):`, error);
    }
  };

  return [storedValue, setValue];
};

// Функция для получения названия месяца
const getMonthName = (month) => {
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return monthNames[month];
};

// Функция для получения номера квартала
const getQuarter = (month) => {
  return Math.floor(month / 3) + 1;
};

const GanttChart = ({ tasks: initialTasks, onTasksUpdate, showHierarchy, onHierarchyChange }) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [hoveredTask, setHoveredTask] = useState(null);
  const [selectedView, setSelectedView] = useLocalStorage('ganttView', 'days'); // Используем localStorage
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [hiddenStatuses, setHiddenStatuses] = useLocalStorage('ganttHiddenStatuses', []); // Используем localStorage
  const [sortByStartDate, setSortByStartDate] = useLocalStorage('ganttSortByStartDate', false); // Используем localStorage
  const [dragInfo, setDragInfo] = useState(null); // Информация о перетаскивании
  const [editModalOpen, setEditModalOpen] = useState(false); // Состояние модального окна
  const [editingTask, setEditingTask] = useState(null); // Задача для редактирования
  const [editingPhase, setEditingPhase] = useState(null); // Фаза для редактирования
  const timelineRef = useRef(null);
  
  // Получаем текущую дату для ограничения редактирования прошлых событий
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Сбрасываем время до начала дня
  
  // Добавляем эффект для обновления задач при изменении initialTasks
  useEffect(() => {
    setTasks(initialTasks || []);
  }, [initialTasks]);
  
  // Извлекаем все уникальные статусы из задач
  const allStatuses = [...new Set(
    tasks
      .flatMap(task => task.phases || [])
      .map(phase => phase.status)
      .filter(Boolean)
  )];
  
  // Генерируем цвета для статусов
  const statusColors = generateStatusColors(allStatuses);
  
  // Определим фиксированную ширину для ячейки дня/недели (в пикселях)
  const DAY_CELL_WIDTH = 30;
  const WEEK_CELL_WIDTH = 100;
  
  const cellWidth = selectedView === 'days' ? DAY_CELL_WIDTH : WEEK_CELL_WIDTH;

  // Находим минимальную и максимальную даты для масштабирования
  const allDates = tasks
    .flatMap(task => task.phases)
    .flatMap(phase => [phase?.startDate, phase?.endDate])
    .filter(date => date);

  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();

  // Добавляем буфер в 2 дня или 1 неделю для визуального запаса
  if (selectedView === 'days') {
    minDate.setDate(minDate.getDate() - 2);
    
    // Обеспечиваем отображение минимум одной недели вперед от текущей даты
    const oneWeekFromNow = new Date(currentDate);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    // Используем максимальную из дат: текущий maxDate или oneWeekFromNow
    if (maxDate < oneWeekFromNow) {
      maxDate.setTime(oneWeekFromNow.getTime());
    }
    
    // Добавляем еще 2 дня к максимальной дате для визуального запаса
    maxDate.setDate(maxDate.getDate() + 2);
  } else { // weeks
    const startOfFirstWeek = getStartOfWeek(minDate);
    startOfFirstWeek.setDate(startOfFirstWeek.getDate() - 7); // Одна неделя назад
    minDate.setTime(startOfFirstWeek.getTime());
    
    const endOfLastWeek = getEndOfWeek(maxDate);
    endOfLastWeek.setDate(endOfLastWeek.getDate() + 7); // Одна неделя вперед
    maxDate.setTime(endOfLastWeek.getTime());
  }

  // Подготовка дат для временной шкалы в зависимости от представления
  let timeLabels = [];
  let totalCells = 0;
  
  if (selectedView === 'days') {
    // Дни
    totalCells = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000));
    
    timeLabels = Array.from({ length: totalCells }, (_, i) => {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      return {
        date,
        label: `${date.getDate()}.${date.getMonth() + 1}`
      };
    });
    
    // Определяем интервал для меток дней (каждую неделю)
    const dayMarkInterval = 7;
    
    // Определяем, какие даты будут видимыми
    timeLabels = timeLabels.map((label, index) => {
      // Проверяем, является ли день понедельником (начало недели)
      const isMonday = label.date.getDay() === 1;
      
      // Проверяем, является ли следующий день понедельником (для выделения границы)
      const isBeforeMonday = index < timeLabels.length - 1 && 
                             timeLabels[index + 1].date.getDay() === 1;
      
      return {
        ...label,
        isVisible: isMonday,
        isBeforeMonday: isBeforeMonday
      };
    });
    
  } else {
    // Недели
    // Убедимся, что minDate и maxDate начинаются с начала недели
    const startWeek = getStartOfWeek(minDate);
    const endWeek = getEndOfWeek(maxDate);
    
    // Вычисляем количество недель между startWeek и endWeek
    const weeksDiff = Math.ceil((endWeek - startWeek) / (7 * 24 * 60 * 60 * 1000));
    totalCells = weeksDiff;
    
    timeLabels = Array.from({ length: totalCells }, (_, i) => {
      const date = new Date(startWeek);
      date.setDate(date.getDate() + i * 7);
      return {
        date,
        label: formatWeekLabel(date),
        isVisible: true, // Все недельные метки видимы
        isWeekStart: true // Отмечаем, что это начало недели
      };
    });
  }
  
  // Рассчитываем общую ширину таймлайна
  const fullTimelineWidth = totalCells * cellWidth;
  
  // Обновляем ширину для контейнеров строк при изменении DOM
  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.scrollWidth);
    }
  }, [totalCells, timelineRef, selectedView]);

  // Функция для переключения состояния свернутости родительских задач
  const toggleExpand = (taskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, isExpanded: !task.isExpanded };
      }
      return task;
    }));
  };

  // Функция для переключения видимости статуса
  const toggleStatusVisibility = (status) => {
    setHiddenStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) // Удаляем статус из скрытых
        : [...prev, status] // Добавляем статус в скрытые
    );
  };

  // Функция для вычисления позиции и ширины фазы на диаграмме
  const calculatePhasePosition = (phase) => {
    if (!phase || !phase.startDate || !phase.endDate) return { left: 0, width: 0 };
    
    const isHidden = hiddenStatuses.includes(phase.status);
    
    const start = phase.startDate.getTime();
    const end = phase.endDate.getTime();
    
    let startOffset, phaseWidth;
    
    if (selectedView === 'days') {
      // Находим начало дня для minDate (00:00:00)
      const minDateStart = new Date(minDate);
      minDateStart.setHours(0, 0, 0, 0);
      
      // Рассчитываем полное количество миллисекунд в диапазоне таймлайна
      const timelineRangeMs = totalCells * 24 * 60 * 60 * 1000;
      
      // Рассчитываем смещение от начала таймлайна в миллисекундах
      const startOffsetMs = start - minDateStart.getTime();
      const durationMs = end - start;
      
      // Преобразуем миллисекунды в пиксели
      startOffset = (startOffsetMs / timelineRangeMs) * (totalCells * cellWidth);
      phaseWidth = (durationMs / timelineRangeMs) * (totalCells * cellWidth);
      
      // Минимальная ширина для видимости
      phaseWidth = Math.max(phaseWidth, 2);
    } else {
      // Для недельного представления
      // Используем точно такое же начало недели, как и при создании меток времени
      const startWeek = getStartOfWeek(minDate);
      startWeek.setHours(0, 0, 0, 0);
      
      // Общая продолжительность таймлайна в неделях
      const totalWeeks = totalCells;
      
      // Рассчитываем смещение от начала первой недели в днях
      const daysSinceStart = (start - startWeek.getTime()) / (24 * 60 * 60 * 1000);
      // Преобразуем дни в недели
      const weeksSinceStart = daysSinceStart / 7;
      
      // Рассчитываем продолжительность в днях и неделях
      const durationDays = (end - start) / (24 * 60 * 60 * 1000);
      const durationWeeks = durationDays / 7;
      
      // Преобразуем недели в пиксели
      startOffset = (weeksSinceStart / totalWeeks) * (totalCells * cellWidth);
      phaseWidth = (durationWeeks / totalWeeks) * (totalCells * cellWidth);
      
      // Минимальная ширина для видимости
      phaseWidth = Math.max(phaseWidth, 4);
    }
    
    return {
      left: startOffset,
      width: phaseWidth,
      isHidden
    };
  };

  // Улучшенная обработка фаз для недельного представления
  const processPhases = (phases) => {
    if (!phases || phases.length === 0) {
      return [];
    }
    
    // Больше не фильтруем скрытые фазы, а обрабатываем все
    if (selectedView === 'days') {
      // Для дневного представления возвращаем все фазы с сохранением оригинального индекса
      return phases.map((phase, originalIndex) => {
        return {
          ...phase,
          originalIndex
        };
      });
    } else {
      // Сортируем фазы по дате начала
      const sortedPhases = [...phases].sort((a, b) => a.startDate - b.startDate);
      
      // Создаем временную структуру для группировки фаз по статусам
      const statusGroups = [];
      let currentGroup = null;
      
      for (const phase of sortedPhases) {
        const originalIndex = phases.indexOf(phase);
        
        if (!currentGroup || currentGroup.status !== phase.status) {
          // Начинаем новую группу, если статус изменился или это первая фаза
          currentGroup = {
            status: phase.status,
            startDate: new Date(phase.startDate),
            endDate: new Date(phase.endDate),
            originalIndex // Сохраняем индекс оригинальной фазы
          };
          statusGroups.push(currentGroup);
        } else {
          // Расширяем текущую группу, если статус совпадает
          currentGroup.endDate = new Date(phase.endDate);
          // Обновляем индекс на последнюю фазу в группе
          currentGroup.originalIndex = originalIndex;
        }
      }
      
      return statusGroups;
    }
  };

  // Фильтруем задачи для отображения (скрываем дочерние задачи, если родитель свернут)
  const getVisibleTasks = () => {
    // Создаем функцию для проверки, свернут ли какой-либо из родителей задачи
    const isAnyParentCollapsed = (task) => {
      if (!task.parentId) return false;
      
      const parent = tasks.find(t => t.id === task.parentId);
      if (!parent) return false;
      
      // Если родитель свернут или любой из его родителей свернут
      return !parent.isExpanded || isAnyParentCollapsed(parent);
    };
    
    let filteredTasks = tasks.filter(task => !isAnyParentCollapsed(task));
    
    // Сортировка по дате начала первого видимого статуса, если включена
    if (sortByStartDate) {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        // Находим первую видимую фазу для каждой задачи
        const aPhases = a.phases?.filter(phase => !hiddenStatuses.includes(phase.status)) || [];
        const bPhases = b.phases?.filter(phase => !hiddenStatuses.includes(phase.status)) || [];
        
        const aStartDate = aPhases.length > 0 ? aPhases[0].startDate : new Date(9999, 11, 31);
        const bStartDate = bPhases.length > 0 ? bPhases[0].startDate : new Date(9999, 11, 31);
        
        return aStartDate - bStartDate;
      });
    }
    
    return filteredTasks;
  };

  const visibleTasks = getVisibleTasks();

  // Функция для обновления задач и отправки изменений родительскому компоненту
  const updateTasks = (updatedTasks) => {
    setTasks(updatedTasks);
    if (onTasksUpdate) {
      onTasksUpdate(updatedTasks);
    }
  };
  
  // Функция для открытия модального окна редактирования фазы
  const openEditModal = (taskId, phaseIndex) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setEditingTask(task);
    
    if (phaseIndex !== undefined && phaseIndex !== null) {
      // Редактирование существующей фазы
      const processedPhases = processPhases(task.phases);
      
      if (phaseIndex >= processedPhases.length) {
        console.error('Индекс фазы выходит за пределы массива обработанных фаз');
        return;
      }
      
      const processedPhase = processedPhases[phaseIndex];
      
      // Используем сохраненный originalIndex для доступа к оригинальной фазе
      if (processedPhase.originalIndex !== undefined) {
        const originalPhaseIndex = processedPhase.originalIndex;
        if (originalPhaseIndex >= 0 && originalPhaseIndex < task.phases.length) {
          // Создаем новые объекты дат с правильным форматированием
          const originalStartDate = task.phases[originalPhaseIndex].startDate;
          const originalEndDate = task.phases[originalPhaseIndex].endDate;
          
          // Форматируем дату в YYYY-MM-DD и создаем новый объект Date
          const startDateStr = `${originalStartDate.getFullYear()}-${String(originalStartDate.getMonth() + 1).padStart(2, '0')}-${String(originalStartDate.getDate()).padStart(2, '0')}`;
          const endDateStr = `${originalEndDate.getFullYear()}-${String(originalEndDate.getMonth() + 1).padStart(2, '0')}-${String(originalEndDate.getDate()).padStart(2, '0')}`;
          
          const startDate = new Date(startDateStr);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(endDateStr);
          endDate.setHours(23, 59, 59, 999);
          
          setEditingPhase({ 
            ...task.phases[originalPhaseIndex], 
            startDate,
            endDate,
            index: originalPhaseIndex 
          });
        } else {
          console.error('Некорректный индекс оригинальной фазы');
          return;
        }
      } else {
        console.error('Не удалось найти соответствующую фазу');
        return;
      }
    } else {
      // Создание новой фазы
      const lastPhase = task.phases && task.phases.length > 0 
        ? task.phases[task.phases.length - 1] 
        : null;
      
      // Устанавливаем начальную дату как текущую или дату окончания последней фазы
      const startDate = lastPhase && lastPhase.endDate > currentDate 
        ? new Date(lastPhase.endDate) 
        : new Date(currentDate);
      
      // Устанавливаем время на начало дня
      startDate.setHours(0, 0, 0, 0);
      
      // Устанавливаем конечную дату как начальную + 1 день
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      // Устанавливаем время до конца дня
      endDate.setHours(23, 59, 59, 999);
      
      setEditingPhase({ 
        status: '', 
        startDate, 
        endDate,
        isNew: true 
      });
    }
    
    setEditModalOpen(true);
  };
  
  // Функция для сохранения изменений фазы
  const savePhaseChanges = (updatedPhase) => {
    // Устанавливаем время до конца дня для даты окончания
    const endDate = new Date(updatedPhase.endDate);
    endDate.setHours(23, 59, 59, 999);
    updatedPhase.endDate = endDate;
    
    // Устанавливаем время на начало дня для даты начала
    const startDate = new Date(updatedPhase.startDate);
    startDate.setHours(0, 0, 0, 0);
    updatedPhase.startDate = startDate;
    
    const updatedTasks = tasks.map(task => {
      if (task.id === editingTask.id) {
        let updatedPhases = [...(task.phases || [])]; // Убедимся, что phases существует
        
        if (updatedPhase.isNew) {
          // Добавляем новую фазу
          delete updatedPhase.isNew;
          delete updatedPhase.index;
          updatedPhases.push(updatedPhase);
          
          // Сортируем фазы по дате начала
          updatedPhases.sort((a, b) => a.startDate - b.startDate);
        } else {
          // Обновляем существующую фазу
          const index = updatedPhase.index;
          delete updatedPhase.index;
          updatedPhases[index] = updatedPhase;
        }
        
        return { ...task, phases: updatedPhases };
      }
      return task;
    });
    
    updateTasks(updatedTasks);
    setEditModalOpen(false);
    setEditingTask(null);
    setEditingPhase(null);
  };
  
  // Функция для удаления фазы
  const deletePhase = () => {
    if (!editingPhase || editingPhase.isNew) {
      setEditModalOpen(false);
      setEditingTask(null);
      setEditingPhase(null);
      return;
    }
    
    const updatedTasks = tasks.map(task => {
      if (task.id === editingTask.id) {
        const updatedPhases = task.phases.filter((_, index) => index !== editingPhase.index);
        return { ...task, phases: updatedPhases };
      }
      return task;
    });
    
    updateTasks(updatedTasks);
    setEditModalOpen(false);
    setEditingTask(null);
    setEditingPhase(null);
  };

  // Функция для начала перетаскивания
  const handleDragStart = (taskId, phaseIndex, edge) => {
    // Проверяем, можно ли редактировать эту фазу (не в прошлом)
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.phases) return;
    
    const processedPhases = processPhases(task.phases);
    
    if (phaseIndex >= processedPhases.length) {
      console.error('Индекс фазы выходит за пределы массива обработанных фаз');
      return;
    }
    
    const processedPhase = processedPhases[phaseIndex];
    
    // Используем сохраненный originalIndex для доступа к оригинальной фазе
    if (processedPhase.originalIndex === undefined) {
      console.error('Не удалось найти соответствующую фазу для перетаскивания');
      return;
    }
    
    const originalPhaseIndex = processedPhase.originalIndex;
    if (originalPhaseIndex < 0 || originalPhaseIndex >= task.phases.length) {
      console.error('Некорректный индекс оригинальной фазы');
      return;
    }
    
    const phase = task.phases[originalPhaseIndex];
    
    // Если дата окончания фазы в прошлом, запрещаем редактирование
    if (phase.endDate < currentDate) {
      return; // Нельзя редактировать прошлые события
    }
    
    setDragInfo({
      taskId,
      phaseIndex: originalPhaseIndex,
      edge, // 'start' или 'end'
      initialDate: edge === 'start' ? new Date(phase.startDate) : new Date(phase.endDate)
    });
  };
  
  // Функция для обработки перетаскивания
  const handleDrag = (e) => {
    if (!dragInfo) return;
    
    // Получаем смещение мыши относительно таймлайна
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - timelineRect.left;
    
    // Преобразуем позицию мыши в дату
    let newDate;
    if (selectedView === 'days') {
      const dayOffset = mouseX / DAY_CELL_WIDTH;
      newDate = new Date(minDate);
      newDate.setDate(newDate.getDate() + dayOffset);
    } else {
      const weekOffset = mouseX / WEEK_CELL_WIDTH;
      const startOfFirstWeek = getStartOfWeek(minDate);
      newDate = new Date(startOfFirstWeek);
      newDate.setDate(newDate.getDate() + weekOffset * 7);
    }
    
    // Ограничиваем редактирование прошлых событий
    if (newDate < currentDate) {
      newDate = new Date(currentDate);
    }
    
    // Устанавливаем время в зависимости от типа края
    if (dragInfo.edge === 'end') {
      newDate.setHours(23, 59, 59, 999); // Конец дня для даты окончания
    } else {
      newDate.setHours(0, 0, 0, 0); // Начало дня для даты начала
    }
    
    // Обновляем задачи с новой датой
    const updatedTasks = tasks.map(task => {
      if (task.id === dragInfo.taskId) {
        const updatedPhases = [...task.phases];
        const phase = updatedPhases[dragInfo.phaseIndex];
        
        if (dragInfo.edge === 'start') {
          // Не позволяем дате начала быть позже даты окончания
          if (newDate < phase.endDate) {
            phase.startDate = newDate;
          }
        } else {
          // Не позволяем дате окончания быть раньше даты начала
          if (newDate > phase.startDate) {
            phase.endDate = newDate;
          }
        }
        
        return { ...task, phases: updatedPhases };
      }
      return task;
    });
    
    updateTasks(updatedTasks);
  };
  
  // Функция для завершения перетаскивания
  const handleDragEnd = () => {
    setDragInfo(null);
  };
  
  // Обработчики событий для перетаскивания
  useEffect(() => {
    if (dragInfo) {
      const handleMouseMove = (e) => handleDrag(e);
      const handleMouseUp = () => handleDragEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragInfo, tasks]);

  return (
    <div className="flex flex-col w-full mx-auto p-4 border border-gray-200 rounded-lg bg-white shadow">
      {/* <h2 className="text-xl font-bold mb-4">Диаграмма Гантта с этапами жизненного цикла</h2> */}
      
      {/* Переключатель представления и легенда */}
      <div className="flex flex-wrap justify-between gap-6 mb-4">
        <div className="flex gap-4 flex-wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <div 
              key={status} 
              className="flex items-center cursor-pointer" 
              onClick={() => toggleStatusVisibility(status)}
            >
              <div 
                className="w-4 h-4 mr-2" 
                style={{ 
                  backgroundColor: hiddenStatuses.includes(status) ? '#E0E0E0' : color,
                  opacity: hiddenStatuses.includes(status) ? 0.5 : 1,
                  border: `1px solid ${hiddenStatuses.includes(status) ? '#BDBDBD' : color}`
                }}
              ></div>
              <span 
                className={`text-sm capitalize ${hiddenStatuses.includes(status) ? 'text-gray-400' : ''}`}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={showHierarchy} 
                onChange={(e) => onHierarchyChange(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Показывать иерархию</span>
            </label>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={sortByStartDate} 
                onChange={() => setSortByStartDate(!sortByStartDate)}
                className="mr-2"
              />
              <span className="text-sm">Сортировать по дате начала</span>
            </label>
          </div>
          
          <div className="flex items-center">
            <div className="flex border border-gray-300 rounded overflow-hidden">
              <button 
                className={`px-3 py-1 text-sm ${selectedView === 'days' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => setSelectedView('days')}
              >
                Дни
              </button>
              <button 
                className={`px-3 py-1 text-sm ${selectedView === 'weeks' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => setSelectedView('weeks')}
              >
                Недели
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex">
        {/* Колонка с ID задач */}
        <div className="w-[8%] min-w-[80px] border-r border-gray-300 text-xs">
          {/* Пустая ячейка для выравнивания с месяцами/кварталами */}
          <div className="h-8 border-b border-gray-300"></div>
          <div className="h-8 font-bold border-b border-gray-300 flex items-center px-2">
            ID
          </div>
          {visibleTasks.map(task => (
            <div
              key={`id-${task.id}`}
              className="border-b border-gray-200 h-12 flex items-center"
              onMouseEnter={() => setHoveredTask(task.id)}
              onMouseLeave={() => setHoveredTask(null)}
            >
              {task.jiraId ? (
                <a 
                  href={`https://jira.example.com/browse/${task.jiraId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {task.jiraId}
                </a>
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
          ))}
        </div>
        
        {/* Столбец с названиями задач */}
        <div className="w-[20%] min-w-[150px] border-r border-gray-300 overflow-hidden text-xs">
          {/* Пустая ячейка для выравнивания с месяцами/кварталами */}
          <div className="h-8 border-b border-gray-300"></div>
          <div className="h-8 font-bold border-b border-gray-300 flex items-center px-2">
            Задачи
          </div>
          {visibleTasks.map(task => {
            // Вычисляем уровень вложенности задачи
            const getTaskDepth = (t) => {
              let depth = 0;
              let currentTask = t;
              
              while (currentTask.parentId) {
                depth++;
                currentTask = tasks.find(parent => parent.id === currentTask.parentId);
                if (!currentTask) break;
              }
              
              return depth;
            };
            
            const taskDepth = getTaskDepth(task);
            
            return (
              <div
                key={`name-${task.id}`}
                className="py-2 px-2 border-b border-gray-200 h-12 flex items-center"
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                <div 
                  className="flex items-center" 
                  style={{ paddingLeft: `${taskDepth * 16}px` }}
                >
                  {task.isParent && (
                    <button 
                      onClick={() => toggleExpand(task.id)}
                      className="w-5 h-5 flex items-center justify-left text-gray-700"
                    >
                      {task.isExpanded ? '−' : '+'}
                    </button>
                  )}
                  <div className={`${task.isParent ? 'font-semibold' : ''} truncate`}>
                    {task.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Колонка со статусами задач */}
        <div className="w-[10%] min-w-[120px] border-r border-gray-300 overflow-hidden text-xs">
          {/* Пустая ячейка для выравнивания с месяцами/кварталами */}
          <div className="h-8 border-b border-gray-300"></div>
          <div className="h-8 font-bold border-b border-gray-300 flex items-center px-2">
            Статус
          </div>
          {visibleTasks.map(task => {
            // Определяем текущий статус задачи (последний в списке фаз)
            const currentStatus = task.phases && task.phases.length > 0 
              ? task.phases[task.phases.length - 1].status 
              : null;
              
            return (
              <div
                key={`status-${task.id}`}
                className="py-2 px-2 border-b border-gray-200 h-12 flex items-center"
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                {currentStatus ? (
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: statusColors[currentStatus] || '#ccc' }}
                    ></div>
                    <span className="capitalize">{currentStatus}</span>
                  </div>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Диаграмма Гантта */}
        <div className="w-[62%] overflow-x-auto">
          <div className="relative" ref={timelineRef}>
            {/* Заголовок с месяцами или кварталами */}
            <div className="h-8 border-b border-gray-300 flex" style={{ width: fullTimelineWidth }}>
              {selectedView === 'days' ? (
                // Отображение месяцев для режима дней
                (() => {
                  let currentMonth = null;
                  let currentYear = null;
                  let monthStartIndex = 0;
                  let monthCells = [];
                  
                  timeLabels.forEach((timeLabel, index) => {
                    const date = timeLabel.date;
                    const month = date.getMonth();
                    const year = date.getFullYear();
                    
                    // Если это первая метка или новый месяц
                    if (currentMonth === null || currentMonth !== month || currentYear !== year) {
                      // Если это не первая метка, добавляем предыдущий месяц
                      if (currentMonth !== null) {
                        monthCells.push({
                          month: currentMonth,
                          year: currentYear,
                          startIndex: monthStartIndex,
                          endIndex: index - 1
                        });
                      }
                      
                      // Обновляем текущий месяц и индекс начала
                      currentMonth = month;
                      currentYear = year;
                      monthStartIndex = index;
                    }
                  });
                  
                  // Добавляем последний месяц
                  if (currentMonth !== null) {
                    monthCells.push({
                      month: currentMonth,
                      year: currentYear,
                      startIndex: monthStartIndex,
                      endIndex: timeLabels.length - 1
                    });
                  }
                  
                  return monthCells.map((monthCell, idx) => (
                    <div 
                      key={`month-${idx}`} 
                      className="flex-shrink-0 text-center text-xs font-medium border-r border-gray-300"
                      style={{ 
                        width: `${(monthCell.endIndex - monthCell.startIndex + 1) * cellWidth}px`,
                      }}
                    >
                      {`${getMonthName(monthCell.month)}, ${monthCell.year}`}
                    </div>
                  ));
                })()
              ) : (
                // Отображение кварталов для режима недель
                (() => {
                  let currentQuarter = null;
                  let currentYear = null;
                  let quarterStartIndex = 0;
                  let quarterCells = [];
                  
                  timeLabels.forEach((timeLabel, index) => {
                    const date = timeLabel.date;
                    const month = date.getMonth();
                    const quarter = getQuarter(month);
                    const year = date.getFullYear();
                    
                    // Если это первая метка или новый квартал
                    if (currentQuarter === null || currentQuarter !== quarter || currentYear !== year) {
                      // Если это не первая метка, добавляем предыдущий квартал
                      if (currentQuarter !== null) {
                        quarterCells.push({
                          quarter: currentQuarter,
                          year: currentYear,
                          startIndex: quarterStartIndex,
                          endIndex: index - 1
                        });
                      }
                      
                      // Обновляем текущий квартал и индекс начала
                      currentQuarter = quarter;
                      currentYear = year;
                      quarterStartIndex = index;
                    }
                  });
                  
                  // Добавляем последний квартал
                  if (currentQuarter !== null) {
                    quarterCells.push({
                      quarter: currentQuarter,
                      year: currentYear,
                      startIndex: quarterStartIndex,
                      endIndex: timeLabels.length - 1
                    });
                  }
                  
                  return quarterCells.map((quarterCell, idx) => (
                    <div 
                      key={`quarter-${idx}`} 
                      className="flex-shrink-0 text-center text-xs font-medium border-r border-gray-300"
                      style={{ 
                        width: `${(quarterCell.endIndex - quarterCell.startIndex + 1) * cellWidth}px`,
                      }}
                    >
                      {`Q${quarterCell.quarter} ${quarterCell.year}`}
                    </div>
                  ));
                })()
              )}
            </div>
            
            {/* Заголовок с датами или неделями */}
            <div className="h-8 border-b border-gray-300 flex" style={{ width: fullTimelineWidth }}>
              {timeLabels.map((timeLabel, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 flex items-center justify-center text-xs border-r"
                  style={{ 
                    width: `${cellWidth}px`,
                    borderColor: selectedView === 'days' 
                      ? (timeLabel.isBeforeMonday ? '#d1d5db' : '#f3f4f6')
                      : (timeLabel.isWeekStart ? '#d1d5db' : '#f3f4f6'),
                    fontWeight: timeLabel.isVisible ? '500' : '400'
                  }}
                >
                  {timeLabel.isVisible ? timeLabel.label : ''}
                </div>
              ))}
            </div>
            
            {/* Строки задач */}
            {visibleTasks.map(task => (
              <div 
                key={`gantt-${task.id}`} 
                className="relative h-12 border-b border-gray-200"
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
                style={{ width: fullTimelineWidth }}
              >
                {/* Фоновые вертикальные линии */}
                <div className="absolute inset-0 flex" style={{ width: fullTimelineWidth }}>
                  {timeLabels.map((timeLabel, index) => (
                    <div 
                      key={index} 
                      className="flex-shrink-0 border-r"
                      style={{ 
                        width: `${cellWidth}px`,
                        borderColor: selectedView === 'days' 
                          ? (timeLabel.isBeforeMonday ? '#d1d5db' : '#f3f4f6')
                          : (timeLabel.isWeekStart ? '#d1d5db' : '#f3f4f6')
                      }}
                    ></div>
                  ))}
                </div>
                
                {/* Фазы задачи */}
                {task.phases && processPhases(task.phases).map((phase, phaseIndex) => {
                  const { left, width, isHidden } = calculatePhasePosition(phase);
                  const canEdit = phase.endDate >= currentDate;
                  
                  // Больше не пропускаем фазы с нулевой шириной
                  if (width === 0) return null;
                  
                  return (
                    <div
                      key={phaseIndex}
                      className={`absolute h-6 top-3 rounded ${canEdit ? 'cursor-pointer' : ''}`}
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        backgroundColor: statusColors[phase.status],
                        border: hoveredTask === task.id ? '1px solid rgb(0, 0, 0, 0.5)' : `1px solid ${statusColors[phase.status]}`,
                        zIndex: hoveredTask === task.id ? 2 : 1,
                        cursor: canEdit ? 'pointer' : 'default',
                        opacity: isHidden ? 0.1 : 1, // Устанавливаем низкую прозрачность для скрытых фаз
                        pointerEvents: isHidden ? 'none' : 'auto' // Отключаем взаимодействие для скрытых фаз
                      }}
                      title={`${phase.status}: ${phase.startDate.toLocaleDateString()} - ${phase.endDate.toLocaleDateString()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        canEdit && !isHidden && openEditModal(task.id, phaseIndex);
                      }}
                    >
                      {canEdit && !isHidden && width > 20 && (
                        <>
                          {/* Маркер для изменения даты начала */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleDragStart(task.id, phaseIndex, 'start');
                            }}
                          ></div>
                          
                          {/* Маркер для изменения даты окончания */}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleDragStart(task.id, phaseIndex, 'end');
                            }}
                          ></div>
                        </>
                      )}
                    </div>
                  );
                })}
                
                {/* Кнопка добавления новой фазы */}
                <div 
                  className="absolute right-2 top-3 h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(task.id);
                  }}
                  title="Добавить новую фазу"
                >
                  <span>+</span>
                </div>
              </div>
            ))}
            
            {/* Вертикальная линия текущей даты */}
            {(() => {
              const currentDatePosition = calculatePhasePosition({
                startDate: currentDate,
                endDate: new Date(currentDate.getTime() + 1000)
              }).left;
              
              return (
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10"
                  style={{ left: `${currentDatePosition}px` }}
                ></div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Информация по наведению - фиксированная высота */}
      <div className="mt-4 min-h-[500px]">
        {hoveredTask ? (
          <div className="p-2 bg-gray-100 rounded">
            <h3 className="font-bold">{tasks.find(t => t.id === hoveredTask)?.name}</h3>
            {tasks.find(t => t.id === hoveredTask)?.jiraId && (
              <div className="text-sm mb-1">
                <span className="font-medium">ID: </span>
                <a 
                  href={`https://jira.example.com/browse/${tasks.find(t => t.id === hoveredTask)?.jiraId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {tasks.find(t => t.id === hoveredTask)?.jiraId}
                </a>
              </div>
            )}
            <div className="text-sm">
              {tasks.find(t => t.id === hoveredTask)?.phases?.map((phase, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="capitalize font-medium">{phase.status}:</span>
                  <span>
                    {phase.startDate.toLocaleDateString()} 
                    {selectedView === 'days' && phase.startDate.getHours() ? 
                      ` ${phase.startDate.getHours()}:${String(phase.startDate.getMinutes()).padStart(2, '0')}` : ''}
                    {' — '}
                    {phase.endDate.toLocaleDateString()}
                    {selectedView === 'days' && phase.endDate.getHours() ? 
                      ` ${phase.endDate.getHours()}:${String(phase.endDate.getMinutes()).padStart(2, '0')}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 text-gray-400 italic">
            Наведите на задачу для просмотра подробной информации
          </div>
        )}
      </div>
      
      {/* Модальное окно редактирования фазы */}
      {editModalOpen && editingTask && editingPhase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-w-[90%]">
            <h3 className="text-xl font-bold mb-4">
              {editingPhase.isNew ? 'Добавить новую фазу' : 'Редактировать фазу'}
            </h3>
            
            <div className="mb-4">
              <p className="font-medium">Задача: {editingTask.name}</p>
              {editingTask.jiraId && <p className="text-sm text-gray-600">ID: {editingTask.jiraId}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Статус</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded"
                value={editingPhase.status}
                onChange={(e) => setEditingPhase({...editingPhase, status: e.target.value})}
              >
                <option value="">Выберите статус</option>
                {allStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
                <option value="new_status">+ Добавить новый статус</option>
              </select>
              
              {editingPhase.status === 'new_status' && (
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded mt-2"
                  placeholder="Введите название нового статуса"
                  onChange={(e) => setEditingPhase({...editingPhase, status: e.target.value})}
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Дата начала</label>
                <input 
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={`${editingPhase.startDate.getFullYear()}-${String(editingPhase.startDate.getMonth() + 1).padStart(2, '0')}-${String(editingPhase.startDate.getDate()).padStart(2, '0')}`}
                  min={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const newDate = new Date(year, month - 1, day);
                    newDate.setHours(0, 0, 0, 0);
                    setEditingPhase({...editingPhase, startDate: newDate});
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Дата окончания</label>
                <input 
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={`${editingPhase.endDate.getFullYear()}-${String(editingPhase.endDate.getMonth() + 1).padStart(2, '0')}-${String(editingPhase.endDate.getDate()).padStart(2, '0')}`}
                  min={`${editingPhase.startDate.getFullYear()}-${String(editingPhase.startDate.getMonth() + 1).padStart(2, '0')}-${String(editingPhase.startDate.getDate()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const newDate = new Date(year, month - 1, day);
                    newDate.setHours(23, 59, 59, 999);
                    setEditingPhase({...editingPhase, endDate: newDate});
                  }}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <div>
                {!editingPhase.isNew && (
                  <button 
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={deletePhase}
                  >
                    Удалить
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingTask(null);
                    setEditingPhase(null);
                  }}
                >
                  Отмена
                </button>
                
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => savePhaseChanges(editingPhase)}
                  disabled={!editingPhase.status || !editingPhase.startDate || !editingPhase.endDate}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart; 