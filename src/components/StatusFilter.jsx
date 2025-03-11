import React from 'react';
import { 
  Box, 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const StatusFilter = ({ issueTypes, selectedStatuses, onStatusChange }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Фильтр статусов</Typography>
      {issueTypes.map((issueType) => (
        <Accordion key={issueType.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{issueType.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Object.entries(
              // Группируем статусы по категориям
              issueType.statuses.reduce((acc, status) => {
                const category = status.statusCategory.name;
                if (!acc[category]) {
                  acc[category] = [];
                }
                acc[category].push(status);
                return acc;
              }, {})
            ).map(([category, statuses]) => (
              <Box key={category} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                  {category}
                </Typography>
                <FormGroup>
                  {statuses.map((status) => (
                    <FormControlLabel
                      key={status.id}
                      control={
                        <Checkbox
                          checked={selectedStatuses.includes(status.name)}
                          onChange={(e) => onStatusChange(status.name, e.target.checked)}
                        />
                      }
                      label={status.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
};

export default StatusFilter; 