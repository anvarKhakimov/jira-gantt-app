import { calculateStatusDurations } from './jiraDataProcessor';

// Функция для проверки, находятся ли две даты в пределах одного дня
const areDatesWithinOneDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
};

// Функция для поиска задачи в массиве issues
const findIssueByKey = (issues, key) => {
  return issues.find(issue => issue.key === key);
};

// Функция для извлечения движений по статусам
const extractStatusMovements = (issue) => {
  const movements = [];
  
  issue.changelog.histories.forEach(history => {
    history.items.forEach(item => {
      if (item.field === 'status') {
        movements.push({
          from: item.fromString,
          to: item.toString,
          date: history.created
        });
      }
    });
  });
  
  return movements;
};

// Функция для определения периода блокировки по статусам
const getBlockerPeriod = (issue) => {
  if (!issue) return null;

  const statusMovements = extractStatusMovements(issue);
  const statusDurations = calculateStatusDurations(statusMovements, issue.fields.created);

  const blockedStatus = statusDurations.find(d => d.status === 'Заблокировано');
  if (!blockedStatus) return null;

  const unblockedStatus = statusDurations.find(d => d.status === 'Блокировка снята');
  
  return {
    start_date: blockedStatus.start_date,
    end_date: unblockedStatus ? unblockedStatus.start_date : null
  };
};

// Функция для обработки блокировок задачи
export const processBlockers = (issue, issues) => {
  const blockerPeriods = [];
  const currentBlockers = [];
  let isBlocked = false;

  // Обработка связей типа "Blocks"
  const linkBlockers = [];
  if (issue.links) {
    issue.links.forEach(link => {
      if (link.type === 'Blocks' && link.direction === 'inward') {
        const blockerIssue = link.inwardIssue;
        
        // Ищем полную информацию о BLOCKER задаче в основном массиве issues
        const fullBlockerIssue = findIssueByKey(issues, blockerIssue.key);
        
        // Определяем период блокировки по статусам
        const blockerPeriod = getBlockerPeriod(fullBlockerIssue);

        const blocker = {
          type: 'link',
          start_date: blockerPeriod?.start_date || fullBlockerIssue?.fields?.created,
          end_date: blockerPeriod?.end_date,
          key: blockerIssue.key,
          summary: blockerIssue.summary,
          blocker_type: fullBlockerIssue?.fields?.customfield_31724?.value || 'Не указан',
          blocker_lead_time: fullBlockerIssue?.fields?.customfield_38310 ?? 'Не указан'
        };

        linkBlockers.push(blocker);
        
        // Если блокировка все еще активна
        if (!blocker.end_date) {
          currentBlockers.push({
            type: 'link',
            since: blocker.start_date,
            key: blocker.key,
            summary: blocker.summary,
            blocker_type: blocker.blocker_type,
            blocker_lead_time: blocker.blocker_lead_time
          });
          isBlocked = true;
        }
      }
    });
  }

  // Обработка флагов
  const flagBlockers = [];
  if (issue.flag_changes) {
    let currentFlagBlocker = null;

    issue.flag_changes.forEach(flag => {
      if (flag.comment === 'Impediment') {
        if (flag.action === 'Flag Added') {
          // Проверяем, есть ли уже BLOCKER задача в этот день
          const hasMatchingBlocker = linkBlockers.some(blocker => 
            areDatesWithinOneDay(blocker.start_date, flag.date)
          );

          if (!hasMatchingBlocker) {
            currentFlagBlocker = {
              type: 'flag',
              start_date: flag.date,
              by: flag.by,
              comment: flag.comment
            };
          }
        } else if (flag.action === 'Flag Removed' && currentFlagBlocker) {
          currentFlagBlocker.end_date = flag.date;
          flagBlockers.push(currentFlagBlocker);
          currentFlagBlocker = null;
        }
      }
    });

    // Если флаг не был снят и нет активной BLOCKER задачи
    if (currentFlagBlocker && !isBlocked) {
      currentFlagBlocker.end_date = null;
      flagBlockers.push(currentFlagBlocker);
      currentBlockers.push({
        type: 'flag',
        since: currentFlagBlocker.start_date,
        by: currentFlagBlocker.by,
        comment: currentFlagBlocker.comment
      });
      isBlocked = true;
    }
  }

  // Объединяем все периоды блокировок
  blockerPeriods.push(...flagBlockers, ...linkBlockers);

  // Сортируем периоды по дате начала
  blockerPeriods.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return {
    is_blocked: isBlocked,
    blocker_history: blockerPeriods,
    current_blockers: currentBlockers
  };
};

// Функция для обновления информации о блокировках в задаче
export const updateIssueBlockers = (issue, issues) => {
  const blockersInfo = processBlockers(issue, issues);
  return {
    ...issue,
    is_blocked: blockersInfo.is_blocked,
    blocker_history: blockersInfo.blocker_history,
    current_blockers: blockersInfo.current_blockers
  };
}; 