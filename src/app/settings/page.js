// src/app/settings/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Center, Tabs, Loader } from '@mantine/core'; // Added Loader
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/management/UserManager';
import RoleManager from '@/components/management/RoleManager';
import PaymentMethodManager from '@/components/management/PaymentMethodManager'; // <-- NEW IMPORT

// Define permission keys
const MANAGE_USERS_PERMISSION = 'settings:manage_users';
const MANAGE_ROLES_PERMISSION = 'settings:manage_roles';
const MANAGE_PAYMENTS_PERMISSION = 'settings:manage_payments'; // <-- NEW PERMISSION

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // <-- Add loading state

  // Determine permissions once
  const canManageUsers = hasPermission(MANAGE_USERS_PERMISSION);
  const canManageRoles = hasPermission(MANAGE_ROLES_PERMISSION);
  // --- NEW PERMISSION CHECK ---
  const canManagePaymentMethods = hasPermission(MANAGE_PAYMENTS_PERMISSION); 
  // --- END NEW PERMISSION CHECK ---
  
  const fetchData = async () => {
    setIsLoading(true);
    // Fetch data only if relevant permissions exist
    if (canManageUsers || canManageRoles) {
      try {
        // Fetch users and roles only if needed for those tabs
        const promises = [];
        if (canManageUsers) promises.push(window.api.getUsers()); else promises.push(Promise.resolve([])); 
        if (canManageRoles || canManageUsers) promises.push(window.api.getRoles()); else promises.push(Promise.resolve([])); 

        const [userData, roleData] = await Promise.all(promises);

        setUsers(userData);
        setRoles(roleData);
      } catch (error) {
        console.error("Error fetching staff/role settings data:", error);
      }
    }
    setIsLoading(false);
  };

  // Refetch data if permissions change (though unlikely without reload)
  useEffect(() => {
    fetchData();
  }, [canManageUsers, canManageRoles]); 

  // If user has none of the required permissions for *this* page, deny access.
  if (!canManageUsers && !canManageRoles && !canManagePaymentMethods) { // <-- MODIFIED check
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

  // Determine the default tab based on permissions
  const defaultTab = canManageUsers ? 'users' : (canManageRoles ? 'roles' : 'payment-methods'); // <-- MODIFIED default tab logic

  return (
    <div>
      <Title order={1} mb="xl">Settings</Title>
      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {canManageUsers && <Tabs.Tab value="users">Manage Staff</Tabs.Tab>}
          {canManageRoles && <Tabs.Tab value="roles">Manage Roles</Tabs.Tab>}
          {/* --- NEW TAB --- */}
          {canManagePaymentMethods && <Tabs.Tab value="payment-methods">Payment Methods</Tabs.Tab>} 
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
        
        {/* --- NEW PANEL --- */}
        {canManagePaymentMethods && (
          <Tabs.Panel value="payment-methods" pt="md">
            {/* PaymentMethodManager fetches its own data */}
            <PaymentMethodManager />
          </Tabs.Panel>
        )}
        {/* --- END NEW PANEL --- */}

      </Tabs>
    </div>
  );
}