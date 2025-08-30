// src/components/ClientDateTime.js
"use client";

import { useState, useEffect } from 'react';

export default function ClientDateTime({ date }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(new Date(date).toLocaleString());
  }, [date]);

  return <>{formattedDate}</>;
}