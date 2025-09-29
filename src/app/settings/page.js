// src/app/settings/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Center } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/management/UserManager';

export default function SettingsPage() {
  const { isManager } = useAuth();
  const [users, setUsers] = useState([]);

  const fetchData = async () => {
    if (isManager) {
      try {
        const userData = await window.api.getUsers();
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [isManager]);
  
  // Role-based access control
  if (!isManager) {
    return (
      <Center style={{ height: '50vh' }}>
        <Text c="red" fw={500}>You do not have permission to view this page.</Text>
      </Center>
    );
  }

  return (
    <div>
      <Title order={1} mb="xl">Settings</Title>
      <UserManager users={users} onDataChanged={fetchData} />
    </div>
  );
}