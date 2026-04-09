"use client";
import { useAuth } from "@/context/AppContext";
import NeroScheduleView from "@/components/schedule/NeroScheduleView";
import EmployeeBookingView from "@/components/schedule/EmployeeBookingView";

export default function SchedulePage() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  return currentUser.role === "admin" ? <NeroScheduleView /> : <EmployeeBookingView />;
}
