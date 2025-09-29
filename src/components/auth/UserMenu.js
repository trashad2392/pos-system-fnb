// src/components/auth/UserMenu.js
"use client";

import { Menu, Button, Text, rem } from '@mantine/core';
import { IconUserCircle, IconLogout, IconClockOff } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

export default function UserMenu() {
  const { user, logout, clockOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="subtle" color="gray" rightSection={<IconUserCircle size={18} />}>
          <Text size="sm" fw={500}>{user.name}</Text>
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{user.role}</Menu.Label>
        
        <Menu.Item
          leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
          onClick={logout}
        >
          Logout (Keep Shift)
        </Menu.Item>

        <Menu.Item
          color="red"
          leftSection={<IconClockOff style={{ width: rem(14), height: rem(14) }} />}
          onClick={clockOut}
        >
          Clock Out & Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}