"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { notifications as apiNotifications, DMTNotification } from "@dmt/api";
import { useAuth } from "../context/AuthContext";

export function useNotifications() {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<DMTNotification[]>([]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiNotifications.list();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  useEffect(() => {
    // Request browser notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string | number) => {
    try {
      await apiNotifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiNotifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
