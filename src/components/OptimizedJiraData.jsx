import React from 'react';
import { Paper, Typography, IconButton, Tooltip, Box } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CollapsibleJSON from './CollapsibleJSON';

const OptimizedJiraData = ({ processedIssues, hierarchy }) => {
  // Функция для оптимизации данных задачи
  const optimizeIssue = (issue) => {
    return {
      key: issue.key,
      summary: issue.summary,
      status: issue.current_status,
      duration: issue.total_duration,
      duration_formatted: issue.total_duration_formatted,
      is_completed: issue.is_completed,
      is_blocked: issue.is_blocked,
      created_date: issue.created_date,
      completion_date: issue.completion_date,
      // История статусов
      status_movements: issue.status_movements.slice(-3).map(m => ({
        from: m.from,
        to: m.to,
        date: m.date
      })),
      // История блокеров
      blocker_history: issue.blocker_history.map(b => ({
        key: b.key,
        type: b.blocker_type,
        start_date: b.start_date,
        end_date: b.end_date,
        lead_time: b.blocker_lead_time
      })),
      // Текущие блокеры
      current_blockers: issue.current_blockers,
      // История флагов
      flag_changes: issue.flag_changes.map(f => ({
        action: f.action,
        by: f.by,
        date: f.date,
        comment: f.comment
      }))
    };
  };

  // Функция для оптимизации иерархии
  const optimizeHierarchy = (hierarchy) => {
    return {
      rootIssues: hierarchy.rootIssues.map(issue => ({
        key: issue.key,
        summary: issue.summary,
        status: issue.current_status,
        children: issue.children?.map(child => ({
          key: child.key,
          summary: child.summary,
          status: child.current_status
        })) || []
      })),
      total_issues: hierarchy.allIssues.length
    };
  };

  // Создаем оптимизированный объект данных
  const optimizedData = {
    main_issue: hierarchy.rootIssues[0]?.key,
    total_issues: processedIssues.length,
    completed_issues: processedIssues.filter(issue => issue.is_completed).length,
    blocked_issues: processedIssues.filter(issue => issue.is_blocked).length,
    // Статистика по блокерам
    blockers_stats: {
      total_blockers: processedIssues.reduce((sum, issue) => 
        sum + (issue.current_blockers?.length || 0), 0),
      blocked_issues: processedIssues.filter(issue => 
        (issue.current_blockers?.length || 0) > 0).length,
      blocker_history: processedIssues.reduce((sum, issue) => 
        sum + (issue.blocker_history?.length || 0), 0)
    },
    // Статистика по статусам
    status_stats: {
      by_status: processedIssues.reduce((acc, issue) => {
        acc[issue.current_status] = (acc[issue.current_status] || 0) + 1;
        return acc;
      }, {})
    },
    hierarchy: optimizeHierarchy(hierarchy),
    issues: processedIssues.map(optimizeIssue)
  };

  const handleCopy = () => {
    const jsonString = JSON.stringify(optimizedData, null, 2);
    navigator.clipboard.writeText(jsonString);
  };

  return (
    <Paper sx={{ p: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Оптимизированные данные</Typography>
        <Tooltip title="Копировать JSON">
          <IconButton onClick={handleCopy} size="small">
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <CollapsibleJSON 
        data={optimizedData} 
        title="Оптимизированная структура" 
        defaultCollapsed={true} 
      />
    </Paper>
  );
};

export default OptimizedJiraData; 