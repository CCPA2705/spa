import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Filter, Calendar, Clock, User, Phone,
  MoreVertical, CheckCircle, XCircle, PlayCircle, FileText,
  DollarSign, ChevronLeft, ChevronRight, X, Save, ArrowRight, Users, AlertTriangle
} from 'lucide-react';
import { Booking, BookingStatus, Service, Employee, ServiceCategory, ServiceStatus, Position, EmployeeStatus } from '../types';

interface BookingPageProps {
  bookings: Booking[];
  employees: Employee[];
  services: Service[];
  onAddBooking: (booking: Booking) => void;
  onUpdateBooking: (booking: Booking) => void;
}

const TOTAL_ROOMS = 5;

// Helper to generate time slots consistent with OperationsPage (10:00 to 22:00)
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 10; h <= 22; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 22 && m > 0) break; // Stop at 22:00
      const hourStr = h.toString();
      const minStr = m.toString().padStart(2, '0');
      slots.push({
        time: `${hourStr}:${minStr}`,
        hour: hourStr,
        minute: minStr
      });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Helper: Convert HH:MM to minutes
const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const INITIAL_FORM_DATA: Omit<Booking, 'id' | 'code' | 'serviceName' | 'staffName' | 'duration' | 'totalAmount'> & { selectedStaffIds: string[] } = {
  customerName: '',
  customerPhone: '',
  serviceId: '',
  staffId: '',
  selectedStaffIds: [],
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  status: BookingStatus.CONFIRMED, // Changed from PENDING to CONFIRMED
  notes: ''
};

