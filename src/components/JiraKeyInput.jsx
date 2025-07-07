import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { TextField, InputAdornment, IconButton, Paper, List, ListItem, ListItemText, Typography, Box, Button, ListItemButton } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';

const HISTORY_KEY = 'jiraKeyHistory';
const MAX_HISTORY = 10;

const JiraKeyInput = forwardRef(({ value, onChange, onSubmit, loading, disabled }, ref) => {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Загрузка истории из localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsedHistory = JSON.parse(stored);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error);
      // Если ошибка парсинга, сбрасываем историю
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  // Сохраняем историю при изменении
  const saveHistory = (newHistory) => {
    try {
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Ошибка при сохранении истории:', error);
    }
  };

  // Добавить ключ в историю (без дублей, максимум MAX_HISTORY)
  const addToHistory = (key) => {
    if (!key) return;
    const newHistory = [key, ...history.filter((h) => h !== key)].slice(0, MAX_HISTORY);
    saveHistory(newHistory);
    return true; // Для подтверждения успешного добавления
  };

  // Экспортируем методы через ref
  useImperativeHandle(ref, () => ({
    addToHistory,
    clearHistory: () => saveHistory([]),
    getHistory: () => history
  }));

  // Удалить один элемент из истории
  const removeFromHistory = (key) => {
    const newHistory = history.filter((h) => h !== key);
    saveHistory(newHistory);
  };

  // Обработка отправки
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    
    const trimmedValue = value.trim();
    
    // Добавляем в историю
    addToHistory(trimmedValue);
    
    if (onSubmit) {
      onSubmit(trimmedValue);
    }
    
    setShowHistory(false);
  };

  // Выбор из истории
  const handleSelectHistory = (key) => {
    if (onChange) {
      onChange(key);
    }
    setShowHistory(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Клик вне истории — закрыть
  useEffect(() => {
    if (!showHistory) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showHistory]);

  return (
    <Box ref={wrapperRef} sx={{ position: 'relative', width: 350, maxWidth: '100%' }}>
      <form onSubmit={handleSubmit} autoComplete="off">
        <TextField
          inputRef={inputRef}
          label="Ключ задачи"
          placeholder="например, PORTFOLIO-36962"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          disabled={disabled || loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="Показать историю"
                  onClick={() => setShowHistory((v) => !v)}
                  edge="end"
                  tabIndex={-1}
                  disabled={disabled || loading}
                >
                  <HistoryIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onFocus={() => setShowHistory(true)}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          Введите ключ задачи из Jira или выберите из недавних
        </Typography>
      </form>
      {showHistory && (
        <Paper elevation={4} sx={{ position: 'absolute', zIndex: 10, width: '100%', mt: 1, maxHeight: 240, overflowY: 'auto' }}>
          {history.length > 0 ? (
            <>
              <List dense>
                {history.map((key) => (
                  <ListItem key={key} disablePadding secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="Удалить" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(key);
                      }}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }>
                    <ListItemButton onClick={() => handleSelectHistory(key)}>
                      <ListItemText primary={key} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Box sx={{ textAlign: 'right', p: 1 }}>
                <Button size="small" color="secondary" onClick={() => saveHistory([])}>
                  Очистить историю
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                История пуста
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
});

export default JiraKeyInput; 