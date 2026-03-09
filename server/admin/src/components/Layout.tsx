import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import { getHealth } from '../api/client';

const DRAWER_WIDTH = 200;

const nav = [
  { label: 'Books', path: '/books', icon: <MenuBookIcon /> },
  { label: 'Categories', path: '/categories', icon: <CategoryIcon /> },
  { label: 'Tags', path: '/tags', icon: <LabelIcon /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getHealth().then(h => setVersion(h.version)).catch(() => {});
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <MenuBookIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap>Book Collection Scanner</Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } }}
      >
        <Toolbar />
        <List sx={{ flex: 1 }}>
          {nav.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        {version && (
          <Typography
            variant="caption"
            sx={{ p: 1.5, color: 'text.disabled' }}
          >
            v{version}
          </Typography>
        )}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar />
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
