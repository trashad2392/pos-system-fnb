// src/app/settings/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Center, Tabs, Loader } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/management/UserManager';
import RoleManager from '@/components/management/RoleManager';
import PaymentMethodManager from '@/components/management/PaymentMethodManager';
import GeneralSettingsManager from '@/components/management/GeneralSettingsManager'; // Added for General Settings

// Define permission keys
const MANAGE_USERS_PERMISSION = 'settings:manage_users';
const MANAGE_ROLES_PERMISSION = 'settings:manage_roles';
const MANAGE_PAYMENTS_PERMISSION = 'settings:manage_payments';
const MANAGE_GENERAL_PERMISSION = 'settings:manage_general'; // New Permission

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine permissions once
  const canManageUsers = hasPermission(MANAGE_USERS_PERMISSION);
  const canManageRoles = hasPermission(MANAGE_ROLES_PERMISSION);
  const canManagePaymentMethods = hasPermission(MANAGE_PAYMENTS_PERMISSION); 
  const canManageGeneral = hasPermission(MANAGE_GENERAL_PERMISSION); // New check
  
  const fetchData = async () => {
    setIsLoading(true);
    // Fetch data only if relevant permissions exist for users or roles
    if (canManageUsers || canManageRoles) {
      try {
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

  useEffect(() => {
    fetchData();
  }, [canManageUsers, canManageRoles]); 

  // Deny access if user has no settings permissions at all
  if (!canManageUsers && !canManageRoles && !canManagePaymentMethods && !canManageGeneral) {
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

  // Determine the default tab based on priority
  const defaultTab = canManageGeneral ? 'general' : (canManageUsers ? 'users' : (canManageRoles ? 'roles' : 'payment-methods'));

  return (
    <div>
      <Title order={1} mb="xl">Settings</Title>
      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {canManageGeneral && <Tabs.Tab value="general">General</Tabs.Tab>}
          {canManageUsers && <Tabs.Tab value="users">Manage Staff</Tabs.Tab>}
          {canManageRoles && <Tabs.Tab value="roles">Manage Roles</Tabs.Tab>}
          {canManagePaymentMethods && <Tabs.Tab value="payment-methods">Payment Methods</Tabs.Tab>} 
        </Tabs.List>

        {canManageGeneral && (
          <Tabs.Panel value="general" pt="md">
            <GeneralSettingsManager />
          </Tabs.Panel>
        )}

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
        
        {canManagePaymentMethods && (
          <Tabs.Panel value="payment-methods" pt="md">
            <PaymentMethodManager />
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}