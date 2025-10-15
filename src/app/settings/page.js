// src/app/settings/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Center, Tabs } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/management/UserManager';
import RoleManager from '@/components/management/RoleManager';

export default function SettingsPage() {
  const { hasPermission } = useAuth(); // <-- Use hasPermission
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  // Determine permissions once
  const canManageUsers = hasPermission('settings:manage_users');
  const canManageRoles = hasPermission('settings:manage_roles');

  const fetchData = async () => {
    if (canManageUsers) { 
      try {
        const [userData, roleData] = await Promise.all([
          window.api.getUsers(),
          window.api.getRoles(),
        ]);
        setUsers(userData);
        setRoles(roleData);
      } catch (error) {
        console.error("Error fetching settings data:", error);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [canManageUsers]);
  
  // If user can't manage users OR roles, they can't see this page at all.
  if (!canManageUsers && !canManageRoles) {
    return (
      <Center style={{ height: '50vh' }}>
        <Text c="red" fw={500}>You do not have permission to view this page.</Text>
      </Center>
    );
  }

  // Determine the default tab based on permissions
  const defaultTab = canManageUsers ? 'users' : 'roles';

  return (
    <div>
      <Title order={1} mb="xl">Settings</Title>
      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {/* Only show the Manage Staff tab if the user has permission */}
          {canManageUsers && <Tabs.Tab value="users">Manage Staff</Tabs.Tab>}
          {/* Only show the Manage Roles tab if the user has permission */}
          {canManageRoles && <Tabs.Tab value="roles">Manage Roles</Tabs.Tab>}
        </Tabs.List>

        {canManageUsers && (
          <Tabs.Panel value="users" pt="md">
            <UserManager users={users} roles={roles} onDataChanged={fetchData} />
          </Tabs.Panel>
        )}
        
        {canManageRoles && (
          <Tabs.Panel value="roles" pt="md">
            <RoleManager roles={roles} onDataChanged={fetchData} />
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}