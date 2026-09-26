import type { ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import Header from './Header';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}

