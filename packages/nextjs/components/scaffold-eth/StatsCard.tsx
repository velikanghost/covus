"use client";

import { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  color: "blue" | "green" | "purple" | "orange" | "red";
}

const colorClasses = {
  blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900",
  green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900",
  purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900",
  orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900",
  red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900",
};

export const StatsCard = ({ icon, title, value, subtitle, color }: StatsCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};
