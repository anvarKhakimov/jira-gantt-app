import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

const CollapsibleJSON = ({ data, title, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Box sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">{title}</Typography>
        <Button onClick={toggleCollapse}>
          {isCollapsed ? 'Expand' : 'Collapse'}
        </Button>
      </Box>
      {!isCollapsed && (
        <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </Box>
      )}
    </Box>
  );
};

export default CollapsibleJSON;