export const BookingPage: React.FC<BookingPageProps> = ({
  bookings,
  employees,
  services,
  onAddBooking,
  onUpdateBooking
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Derived Filters
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerPhone.includes(searchTerm) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    const matchesDate = !filterDate || b.date === filterDate;

    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  // Filter available staff (Active Therapists only) for the dropdown
  const availableStaff = employees.filter(e =>
    e.status === EmployeeStatus.ACTIVE && e.position === Position.THERAPIST
  );

  // Helpers
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING: return 'bg-yellow-100 text-yellow-700 ring-yellow-600/20';
      case BookingStatus.CONFIRMED: return 'bg-blue-100 text-blue-700 ring-blue-600/20';
      case BookingStatus.IN_PROGRESS: return 'bg-purple-100 text-purple-700 ring-purple-600/20';
      case BookingStatus.COMPLETED: return 'bg-green-100 text-green-700 ring-green-600/20';
      case BookingStatus.CANCELLED: return 'bg-gray-100 text-gray-600 ring-gray-500/20';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const generateCode = () => {
    const max = bookings.reduce((m, b) => {
      const codeVal = b.code ? b.code.replace('BK', '') : '0';
      const num = parseInt(codeVal) || 0;
      return Math.max(m, num);
    }, 0);
    return `BK${(max + 1).toString().padStart(3, '0')}`;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + durationMinutes);
    return date.toTimeString().slice(0, 5);
  };

  // --- ROOM AVAILABILITY CHECKER ---
  const getRoomAvailability = (checkTime: string, duration: number) => {
    const checkStart = timeToMinutes(checkTime);
    const checkEnd = checkStart + duration;

    // Filter bookings on selected date (formData.date)
    const dateBookings = bookings.filter(b => b.date === formData.date);

    // Count overlapping bookings at this time
    const overlappingBookings = dateBookings.filter(b => {
      if (b.status === BookingStatus.CANCELLED) return false;
      if (isEditing && b.id === currentId) return false; // Ignore self

      const bStart = timeToMinutes(b.time);
      const bEnd = bStart + b.duration;

      // Check overlap logic
      return Math.max(checkStart, bStart) < Math.min(checkEnd, bEnd);
    });

    return {
      isAvailable: overlappingBookings.length < TOTAL_ROOMS,
      occupiedCount: overlappingBookings.length
    };
  };

  // Handlers
  const openAddModal = () => {
    setFormData({ ...INITIAL_FORM_DATA, date: filterDate });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (booking: Booking) => {
    // const service = services.find(s => s.id === booking.serviceId);
    let initialSelectedStaffIds: string[] = [];

    if (booking.staffIds && booking.staffIds.length > 0) {
      initialSelectedStaffIds = booking.staffIds;
    } else if (booking.staffId) {
      initialSelectedStaffIds = [booking.staffId];
    }

    setFormData({
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      serviceId: booking.serviceId,
      staffId: booking.staffId || '',
      selectedStaffIds: initialSelectedStaffIds,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      notes: booking.notes || ''
    });
    setCurrentId(booking.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newServiceId = e.target.value;
    const service = services.find(s => s.id === newServiceId);

    setFormData(prev => ({
      ...prev,
      serviceId: newServiceId,
      selectedStaffIds: service ? new Array(service.staffCount).fill('') : []
    }));
  };

  const handleStaffChange = (index: number, value: string) => {
    const newSelectedStaffIds = [...formData.selectedStaffIds];
    newSelectedStaffIds[index] = value;
    setFormData(prev => ({
      ...prev,
      selectedStaffIds: newSelectedStaffIds
    }));
  };

  // Logic to calculate displayed end time and room status
  const selectedService = services.find(s => s.id === formData.serviceId);
  const calculatedEndTime = selectedService ? calculateEndTime(formData.time, selectedService.duration) : '';
  const requiredStaffCount = selectedService?.staffCount || 1;

  const roomStatus = useMemo(() => {
    if (!selectedService || !formData.time) return { isFull: false, nextTime: null };

    const { isAvailable } = getRoomAvailability(formData.time, selectedService.duration);

    if (isAvailable) return { isFull: false, nextTime: null };

    // If full, find next available
    let nextTime = null;
    const startIndex = TIME_SLOTS.findIndex(t => t.time === formData.time);

    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < TIME_SLOTS.length; i++) {
        const slot = TIME_SLOTS[i];
        const check = getRoomAvailability(slot.time, selectedService.duration);
        if (check.isAvailable) {
          nextTime = slot.time;
          break;
        }
      }
    }

    return { isFull: true, nextTime };
  }, [formData.time, selectedService, bookings, formData.date, isEditing, currentId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const service = services.find(s => s.id === formData.serviceId);

    if (!service) return alert('Vui lòng chọn dịch vụ');

    // Soft check for rooms
    if (roomStatus.isFull) {
      const confirmOverbook = window.confirm(`Cảnh báo: Đã hết phòng vào lúc ${formData.time}. Bạn vẫn muốn tạo lịch?`);
      if (!confirmOverbook) return;
    }

    // Remove empty strings from selectedStaffIds
    const validStaffIds = formData.selectedStaffIds.filter(id => id && id.trim() !== '');

    // CHECK: MANDATORY STAFF SELECTION
    if (validStaffIds.length < service.staffCount) {
      alert(`Dịch vụ này yêu cầu ${service.staffCount} nhân viên. Vui lòng chọn đủ nhân viên.`);
      return;
    }

    const selectedStaffObjects = validStaffIds
      .map(id => employees.find(e => e.id === id))
      .filter(Boolean);

    const staffNameString = selectedStaffObjects.length > 0
      ? selectedStaffObjects.map(e => e?.name).join(', ')
      : 'Chưa chỉ định';

    const primaryStaffId = validStaffIds[0] || null;

    const bookingData = {
      ...formData,
      serviceName: service.name,
      staffName: staffNameString,
      staffId: primaryStaffId,
      staffIds: validStaffIds,
      duration: service.duration,
      totalAmount: service.price,
    };

    const { selectedStaffIds, ...finalBookingData } = bookingData;

    if (isEditing && currentId) {
      const updatedBooking = { ...finalBookingData, id: currentId } as Booking;
      onUpdateBooking(updatedBooking);
    } else {
      const newBooking: Booking = {
        id: Date.now().toString(),
        code: generateCode(),
        ...finalBookingData
      } as Booking;
      onAddBooking(newBooking);
    }
    setIsModalOpen(false);
  };

  const updateStatus = (id: string, newStatus: BookingStatus) => {
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      onUpdateBooking({ ...booking, status: newStatus });
    }
  };

  useEffect(() => {
    if (selectedService && formData.selectedStaffIds.length !== selectedService.staffCount) {
      const newArr = [...formData.selectedStaffIds];
      if (newArr.length < selectedService.staffCount) {
        while (newArr.length < selectedService.staffCount) newArr.push('');
      } else {
        newArr.splice(selectedService.staffCount);
      }
      // Only update if actually different to avoid infinite loop
      if (JSON.stringify(newArr) !== JSON.stringify(formData.selectedStaffIds)) {
        setFormData(prev => ({ ...prev, selectedStaffIds: newArr }));
      }
    }
  }, [formData.serviceId, selectedService]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Lịch Đặt</h2>
          <p className="text-gray-500 mt-1">Theo dõi và xử lý các cuộc hẹn của khách hàng.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-spa-600 text-white rounded-lg hover:bg-spa-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Tạo lịch mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, mã booking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-spa-500/50"
          />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-spa-500/50 text-gray-700"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-spa-500/50 text-gray-700"
          >
            <option value="All">Tất cả trạng thái</option>
            {Object.values(BookingStatus).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Quick View (Optional) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="text-blue-600 text-sm font-medium mb-1">Tổng lịch hôm nay</div>
          <div className="text-2xl font-bold text-blue-800">{bookings.filter(b => b.date === filterDate).length}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
          <div className="text-yellow-600 text-sm font-medium mb-1">Chờ xác nhận</div>
          <div className="text-2xl font-bold text-yellow-800">{bookings.filter(b => b.date === filterDate && b.status === BookingStatus.PENDING).length}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div className="text-purple-600 text-sm font-medium mb-1">Đang phục vụ</div>
          <div className="text-2xl font-bold text-purple-800">{bookings.filter(b => b.date === filterDate && b.status === BookingStatus.IN_PROGRESS).length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <div className="text-green-600 text-sm font-medium mb-1">Doanh thu dự kiến</div>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(bookings.filter(b => b.date === filterDate && b.status !== BookingStatus.CANCELLED).reduce((sum, b) => sum + b.totalAmount, 0))}
          </div>
        </div>
      </div>

      {/* Content - Responsive */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredBookings.map(booking => (
            <div key={booking.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{booking.time}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{booking.code}</span>
                  </div>
                  <div className="font-medium text-gray-800 mt-1">{booking.customerName}</div>
                  <div className="text-xs text-gray-500">{booking.serviceName}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>{booking.staffName}</span>
                </div>
                <div className="font-medium text-spa-700">
                  {formatCurrency(booking.totalAmount)}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {booking.status === BookingStatus.PENDING && (
                  <button onClick={() => updateStatus(booking.id, BookingStatus.CONFIRMED)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium text-center">Xác nhận</button>
                )}
                {booking.status === BookingStatus.CONFIRMED && (
                  <button onClick={() => updateStatus(booking.id, BookingStatus.IN_PROGRESS)} className="flex-1 py-1.5 bg-purple-50 text-purple-600 rounded text-xs font-medium text-center">Bắt đầu</button>
                )}
                {booking.status === BookingStatus.IN_PROGRESS && (
                  <button onClick={() => updateStatus(booking.id, BookingStatus.COMPLETED)} className="flex-1 py-1.5 bg-green-50 text-green-600 rounded text-xs font-medium text-center">Hoàn thành</button>
                )}
                <button onClick={() => openEditModal(booking)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs">Sửa</button>
              </div>
            </div>
          ))}
          {filteredBookings.length === 0 && (
            <div className="p-8 text-center text-gray-400">Không có lịch hẹn nào.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-xs">
              <tr>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Dịch vụ</th>
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Tổng tiền</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-base">{booking.time}</span>
                      <span className="text-xs text-gray-400">{booking.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{booking.customerName}</div>
                    <div className="text-xs text-gray-500">{booking.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{booking.serviceName}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {booking.duration} phút
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${(!booking.staffIds || booking.staffIds.length === 0) ? 'bg-gray-100 text-gray-500 italic' : 'bg-green-50 text-green-700'}`}>
                      {booking.staffName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-spa-700">
                    {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick Actions based on Status */}
                      {booking.status === BookingStatus.PENDING && (
                        <button title="Xác nhận" onClick={() => updateStatus(booking.id, BookingStatus.CONFIRMED)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><CheckCircle size={18} /></button>
                      )}
                      {booking.status === BookingStatus.CONFIRMED && (
                        <button title="Bắt đầu" onClick={() => updateStatus(booking.id, BookingStatus.IN_PROGRESS)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"><PlayCircle size={18} /></button>
                      )}
                      {booking.status === BookingStatus.IN_PROGRESS && (
                        <button title="Hoàn thành" onClick={() => updateStatus(booking.id, BookingStatus.COMPLETED)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle size={18} /></button>
                      )}
                      {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                        <button title="Hủy" onClick={() => updateStatus(booking.id, BookingStatus.CANCELLED)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><XCircle size={18} /></button>
                      )}

                      <div className="h-4 w-px bg-gray-200 mx-1"></div>

                      <button onClick={() => openEditModal(booking)} className="text-gray-400 hover:text-gray-600"><FileText size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Không tìm thấy lịch hẹn nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg transform transition-all">
            <form onSubmit={handleSubmit}>
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">
                  {isEditing ? 'Cập nhật lịch hẹn' : 'Đặt lịch mới'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                      value={formData.customerPhone}
                      onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giờ vào (Khung 10p) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        required
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                        value={formData.time}
                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                      >
                        {TIME_SLOTS.map(t => (
                          <option key={t.time} value={t.time}>{t.time}</option>
                        ))}
                      </select>
                    </div>
                    {roomStatus.isFull && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle size={12} /> Hết phòng!
                        </div>
                        {roomStatus.nextTime ? (
                          <span>Trống lúc: <b>{roomStatus.nextTime}</b></span>
                        ) : (
                          <span>Không còn giờ trống hôm nay</span>
                        )}
                        <button
                          type="button"
                          onClick={() => roomStatus.nextTime && setFormData({ ...formData, time: roomStatus.nextTime })}
                          className="text-blue-600 hover:underline text-left mt-0.5 font-medium"
                        >
                          Chọn giờ này &rarr;
                        </button>
                      </div>
                    )}
                    {!roomStatus.isFull && calculatedEndTime && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-2 rounded-lg">
                        <ArrowRight size={12} />
                        Kết thúc: <span className="font-bold text-gray-700">{calculatedEndTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dịch vụ <span className="text-red-500">*</span></label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                    value={formData.serviceId}
                    onChange={handleServiceChange}
                  >
                    <option value="">-- Chọn dịch vụ --</option>
                    {services.filter(s => s.status === ServiceStatus.ACTIVE || s.id === formData.serviceId).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration}p) - {formatCurrency(s.price)}
                        {s.staffCount > 1 ? ` [${s.staffCount} NV]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staff Selection - DYNAMIC BASED ON STAFF COUNT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Users size={16} />
                    Nhân viên thực hiện ({requiredStaffCount} người)
                  </label>
                  <div className="space-y-2">
                    {Array.from({ length: requiredStaffCount }).map((_, index) => (
                      <select
                        key={index}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                        value={formData.selectedStaffIds[index] || ''}
                        onChange={e => handleStaffChange(index, e.target.value)}
                      >
                        <option value="">
                          -- Chọn nhân viên {requiredStaffCount > 1 ? index + 1 : ''} --
                        </option>
                        {availableStaff.map(e => (
                          <option
                            key={e.id}
                            value={e.id}
                            // Disable if already selected in another dropdown
                            disabled={formData.selectedStaffIds.includes(e.id) && formData.selectedStaffIds[index] !== e.id}
                          >
                            {e.name}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Yêu cầu đặc biệt của khách..."
                  />
                </div>

                {/* Status Selection - Modified to remove PENDING */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none font-medium ${formData.status === BookingStatus.CONFIRMED ? 'text-blue-700 bg-blue-50' :
                      formData.status === BookingStatus.IN_PROGRESS ? 'text-purple-700 bg-purple-50' :
                        formData.status === BookingStatus.COMPLETED ? 'text-green-700 bg-green-50' :
                          formData.status === BookingStatus.CANCELLED ? 'text-gray-500 bg-gray-50' :
                            'text-yellow-700 bg-yellow-50'
                      }`}
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                  >
                    {Object.values(BookingStatus)
                      .filter(st => st !== BookingStatus.PENDING) // Filter out Pending
                      .map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-spa-600 rounded-lg hover:bg-spa-700 flex items-center gap-2 shadow-sm"
                >
                  <Save size={18} />
                  {isEditing ? 'Cập nhật' : 'Tạo lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}