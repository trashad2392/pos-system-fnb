// src/app/settings/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Center, Tabs, Loader } from '@mantine/core'; // Added Loader
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/management/UserManager';
import RoleManager from '@/components/management/RoleManager';
import MenuSettingsManager from '@/components/management/MenuSettingsManager'; // <-- Import MenuSettingsManager

// Define a new permission key for POS settings management
const POS_SETTINGS_PERMISSION = 'settings:manage_pos';

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // <-- Add loading state

  // Determine permissions once
  const canManageUsers = hasPermission('settings:manage_users');
  const canManageRoles = hasPermission('settings:manage_roles');
  const canManagePosSettings = hasPermission(POS_SETTINGS_PERMISSION); // <-- Check new permission

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch data only if relevant permissions exist
    if (canManageUsers || canManageRoles) {
      try {
        // Fetch users and roles only if needed for those tabs
        const promises = [];
        if (canManageUsers) promises.push(window.api.getUsers()); else promises.push(Promise.resolve([])); // Add empty promise if no permission
        if (canManageRoles || canManageUsers) promises.push(window.api.getRoles()); else promises.push(Promise.resolve([])); // Roles needed for UserManager too

        const [userData, roleData] = await Promise.all(promises);

        setUsers(userData);
        setRoles(roleData);
      } catch (error) {
        console.error("Error fetching staff/role settings data:", error);
         // Show notification?
      }
    }
    // No specific data needed for MenuSettingsManager initially, it fetches its own
    setIsLoading(false);
  };

  // Refetch data if permissions change (though unlikely without reload)
  useEffect(() => {
    fetchData();
  }, [canManageUsers, canManageRoles, canManagePosSettings]); // Include all relevant permissions

  // If user has none of the required permissions, deny access.
  if (!canManageUsers && !canManageRoles && !canManagePosSettings) {
    return (
      <Center style={{ height: '50vh' }}>
        <Text c="red" fw={500}>You do not have permission to view this page.</Text>
      </Center>
    );
  }

   if (isLoading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Loader />
      </Center>
    );
   }

  // Determine the default tab based on permissions (prioritize POS Settings if available)
  const defaultTab = canManagePosSettings ? 'pos_settings'
                   : canManageUsers ? 'users'
                   : 'roles';

  return (
    <div>
      <Title order={1} mb="xl">Settings</Title>
      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {/* Conditionally render tabs based on permissions */}
          {canManagePosSettings && <Tabs.Tab value="pos_settings">POS Settings</Tabs.Tab>} {/* <-- Add POS Settings tab */}
          {canManageUsers && <Tabs.Tab value="users">Manage Staff</Tabs.Tab>}
          {canManageRoles && <Tabs.Tab value="roles">Manage Roles</Tabs.Tab>}
        </Tabs.List>

        {/* --- Add POS Settings Panel --- */}
        {canManagePosSettings && (
          <Tabs.Panel value="pos_settings" pt="md">
            <MenuSettingsManager /> {/* No props needed for now */}
          </Tabs.Panel>
        )}
        {/* --- End Add POS Settings Panel --- */}

        {canManageUsers && (
          <Tabs.Panel value="users" pt="md">
            <UserManager users={users} roles={roles} onDataChanged={fetchData} />
          </Tabs.Panel>
        )}

        {canManageRoles && (
          <Tabs.Panel value="roles" pt="md">
            {/* Pass roles state */}
            <RoleManager roles={roles} onDataChanged={fetchData} />
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}