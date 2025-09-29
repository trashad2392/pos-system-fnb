// src/app/sales/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Tabs, Loader, Center } from '@mantine/core';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import Dashboard from './components/Dashboard';
import SalesReport from './components/SalesReport';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard state
  const [dashboardDateRange, setDashboardDateRange] = useState([subDays(new Date(), 6), new Date()]);
  const [stats, setStats] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  // Report state
  const [reportDateRange, setReportDateRange] = useState([startOfDay(new Date()), endOfDay(new Date())]);
  const [sales, setSales] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Fetch data for the dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!dashboardDateRange[0] || !dashboardDateRange[1]) return;
      
      setIsDashboardLoading(true);
      try {
        const range = {
          startDate: startOfDay(dashboardDateRange[0]).toISOString(),
          endDate: endOfDay(dashboardDateRange[1]).toISOString(),
        };

        const [statsData, comparisonData, dailyData] = await Promise.all([
          window.api.getSalesStats(range),
          window.api.getSalesComparison(range),
          window.api.getDailySalesForRange(range),
        ]);

        setStats(statsData);
        setComparisonStats(comparisonData);
        setChartData(dailyData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsDashboardLoading(false);
      }
    };
    fetchDashboardData();
  }, [dashboardDateRange]);

  // Fetch data for the detailed report
  useEffect(() => {
    const fetchSalesData = async () => {
      if (!reportDateRange[0] || !reportDateRange[1]) return;
      
      setIsReportLoading(true);
      try {
        const salesData = await window.api.getSalesByDateRange({
          startDate: startOfDay(reportDateRange[0]).toISOString(),
          endDate: endOfDay(reportDateRange[1]).toISOString(),
        });
        setSales(salesData);
      } catch (error) {
        console.error("Failed to fetch sales for report:", error);
      } finally {
        setIsReportLoading(false);
      }
    };

    if (activeTab === 'report') {
        fetchSalesData();
    }
  }, [reportDateRange, activeTab]);
  
  return (
    <div>
      <Title order={1} mb="xl">Sales</Title>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
          <Tabs.Tab value="report">Detailed Report</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard" pt="md">
          {isDashboardLoading ? <Center><Loader /></Center> : 
            <Dashboard 
              stats={stats} 
              comparisonStats={comparisonStats}
              chartData={chartData}
              dateRange={dashboardDateRange} 
              onDateChange={setDashboardDateRange}
            />
          }
        </Tabs.Panel>

        <Tabs.Panel value="report" pt="md">
          {isReportLoading ? <Center><Loader /></Center> : <SalesReport sales={sales} dateRange={reportDateRange} onDateChange={setReportDateRange} />}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}