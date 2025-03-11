import dayjs from 'dayjs';

// Константы
export const FINAL_STATUSES = ['Done', 'Closed', 'Resolved'];

// Вспомогательные функции
export const formatDate = (dateStr) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
};

export const formatDuration = (durationInHours) => {
  const weeks = Math.floor(durationInHours / (7 * 24));
  const days = Math.floor((durationInHours % (7 * 24)) / 24);
  const hours = Math.floor(durationInHours % 24);
  const minutes = Math.round((durationInHours - Math.floor(durationInHours)) * 60);

  const parts = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
};

// Основные функции обработки
export const extractStatusMovements = (issue) => {
  const movements = [];
  
  issue.changelog.histories.forEach(history => {
    history.items.forEach(item => {
      if (item.field === 'status') {
        movements.push({
          from: item.fromString,
          to: item.toString,
          date: formatDate(history.created)
        });
      }
    });
  });
  
  return movements;
};

export const extractFlagChanges = (issue) => {
  const flagChanges = [];
  
  issue.changelog.histories.forEach(history => {
    history.items.forEach(item => {
      if (item.field === 'Flagged') {
        const comment = item.toString;
        if (item.toString === 'Impediment') {
          flagChanges.push({
            action: 'Flag Added',
            by: history.author.displayName,
            date: formatDate(history.created),
            comment
          });
        } else if (item.fromString === 'Impediment' && !item.toString) {
          flagChanges.push({
            action: 'Flag Removed',
            by: history.author.displayName,
            date: formatDate(history.created),
            comment
          });
        }
      }
    });
  });
  
  return flagChanges;
};

export const calculateStatusDurations = (statusMovements, creationDate) => {
  const durations = [];
  let previousDate = dayjs(creationDate);
  let previousStatus = statusMovements[0]?.from || 'Created';
  
  // Добавляем начальный статус
  durations.push({
    status: previousStatus,
    start_date: previousDate.format('YYYY-MM-DD HH:mm:ss'),
    end_date: statusMovements[0] ? dayjs(statusMovements[0].date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
    duration: statusMovements[0] ? dayjs(statusMovements[0].date).diff(previousDate, 'hour', true).toFixed(2) : dayjs().diff(previousDate, 'hour', true).toFixed(2),
    duration_formatted: formatDuration(statusMovements[0] ? dayjs(statusMovements[0].date).diff(previousDate, 'hour', true) : dayjs().diff(previousDate, 'hour', true))
  });
  
  // Обрабатываем все переходы
  statusMovements.forEach((movement, index) => {
    const currentDate = dayjs(movement.date);
    const nextDate = index < statusMovements.length - 1 ? dayjs(statusMovements[index + 1].date) : dayjs();
    const duration = nextDate.diff(currentDate, 'hour', true);
    
    durations.push({
      status: movement.to,
      start_date: currentDate.format('YYYY-MM-DD HH:mm:ss'),
      end_date: index < statusMovements.length - 1 ? nextDate.format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
      duration: duration.toFixed(2),
      duration_formatted: formatDuration(duration)
    });
  });
  
  return durations;
};

export const isIssueBlocked = (flagChanges) => {
  return flagChanges.some(flag => 
    flag.action === 'Flag Added' && 
    !flagChanges.find(f => f.action === 'Flag Removed' && f.date > flag.date)
  );
};

export const getCompletionDate = (statusMovements) => {
  const completionDates = statusMovements
    .filter(movement => FINAL_STATUSES.includes(movement.to))
    .map(movement => movement.date);
  
  return completionDates.length > 0 
    ? completionDates.reduce((latest, current) => (current > latest ? current : latest))
    : null;
};

// Основная функция обработки задачи
export const processJiraIssue = (issue) => {
  const statusMovements = extractStatusMovements(issue);
  const flagChanges = extractFlagChanges(issue);
  const statusDurations = calculateStatusDurations(statusMovements, issue.fields.created);
  
  const totalDuration = statusDurations.reduce((sum, status) => sum + parseFloat(status.duration), 0);
  
  const currentStatus = issue.fields.status.name;
  const isCompleted = FINAL_STATUSES.includes(currentStatus);
  const completionDate = isCompleted ? getCompletionDate(statusMovements) : null;
  
  // Извлекаем информацию о связях
  const links = [];
  if (issue.fields.issuelinks && Array.isArray(issue.fields.issuelinks)) {
    issue.fields.issuelinks.forEach(link => {
      if (!link.type || !link.type.name) return;
      
      const linkType = link.type.name;
      const isOutward = !!link.outwardIssue;
      const isInward = !!link.inwardIssue;
      
      if (isOutward) {
        links.push({
          type: linkType,
          direction: 'outward',
          outwardIssue: {
            key: link.outwardIssue.key,
            summary: link.outwardIssue.fields?.summary || 'Без названия'
          }
        });
      } else if (isInward) {
        links.push({
          type: linkType,
          direction: 'inward',
          inwardIssue: {
            key: link.inwardIssue.key,
            summary: link.inwardIssue.fields?.summary || 'Без названия'
          }
        });
      }
    });
  }
  
  // Проверяем, есть ли родительская задача (для подзадач)
  let parent_key = null;
  if (issue.fields.parent) {
    parent_key = issue.fields.parent.key;
  }
  
  return {
    key: issue.key,
    summary: issue.fields.summary || 'Без названия',
    created_date: formatDate(issue.fields.created),
    current_status: currentStatus,
    status_movements: statusMovements,
    flag_changes: flagChanges,
    status_durations: statusDurations,
    total_duration: totalDuration.toFixed(2),
    total_duration_formatted: formatDuration(totalDuration),
    is_completed: isCompleted,
    completion_date: completionDate,
    is_blocked: isIssueBlocked(flagChanges),
    links: links,
    parent_key: parent_key
  };
}; 