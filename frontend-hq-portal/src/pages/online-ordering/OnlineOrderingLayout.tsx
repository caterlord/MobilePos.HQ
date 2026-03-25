import { Container } from '@mantine/core';
import { Outlet } from 'react-router-dom';

export function OnlineOrderingLayout() {
  return (
    <Container size="xl" py="xl">
      <Outlet />
    </Container>
  );
}
