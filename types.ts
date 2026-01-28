import React from 'react';

export enum EmployeeStatus {
  ACTIVE = 'Đang làm việc',
  ON_LEAVE = 'Nghỉ phép',
  RESIGNED = 'Đã nghỉ việc',
}

export enum Position {
  MANAGER = 'Quản lý',
  THERAPIST = 'Kỹ thuật viên',
  RECEPTIONIST = 'Lễ tân',
  SECURITY = 'Bảo vệ',
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  avatar: string;
  position: Position;
  status: EmployeeStatus;
  phone: string;
  email: string;
  bio?: string; // AI generated bio
}

export enum ServiceCategory {
  MASSAGE = 'Massage & Trị Liệu',
  SKIN_CARE = 'Chăm Sóc Da Mặt',
  BODY_CARE = 'Chăm Sóc Cơ Thể',
  COMBO = 'Gói Combo',
  OTHER = 'Khác'
}

export enum ServiceStatus {
  ACTIVE = 'Đang hoạt động',
  STOPPED = 'Ngưng phục vụ',
}

export interface Service {
  id: string;
  code: string;
  name: string;
  image: string;
  category: ServiceCategory;
  duration: number; // minutes
  price: number;
  staffCount: number; // number of employees required
  status: ServiceStatus;
  description: string;
}

export enum BookingStatus {
  PENDING = 'Chờ xác nhận',
  CONFIRMED = 'Đã xác nhận',
  IN_PROGRESS = 'Đang thực hiện',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Đã hủy'
}

export interface Booking {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string; // Denormalized for easier display
  staffId: string | null; // Primary staff ID (or null)
  staffIds?: string[]; // NEW: Array of all assigned staff IDs
  staffName: string; // Denormalized (e.g., "Lan, Minh")
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // copied from service
  status: BookingStatus;
  notes?: string;
  totalAmount: number;
  discount?: number; // Amount to subtract from total
}

// --- NEW TYPES FOR OPERATIONS ---

export enum RoomStatus {
  AVAILABLE = 'Trống',
  OCCUPIED = 'Đang phục vụ',
  CLEANING = 'Đang dọn',
  MAINTENANCE = 'Bảo trì'
}

export enum RoomType {
  STANDARD = 'Giường Đơn',
  VIP = 'Phòng VIP',
  COUPLE = 'Phòng Đôi'
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  currentBooking?: {
    customerName: string;
    serviceName: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    staffName: string;
  };
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: string;
}