import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Calendar, ChevronLeft, ChevronRight, Search,
    Plus, X, Save, ArrowRight, Users, AlignLeft,
    Filter, CheckCircle, PlayCircle, XCircle, FileText, Clock,
    MoreVertical, List, AlertTriangle, DollarSign, Tag, Eye,
    LayoutGrid, BedDouble, UserCheck, SlidersHorizontal, FilterX,
    TrendingUp, CalendarRange, CalendarDays, Phone, User
} from 'lucide-react';
import { Booking, Employee, BookingStatus, EmployeeStatus, Position, Service, ServiceStatus } from '../types';

interface OperationsPageProps {
    bookings: Booking[];
    employees: Employee[];
    services: Service[];
    onAddBooking: (booking: Booking) => void;
    onUpdateBooking: (booking: Booking) => void;
}

// Config constant
const TOTAL_ROOMS = 5;

// Helper to generate time slots (10:00 to 22:00, 10 min intervals)
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

const ALL_TIME_SLOTS = generateTimeSlots();

// Helper: Convert HH:MM to minutes
const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Color mapping based on BookingStatus
const getStatusColor = (status: BookingStatus) => {
    switch (status) {
        case BookingStatus.PENDING:
            return 'bg-yellow-300 text-yellow-900 border-l-4 border-yellow-500';
        case BookingStatus.CONFIRMED:
            return 'bg-blue-500 text-white border-l-4 border-blue-700';
        case BookingStatus.IN_PROGRESS:
            return 'bg-purple-500 text-white border-l-4 border-purple-700';
        case BookingStatus.COMPLETED:
            return 'bg-green-500 text-white border-l-4 border-green-700';
        case BookingStatus.CANCELLED:
            return 'bg-gray-400 text-white border-l-4 border-gray-600';
        default:
            return 'bg-gray-300 text-gray-700';
    }
};

const getStatusColorBadge = (status: BookingStatus) => {
    switch (status) {
        case BookingStatus.PENDING: return 'bg-yellow-100 text-yellow-700 ring-yellow-600/20';
        case BookingStatus.CONFIRMED: return 'bg-blue-100 text-blue-700 ring-blue-600/20';
        case BookingStatus.IN_PROGRESS: return 'bg-purple-100 text-purple-700 ring-purple-600/20';
        case BookingStatus.COMPLETED: return 'bg-green-100 text-green-700 ring-green-600/20';
        case BookingStatus.CANCELLED: return 'bg-gray-100 text-gray-600 ring-gray-500/20';
        default: return 'bg-gray-50 text-gray-600';
    }
};

const INITIAL_FORM_DATA: Omit<Booking, 'id' | 'code' | 'serviceName' | 'staffName' | 'duration' | 'totalAmount'> & { selectedStaffIds: string[], discount: number } = {
    customerName: '',
    customerPhone: '',
    serviceId: '',
    staffId: '',
    selectedStaffIds: [],
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    status: BookingStatus.CONFIRMED,
    notes: '',
    discount: 0
};

export const OperationsPage: React.FC<OperationsPageProps> = ({
    bookings,
    employees,
    services,
    onAddBooking,
    onUpdateBooking
}) => {
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [filterStaffId, setFilterStaffId] = useState<string>('All');
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);

    // Real-time clock for status updates
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Time Slot Filter State
    const [filterStartTime, setFilterStartTime] = useState('10:00');
    const [filterEndTime, setFilterEndTime] = useState('22:00');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    // Generate visible slots based on filter
    const visibleTimeSlots = useMemo(() => {
        const start = timeToMinutes(filterStartTime);
        const end = timeToMinutes(filterEndTime);
        return ALL_TIME_SLOTS.filter(s => {
            const t = timeToMinutes(s.time);
            return t >= start && t <= end;
        });
    }, [filterStartTime, filterEndTime]);

    // Helper: Determine if status counts as "Busy" / "Blocking"
    // Used for both Timeline Filtering AND Booking Conflict Checking
    const isBlocking = (status: BookingStatus) => {
        return status === BookingStatus.CONFIRMED ||
            status === BookingStatus.IN_PROGRESS ||
            status === BookingStatus.PENDING;
    };

    // --- FILTERING LOGIC ---

    // 1. Data Strictly for Current Date
    const bookingsForCurrentDate = bookings.filter(b => b.date === currentDate);

    // 2. Data for List View (Supports Global Search)
    const filteredBookings = bookings.filter(b => {
        // a. Filter by Status
        if (filterStatus !== 'All' && b.status !== filterStatus) return false;

        // b. Filter by Staff (NEW)
        if (filterStaffId !== 'All') {
            const isAssigned = (b.staffIds && b.staffIds.includes(filterStaffId)) || b.staffId === filterStaffId;
            if (!isAssigned) return false;
        }

        // c. Filter by Search Term
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            return (
                (b.customerName || '').toLowerCase().includes(lowerTerm) ||
                (b.customerPhone || '').includes(lowerTerm) ||
                (b.code || '').toLowerCase().includes(lowerTerm) ||
                (b.staffName || '').toLowerCase().includes(lowerTerm)
            );
        }

        // d. If NO Search Term, strictly filter by Date
        return b.date === currentDate;
    });

    // Calculate Daily Stats
    const completedBookings = bookingsForCurrentDate.filter(b => b.status === BookingStatus.COMPLETED);
    const completedCount = completedBookings.length;
    const cancelledCount = bookingsForCurrentDate.filter(b => b.status === BookingStatus.CANCELLED).length;

    // --- REVENUE CALCULATION LOGIC ---
    const revenueStats = useMemo(() => {
        const completed = bookings.filter(b => b.status === BookingStatus.COMPLETED);

        const selDate = new Date(currentDate);
        const selYear = selDate.getFullYear();
        const selMonth = selDate.getMonth();

        // Calculate start and end of the week (Monday to Sunday)
        const monday = new Date(selDate);
        const day = monday.getDay() || 7;
        if (day !== 1) monday.setDate(monday.getDate() - (day - 1));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const dayRev = completed
            .filter(b => b.date === currentDate)
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        const weekRev = completed
            .filter(b => {
                const d = new Date(b.date);
                // Set time to compare purely by date range
                const dTime = d.getTime();
                return dTime >= monday.getTime() && dTime <= sunday.getTime();
            })
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        const monthRev = completed
            .filter(b => {
                const d = new Date(b.date);
                return d.getMonth() === selMonth && d.getFullYear() === selYear;
            })
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        const yearRev = completed
            .filter(b => {
                const d = new Date(b.date);
                return d.getFullYear() === selYear;
            })
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        return { day: dayRev, week: weekRev, month: monthRev, year: yearRev };
    }, [bookings, currentDate]);


    // Timeline Data: strictly current date, excluding cancelled
    const timelineBookings = bookingsForCurrentDate.filter(b => b.status !== BookingStatus.CANCELLED);

    // Filter active employees who are THERAPISTS
    const activeEmployees = employees.filter(e =>
        e.status === EmployeeStatus.ACTIVE && e.position === Position.THERAPIST
    );

    // --- TIMELINE ROW FILTERING ---
    const filteredTimelineEmployees = useMemo(() => {
        let result = activeEmployees;

        // 1. Staff Specific Filter (NEW)
        if (filterStaffId !== 'All') {
            result = result.filter(e => e.id === filterStaffId);
        }

        // 2. Text Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(emp => {
                if (emp.name.toLowerCase().includes(lowerTerm) || emp.code.toLowerCase().includes(lowerTerm)) {
                    return true;
                }
                const empBookings = bookingsForCurrentDate.filter(b =>
                    (b.staffIds && b.staffIds.includes(emp.id)) || b.staffId === emp.id
                );
                return empBookings.some(b =>
                    b.customerName.toLowerCase().includes(lowerTerm) ||
                    b.customerPhone.includes(lowerTerm) ||
                    b.code.toLowerCase().includes(lowerTerm)
                );
            });
        }

        // 3. Availability Filter (Show Available Only)
        // Rule: Hide staff if they have any CONFIRMED/IN_PROGRESS/PENDING booking overlapping the filtered time window.
        if (showAvailableOnly) {
            const startFilter = timeToMinutes(filterStartTime);
            const endFilter = timeToMinutes(filterEndTime);

            result = result.filter(emp => {
                const hasOverlap = bookingsForCurrentDate.some(b => {
                    if (!isBlocking(b.status)) return false; // Only blocking statuses hide the staff

                    const isAssigned = (b.staffIds && b.staffIds.includes(emp.id)) || b.staffId === emp.id;
                    if (!isAssigned) return false;

                    const bStart = timeToMinutes(b.time);
                    const bEnd = bStart + b.duration;

                    return bStart < endFilter && bEnd > startFilter;
                });
                return !hasOverlap;
            });
        }

        return result;
    }, [activeEmployees, searchTerm, bookingsForCurrentDate, showAvailableOnly, filterStartTime, filterEndTime, filterStaffId]);

    // Filter available staff for Dropdown
    const availableStaffForDropdown = employees.filter(e =>
        e.status === EmployeeStatus.ACTIVE && e.position === Position.THERAPIST
    );

    // --- ROOM GANTT CHART ALLOCATION LOGIC ---
    const roomAllocations = useMemo(() => {
        const sorted = [...timelineBookings].sort((a, b) => a.time.localeCompare(b.time));
        const allocation: Record<string, number> = {}; // bookingId -> roomIndex
        const roomFreeTime = new Array(TOTAL_ROOMS).fill(0);

        sorted.forEach(booking => {
            const start = timeToMinutes(booking.time);
            const end = start + booking.duration;

            let assignedRoomIndex = -1;
            for (let i = 0; i < TOTAL_ROOMS; i++) {
                if (start >= roomFreeTime[i]) {
                    assignedRoomIndex = i;
                    roomFreeTime[i] = end;
                    break;
                }
            }

            if (assignedRoomIndex !== -1) {
                allocation[booking.id] = assignedRoomIndex;
            }
        });

        return allocation;
    }, [timelineBookings]);

    // Filter Rooms for Timeline View
    const filteredTimelineRooms = useMemo(() => {
        let result = Array.from({ length: TOTAL_ROOMS }, (_, i) => i);

        // 1. Text Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(roomIndex => {
                const bookingsInRoom = timelineBookings.filter(b => roomAllocations[b.id] === roomIndex);
                return bookingsInRoom.some(b =>
                    b.customerName.toLowerCase().includes(lowerTerm) ||
                    b.customerPhone.includes(lowerTerm) ||
                    b.code.toLowerCase().includes(lowerTerm) ||
                    b.staffName.toLowerCase().includes(lowerTerm)
                );
            });
        }

        // 2. Availability Filter
        if (showAvailableOnly) {
            const startFilter = timeToMinutes(filterStartTime);
            const endFilter = timeToMinutes(filterEndTime);

            result = result.filter(roomIndex => {
                const bookingsInRoom = timelineBookings.filter(b => roomAllocations[b.id] === roomIndex);

                const hasOverlap = bookingsInRoom.some(b => {
                    if (!isBlocking(b.status)) return false; // Pending/Completed bookings don't hide the room

                    const bStart = timeToMinutes(b.time);
                    const bEnd = bStart + b.duration;
                    return bStart < endFilter && bEnd > startFilter;
                });

                return !hasOverlap;
            });
        }

        return result;
    }, [searchTerm, timelineBookings, roomAllocations, showAvailableOnly, filterStartTime, filterEndTime]);

    // --- NEXT AVAILABLE SUGGESTION LOGIC (For Filter Toolbar) ---
    const nextAvailableSuggestion = useMemo(() => {
        // Only calculate if "Available Only" is ON and NO rooms are currently found for the window
        if (!showAvailableOnly || filteredTimelineRooms.length > 0) return null;

        const duration = timeToMinutes(filterEndTime) - timeToMinutes(filterStartTime);
        const startIndex = ALL_TIME_SLOTS.findIndex(t => t.time === filterStartTime);

        if (startIndex === -1) return null;

        // Helper to check if ANY room is available for [start, end]
        const checkAvailability = (start: number, end: number) => {
            for (let r = 0; r < TOTAL_ROOMS; r++) {
                // Get bookings for this room
                const bookingsInRoom = timelineBookings.filter(b => roomAllocations[b.id] === r);
                // Check if ANY blocking booking overlaps with the candidate slot
                const hasOverlap = bookingsInRoom.some(b => {
                    if (!isBlocking(b.status)) return false;
                    const bStart = timeToMinutes(b.time);
                    const bEnd = bStart + b.duration;
                    // Overlap check
                    return Math.max(start, bStart) < Math.min(end, bEnd);
                });
                if (!hasOverlap) return true; // Found at least one free room
            }
            return false; // All rooms busy
        };

        // Search forward for the next available slot
        for (let i = startIndex + 1; i < ALL_TIME_SLOTS.length; i++) {
            const slot = ALL_TIME_SLOTS[i];
            const sTime = timeToMinutes(slot.time);

            if (checkAvailability(sTime, sTime + duration)) {
                return slot.time;
            }
        }
        return null;
    }, [showAvailableOnly, filteredTimelineRooms.length, filterStartTime, filterEndTime, timelineBookings, roomAllocations]);


    // --- FORM HELPERS ---
    const generateCode = () => {
        const max = bookings.reduce((m, b) => {
            const codeVal = b.code ? b.code.replace('BK', '') : '0';
            const num = parseInt(codeVal) || 0;
            return Math.max(m, num);
        }, 0);
        return `BK${(max + 1).toString().padStart(3, '0')}`;
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const calculateEndTime = (startTime: string, durationMinutes: number) => {
        if (!startTime) return '';
        const [hours, minutes] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes + durationMinutes);
        return date.toTimeString().slice(0, 5);
    };

    const selectedService = services.find(s => s.id === formData.serviceId);
    const calculatedEndTime = selectedService ? calculateEndTime(formData.time, selectedService.duration) : '';
    const requiredStaffCount = selectedService?.staffCount || 1;

    // Calculate final amount
    const finalAmount = useMemo(() => {
        if (!selectedService) return 0;
        const discount = Number(formData.discount) || 0;
        return Math.max(0, selectedService.price - discount);
    }, [selectedService, formData.discount]);

    // Check Staff Availability (Used in Modal)
    const checkStaffAvailability = (staffId: string) => {
        if (!formData.time || !selectedService) return { isAvailable: true, message: '(Sẵn sàng)' };

        const newStart = timeToMinutes(formData.time);
        const newEnd = newStart + selectedService.duration;

        const relevantBookings = bookings.filter(b => b.date === formData.date);

        const conflict = relevantBookings.find(b => {
            if (isEditing && b.id === currentId) return false;

            // UPDATE: Sync with 'isBlocking' logic.
            // Pending, Completed, Cancelled will NOT block.
            if (!isBlocking(b.status)) return false;

            const isAssigned = (b.staffIds && b.staffIds.includes(staffId)) || b.staffId === staffId;
            if (!isAssigned) return false;

            const bStart = timeToMinutes(b.time);
            const bEnd = bStart + b.duration;

            return newStart < bEnd && newEnd > bStart;
        });

        if (conflict) {
            const conflictEnd = calculateEndTime(conflict.time, conflict.duration);
            return { isAvailable: false, message: `(Bận đến ${conflictEnd})` };
        }

        return { isAvailable: true, message: '(Sẵn sàng)' };
    };

    // --- ROOM AVAILABILITY CHECKER (Modal) ---
    const getRoomAvailability = (checkTime: string, duration: number) => {
        const checkStart = timeToMinutes(checkTime);
        const checkEnd = checkStart + duration;

        const relevantBookings = bookings.filter(b => b.date === formData.date);

        // Filter overlapping bookings
        const overlappingBookings = relevantBookings.filter(b => {
            // UPDATE: Sync with 'isBlocking' logic. 
            // Room is free if booking is Pending/Cancelled/Completed.
            if (isEditing && b.id === currentId) return false;
            if (!isBlocking(b.status)) return false;

            const bStart = timeToMinutes(b.time);
            const bEnd = bStart + b.duration;

            return Math.max(checkStart, bStart) < Math.min(checkEnd, bEnd);
        });

        return {
            isAvailable: overlappingBookings.length < TOTAL_ROOMS,
            occupiedCount: overlappingBookings.length
        };
    };

    // Logic to determine Next Available Slot
    const roomStatus = useMemo(() => {
        if (!selectedService || !formData.time) return { isFull: false, nextTime: null };

        const { isAvailable } = getRoomAvailability(formData.time, selectedService.duration);

        if (isAvailable) return { isFull: false, nextTime: null };

        let nextTime = null;
        const startIndex = ALL_TIME_SLOTS.findIndex(t => t.time === formData.time);

        if (startIndex !== -1) {
            for (let i = startIndex + 1; i < ALL_TIME_SLOTS.length; i++) {
                const slot = ALL_TIME_SLOTS[i];
                const check = getRoomAvailability(slot.time, selectedService.duration);
                if (check.isAvailable) {
                    nextTime = slot.time;
                    break;
                }
            }
        }

        return { isFull: true, nextTime };
    }, [formData.time, selectedService, bookings, formData.date, isEditing, currentId]);


    useEffect(() => {
        if (selectedService && formData.selectedStaffIds.length !== selectedService.staffCount) {
            const newArr = [...formData.selectedStaffIds];
            if (newArr.length < selectedService.staffCount) {
                while (newArr.length < selectedService.staffCount) newArr.push('');
            } else {
                newArr.splice(selectedService.staffCount);
            }
            if (JSON.stringify(newArr) !== JSON.stringify(formData.selectedStaffIds)) {
                setFormData(prev => ({ ...prev, selectedStaffIds: newArr }));
            }
        }
    }, [formData.serviceId, selectedService]);

    // --- HANDLERS ---
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const service = services.find(s => s.id === formData.serviceId);

        if (!service) return alert('Vui lòng chọn dịch vụ');

        // LOGIC FIX: Check if we are updating an existing booking at the exact same time/date/duration.
        // If so, we bypass the "Room Full" check to allow status updates or info corrections 
        // without triggering the overbooking warning (since the slot is already occupied by this booking).
        let shouldCheckRoom = true;
        if (isEditing && currentId) {
            const originalBooking = bookings.find(b => b.id === currentId);
            if (originalBooking &&
                originalBooking.date === formData.date &&
                originalBooking.time === formData.time &&
                originalBooking.duration === service.duration) {
                shouldCheckRoom = false;
            }
        }

        if (shouldCheckRoom && roomStatus.isFull) {
            const confirmOverbook = window.confirm(`Cảnh báo: Đã hết phòng vào lúc ${formData.time}. Bạn vẫn muốn tạo lịch?`);
            if (!confirmOverbook) return;
        }

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

        const discountAmount = Number(formData.discount) || 0;
        const finalTotalAmount = Math.max(0, service.price - discountAmount);

        const bookingData = {
            ...formData,
            serviceName: service.name,
            staffName: staffNameString,
            staffId: primaryStaffId,
            staffIds: validStaffIds,
            duration: service.duration,
            totalAmount: finalTotalAmount,
            discount: discountAmount,
        };

        const { selectedStaffIds, ...finalBookingData } = bookingData;

        if (isEditing && currentId) {
            onUpdateBooking({ ...finalBookingData, id: currentId } as Booking);
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

    const openAddModal = () => {
        setFormData({
            ...INITIAL_FORM_DATA,
            date: currentDate
        });
        setIsEditing(false);
        setCurrentId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (booking: Booking) => {
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
            notes: booking.notes || '',
            discount: booking.discount || 0
        });
        setCurrentId(booking.id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const updateStatus = (id: string, newStatus: BookingStatus) => {
        const booking = bookings.find(b => b.id === id);
        if (booking) {
            onUpdateBooking({ ...booking, status: newStatus });
        }
    };

    const resetFilters = () => {
        setShowAvailableOnly(false);
        setFilterStaffId('All');
        setFilterStartTime('10:00');
        setFilterEndTime('22:00');
    };

    // --- TIMELINE HELPER FUNCTIONS ---
    // Calculates real-time status for the Status Column

    // FIX: Ensure we always compare against TODAY's date string for real-time status check
    // regardless of which date is selected in the filter.
    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    const getStaffStatusDetails = (staffId: string) => {
        // 1. IN PROGRESS - Top Priority (Always show if active)
        const inProgress = bookings.find(b =>
            b.date === todayString && // Strict Today check
            ((b.staffIds && b.staffIds.includes(staffId)) || b.staffId === staffId) &&
            b.status === BookingStatus.IN_PROGRESS
        );

        if (inProgress) {
            const endTime = calculateEndTime(inProgress.time, inProgress.duration);
            return { isBusy: true, displayText: `Đang làm đến ${endTime}` };
        }

        // 2. CONFIRMED - In Time Slot
        const confirmed = bookings.find(b => {
            if (b.date !== todayString) return false; // Strict Today check

            const isAssigned = (b.staffIds && b.staffIds.includes(staffId)) || b.staffId === staffId;
            if (!isAssigned || b.status !== BookingStatus.CONFIRMED) return false;

            const start = timeToMinutes(b.time);
            const end = start + b.duration;
            return start <= currentMinutes && currentMinutes < end;
        });

        if (confirmed) {
            // Display exactly as requested: "Chờ khách (đến [Giờ bắt đầu])" 
            // Note: Using Start Time (b.time) as per instruction "đến [Giờ bắt đầu]"
            return { isBusy: true, displayText: `Chờ khách (đến ${confirmed.time})` };
        }

        // 3. FALLBACK: Check other blocking statuses in time slot (like PENDING)
        // This handles cases where user might have PENDING booking and expects 'Busy' status
        const otherBusy = bookings.find(b => {
            if (b.date !== todayString) return false; // Strict Today check

            const isAssigned = (b.staffIds && b.staffIds.includes(staffId)) || b.staffId === staffId;
            if (!isAssigned) return false;

            // Ignore Cancelled/Completed/Confirmed (already checked)/InProgress (already checked)
            if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.IN_PROGRESS) return false;

            const start = timeToMinutes(b.time);
            const end = start + b.duration;
            return start <= currentMinutes && currentMinutes < end;
        });

        if (otherBusy) {
            const endTime = calculateEndTime(otherBusy.time, otherBusy.duration);
            return { isBusy: true, displayText: `Bận đến ${endTime}` };
        }

        return { isBusy: false, displayText: 'Sẵn sàng' };
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* 1. Page Title Area */}
            <div className="relative py-6 flex-shrink-0 flex flex-col items-center justify-center text-center shadow-sm z-10 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop"
                        alt="Lotus Spa Background"
                        className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/50 to-white"></div>
                </div>

                <div className="relative z-10 max-w-2xl mx-auto bg-white/70 backdrop-blur-md px-10 py-5 rounded-3xl shadow-xl border border-white/50 transform hover:scale-[1.01] transition-transform duration-500">
                    <h2 className="text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-spa-800 via-spa-600 to-spa-800 font-spa italic mb-2 leading-tight drop-shadow-sm">
                        LOTUS SPA
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-spa-400 to-spa-600 mx-auto rounded-full mb-3 opacity-80"></div>
                    <p className="text-xl text-gray-700 font-spa italic tracking-wide font-medium">
                        Nâng niu cơ thể - vỗ về tâm hồn
                    </p>
                </div>
            </div>

            {/* 2. Central Control Bar */}
            <div className="bg-white border-b border-gray-200 py-3 px-4 flex flex-wrap items-center gap-3 md:gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] z-20 flex-shrink-0 justify-start">

                {/* 1. Tạo Lịch Mới */}
                <button
                    onClick={openAddModal}
                    className="group relative overflow-hidden bg-gradient-to-br from-spa-600 to-spa-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:shadow-spa-500/30 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
                >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Tạo Lịch Mới</span>
                </button>

                {/* 3. Lịch (Date Picker) */}
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5 shadow-sm h-10">
                    <button
                        onClick={() => {
                            const date = new Date(currentDate);
                            date.setDate(date.getDate() - 1);
                            setCurrentDate(date.toISOString().split('T')[0]);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors h-full flex items-center"
                    >
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2 px-2 border-x border-gray-100 h-full">
                        <Calendar size={16} className="text-spa-600" />
                        <input
                            type="date"
                            value={currentDate}
                            onChange={(e) => setCurrentDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-bold text-gray-800 w-32 text-center"
                        />
                    </div>
                    <button
                        onClick={() => {
                            const date = new Date(currentDate);
                            date.setDate(date.getDate() + 1);
                            setCurrentDate(date.toISOString().split('T')[0]);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors h-full flex items-center"
                    >
                        <ChevronRight size={18} className="text-gray-600" />
                    </button>
                </div>

                {/* 4. Search Filter */}
                <div className="relative group flex items-center h-10">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-spa-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm NV, khách, booking..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 h-full w-40 md:w-56 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-spa-500/50 focus:bg-white transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* 5. Employee Filter (NEW) */}
                <div className="hidden lg:flex items-center h-10 bg-gray-50 border border-gray-200 rounded-xl px-2 relative group-hover:border-spa-300 transition-colors">
                    <Users size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                    <select
                        value={filterStaffId}
                        onChange={(e) => setFilterStaffId(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer w-full md:w-auto min-w-[120px]"
                    >
                        <option value="All">Tất cả nhân viên</option>
                        {activeEmployees.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                    {filterStaffId !== 'All' && (
                        <button
                            onClick={() => setFilterStaffId('All')}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Timeline Filter */}
                <div className="hidden 2xl:flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl h-10">
                    <SlidersHorizontal size={14} className="text-gray-500" />
                    <select
                        value={filterStartTime}
                        onChange={e => {
                            const newStart = e.target.value;
                            setFilterStartTime(newStart);

                            // Auto-set End Time to +2 hours
                            const startMins = timeToMinutes(newStart);
                            const endMins = startMins + 120; // 2 hours window
                            const maxMins = timeToMinutes('22:00');

                            let newEnd = '22:00';
                            if (endMins < maxMins) {
                                const h = Math.floor(endMins / 60);
                                const m = endMins % 60;
                                newEnd = `${h}:${m.toString().padStart(2, '0')}`;
                            }
                            setFilterEndTime(newEnd);
                        }}
                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                    >
                        {ALL_TIME_SLOTS.map(t => (
                            <option key={t.time} value={t.time}>{t.time}</option>
                        ))}
                    </select>
                    <span className="text-gray-400">-</span>
                    <select
                        value={filterEndTime}
                        onChange={e => {
                            if (timeToMinutes(e.target.value) > timeToMinutes(filterStartTime)) {
                                setFilterEndTime(e.target.value);
                            }
                        }}
                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                    >
                        {ALL_TIME_SLOTS.map(t => (
                            <option key={t.time} value={t.time}>{t.time}</option>
                        ))}
                    </select>

                    {/* Available Only Toggle */}
                    <div className="h-4 w-px bg-gray-300 mx-2"></div>
                    <button
                        onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                        title="Chỉ hiện nhân viên và phòng rảnh trong khung giờ này"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${showAvailableOnly
                            ? 'bg-spa-600 text-white shadow-md ring-2 ring-spa-200'
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        <UserCheck size={14} />
                        {showAvailableOnly ? 'Đang lọc trống' : 'Lọc trống'}
                    </button>

                    {/* Clear Filter Button */}
                    <button
                        onClick={resetFilters}
                        disabled={!showAvailableOnly && filterStartTime === '10:00' && filterEndTime === '22:00' && filterStaffId === 'All'}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ml-1 ${(!showAvailableOnly && filterStartTime === '10:00' && filterEndTime === '22:00' && filterStaffId === 'All')
                            ? 'opacity-50 cursor-not-allowed text-gray-400'
                            : 'text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent'
                            }`}
                        title="Hiển thị toàn bộ"
                    >
                        <FilterX size={14} />
                        <span className="hidden xl:inline">Tắt lọc</span>
                    </button>

                    {showAvailableOnly && (
                        <>
                            {filteredTimelineRooms.length === 0 ? (
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg border border-red-200 text-xs animate-pulse shadow-sm">
                                    <AlertTriangle size={14} className="flex-shrink-0" />
                                    <div className="flex flex-col leading-none">
                                        <span className="font-bold">Hết phòng ({filterStartTime}-{filterEndTime})</span>
                                        {nextAvailableSuggestion && (
                                            <span className="font-normal mt-0.5">Gợi ý: Trống lúc <b>{nextAvailableSuggestion}</b></span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs font-medium text-spa-600 animate-fade-in bg-spa-50 px-2 py-1 rounded-lg border border-spa-100">
                                    Rảnh: {filteredTimelineEmployees.length} NV, {filteredTimelineRooms.length} Phòng
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 3. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">

                {/* TOP: TIMELINE */}
                <div className="shrink-0 max-h-[60%] min-h-[200px] border-b-4 border-gray-100 overflow-auto relative custom-scrollbar bg-white transition-all duration-300">
                    <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 12px;
                    width: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 6px;
                    border: 3px solid #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
             `}</style>
                    <table className="border-collapse w-max min-w-full relative">
                        {/* TABLE HEAD */}
                        <thead className="sticky top-0 z-40 shadow-sm">
                            <tr>
                                {/* Fixed Columns Header */}
                                <th className="sticky left-0 z-50 bg-yellow-400 text-black border border-gray-300 w-12 min-w-[3rem] px-2 py-3 text-center text-sm font-bold">Stt</th>

                                <th className="sticky left-12 z-50 bg-yellow-400 text-black border border-gray-300 w-32 min-w-[8rem] px-2 py-3 text-center text-sm font-bold">
                                    Nhân viên
                                </th>

                                {/* Status column only for Staff View */}
                                <th className="sticky left-44 z-50 bg-yellow-400 text-black border border-gray-300 w-28 min-w-[7rem] px-2 py-3 text-center text-sm font-bold border-r-2 border-r-gray-400">Trạng thái</th>

                                {/* Time Slots Header */}
                                {visibleTimeSlots.map((slot, index) => {
                                    return (
                                        <th
                                            key={index}
                                            id={`time-col-${slot.time}`}
                                            className="w-10 min-w-[2.5rem] p-1 text-center text-[10px] font-medium leading-tight border transition-all duration-300 relative bg-blue-950 text-yellow-400 border-gray-600"
                                        >
                                            <div className="flex flex-col">
                                                <span>{slot.hour}</span>
                                                <span>{slot.minute}</span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* TABLE BODY */}
                        <tbody>
                            {filteredTimelineEmployees.map((staff, rowIndex) => {
                                const { isBusy, displayText } = getStaffStatusDetails(staff.id);

                                // NEW: Calculate completed count for this staff member today
                                const completedCountForStaff = bookingsForCurrentDate.filter(b =>
                                    b.status === BookingStatus.COMPLETED &&
                                    ((b.staffIds && b.staffIds.includes(staff.id)) || b.staffId === staff.id)
                                ).length;

                                return (
                                    <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Fixed Columns Body - Sticky Left */}
                                        <td className="sticky left-0 z-30 bg-white border border-gray-300 px-2 py-3 text-center text-sm text-gray-900 font-medium">
                                            {rowIndex + 1}
                                        </td>
                                        <td className="sticky left-12 z-30 bg-white border border-gray-300 px-2 py-3 text-left text-sm text-gray-900 font-medium">
                                            {staff.name} <span className="text-xs text-gray-500 font-normal">({completedCountForStaff})</span>
                                        </td>

                                        <td className="sticky left-44 z-30 bg-white border border-gray-300 px-2 py-3 text-center border-r-2 border-r-gray-400">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${isBusy ? 'bg-red-100 text-red-600 ring-1 ring-red-500/20' : 'bg-green-100 text-green-600 ring-1 ring-green-500/20'}`}>
                                                {displayText}
                                            </span>
                                        </td>

                                        {/* Time Cells */}
                                        {visibleTimeSlots.map((slot, index) => {
                                            const slotTimeVal = timeToMinutes(slot.time);

                                            // Find booking covering this slot
                                            const booking = timelineBookings.find(b => {
                                                const start = timeToMinutes(b.time);
                                                const end = start + b.duration;
                                                // Is this staff assigned?
                                                const hasStaff = (b.staffIds && b.staffIds.includes(staff.id)) || b.staffId === staff.id;
                                                return hasStaff && start <= slotTimeVal && slotTimeVal < end;
                                            });

                                            if (!booking) {
                                                return (
                                                    <td
                                                        key={`${staff.id}-${index}`}
                                                        className="border border-gray-300 h-10 min-h-[40px] hover:bg-gray-50 cursor-crosshair transition-colors"
                                                    >
                                                    </td>
                                                );
                                            }

                                            // Render Booking
                                            const bookingStartVal = timeToMinutes(booking.time);
                                            const isStartOfBooking = bookingStartVal === slotTimeVal;
                                            const isFirstVisibleSlot = index === 0;

                                            if (isStartOfBooking || isFirstVisibleSlot) {
                                                const endVal = bookingStartVal + booking.duration;
                                                const remainingMins = endVal - slotTimeVal;
                                                const slotsNeeded = Math.ceil(remainingMins / 10);
                                                const maxSlots = visibleTimeSlots.length - index;
                                                const actualSpan = Math.min(slotsNeeded, maxSlots);

                                                const colorClass = getStatusColor(booking.status);

                                                // Calculate exact end time for tooltip
                                                const calculatedEnd = calculateEndTime(booking.time, booking.duration);

                                                return (
                                                    <td
                                                        key={`${staff.id}-${index}`}
                                                        colSpan={actualSpan}
                                                        onClick={() => openEditModal(booking)}
                                                        className="border border-gray-300 p-0 h-10 min-h-[40px] relative group cursor-pointer transition-all opacity-80 hover:opacity-100"
                                                    >
                                                        <div className={`w-full h-full flex items-center justify-center text-xs font-medium truncate px-1 shadow-sm ${colorClass}`}>
                                                            {booking.serviceName}
                                                            {!isStartOfBooking && <span className="text-[9px] opacity-70 ml-1">(tiếp)</span>}
                                                        </div>
                                                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[60] shadow-xl backdrop-blur-sm pointer-events-none">
                                                            <div className="font-bold text-sm mb-1">{booking.customerName}</div>
                                                            <div className="text-gray-300 mb-1">{booking.serviceName}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-white/20 px-1.5 rounded text-yellow-300 font-bold">
                                                                    {booking.time} - {calculatedEnd}
                                                                </span>
                                                                <span>{booking.duration}p</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return null;
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* MIDDLE: LEGEND & TITLE */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 flex-shrink-0 overflow-x-auto">
                    {/* Title */}
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 whitespace-nowrap">
                        <List size={18} />
                        <h3>Chi tiết lịch hẹn {searchTerm ? '(Tìm kiếm)' : ''}</h3>
                    </div>

                    {/* Stats & Legends Wrapper */}
                    <div className="flex items-center gap-4 flex-1">
                        {/* Stats */}
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 text-xs shadow-sm">
                                <CheckCircle size={14} />
                                <span>Hoàn thành:</span>
                                <span className="font-bold text-sm">{completedCount}</span>
                            </div>
                            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg border border-red-100 text-xs shadow-sm">
                                <XCircle size={14} />
                                <span>Đã hủy:</span>
                                <span className="font-bold text-sm">{cancelledCount}</span>
                            </div>

                            {/* REVENUE DASHBOARD */}
                            <div className="flex items-center gap-2 px-1.5 py-1 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white text-blue-700 rounded-md shadow-sm text-xs border border-blue-100" title="Doanh thu ngày hiện tại">
                                    <DollarSign size={12} className="text-blue-500" />
                                    <span>Ngày:</span>
                                    <span className="font-bold">{formatCurrency(revenueStats.day)}</span>
                                </div>
                                <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-white text-purple-700 rounded-md shadow-sm text-xs border border-purple-100" title="Doanh thu tuần này (T2-CN)">
                                    <CalendarRange size={12} className="text-purple-500" />
                                    <span>Tuần:</span>
                                    <span className="font-bold">{formatCurrency(revenueStats.week)}</span>
                                </div>
                                <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 bg-white text-indigo-700 rounded-md shadow-sm text-xs border border-indigo-100" title="Doanh thu tháng này">
                                    <CalendarDays size={12} className="text-indigo-500" />
                                    <span>Tháng:</span>
                                    <span className="font-bold">{formatCurrency(revenueStats.month)}</span>
                                </div>
                                <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 bg-white text-orange-700 rounded-md shadow-sm text-xs border border-orange-100" title="Doanh thu năm nay">
                                    <TrendingUp size={12} className="text-orange-500" />
                                    <span>Năm:</span>
                                    <span className="font-bold">{formatCurrency(revenueStats.year)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vertical Divider */}
                        <div className="hidden md:block h-4 w-px bg-gray-300"></div>

                        {/* Legends (Moved here) */}
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <div className="w-3 h-3 bg-yellow-300 border border-yellow-500 rounded-sm"></div><span>Canceled</span>
                            </div>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <div className="w-3 h-3 bg-blue-500 border border-blue-700 rounded-sm"></div><span>Đã xác nhận</span>
                            </div>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <div className="w-3 h-3 bg-purple-500 border border-purple-700 rounded-sm"></div><span>Đang thực hiện</span>
                            </div>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <div className="w-3 h-3 bg-green-500 border border-green-700 rounded-sm"></div><span>Hoàn thành</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM: LIST - Responsive View */}
                <div className="flex-1 overflow-auto bg-white">

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden p-4 space-y-4">
                        {filteredBookings.sort((a, b) => {
                            // Sort by Date then Time if searching globally
                            if (searchTerm) {
                                return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
                            }
                            return a.time.localeCompare(b.time);
                        }).map((booking) => (
                            <div key={booking.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 relative overflow-hidden">
                                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold text-white ${booking.status === BookingStatus.CONFIRMED ? 'bg-blue-500' :
                                    booking.status === BookingStatus.IN_PROGRESS ? 'bg-purple-500' :
                                        booking.status === BookingStatus.COMPLETED ? 'bg-green-500' :
                                            booking.status === BookingStatus.CANCELLED ? 'bg-gray-400' : 'bg-yellow-400'
                                    }`}>
                                    {booking.status}
                                </div>

                                <div className="flex items-start gap-3 mb-3">
                                    <div className="bg-gray-100 rounded-lg p-2 text-center min-w-[3.5rem]">
                                        <span className="block text-lg font-bold text-gray-800">{booking.time}</span>
                                        <span className="block text-[10px] text-gray-500 uppercase font-bold">{booking.code}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 line-clamp-1">{booking.customerName}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Phone size={12} /> {booking.customerPhone}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 mb-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs">Dịch vụ:</span>
                                        <span className="font-medium text-right line-clamp-1">{booking.serviceName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs">Nhân viên:</span>
                                        <span className="font-medium text-right text-spa-600">{booking.staffName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs">Thành tiền:</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</span>
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                                    {booking.status === BookingStatus.PENDING && (
                                        <button onClick={() => updateStatus(booking.id, BookingStatus.CONFIRMED)} className="col-span-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={14} /> Xác nhận</button>
                                    )}
                                    {booking.status === BookingStatus.CONFIRMED && (
                                        <button onClick={() => updateStatus(booking.id, BookingStatus.IN_PROGRESS)} className="col-span-3 py-2 bg-purple-50 text-purple-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><PlayCircle size={14} /> Bắt đầu</button>
                                    )}
                                    {booking.status === BookingStatus.IN_PROGRESS && (
                                        <button onClick={() => updateStatus(booking.id, BookingStatus.COMPLETED)} className="col-span-3 py-2 bg-green-50 text-green-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={14} /> Hoàn thành</button>
                                    )}
                                    {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                                        <button onClick={() => updateStatus(booking.id, BookingStatus.CANCELLED)} className="col-span-3 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><XCircle size={14} /> Hủy</button>
                                    )}
                                    {/* If status is Completed/Cancelled, Edit takes full width, otherwise takes remaining slot */}
                                    <button
                                        onClick={() => openEditModal(booking)}
                                        className={`py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs flex items-center justify-center ${(booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) ? 'col-span-4' : 'col-span-1'
                                            }`}
                                    >
                                        <FileText size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredBookings.length === 0 && (
                            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                Không tìm thấy lịch hẹn.
                            </div>
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <table className="hidden md:table w-full text-left text-sm 2xl:text-base text-gray-500">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-xs sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-2 py-3 whitespace-nowrap pl-4">Thời gian</th>
                                <th className="px-2 py-3 text-center whitespace-nowrap">Thao tác</th>
                                <th className="px-2 py-3">Khách hàng</th>
                                <th className="px-2 py-3">Dịch vụ</th>
                                <th className="px-2 py-3">Nhân viên</th>
                                <th className="px-2 py-3 whitespace-nowrap">Trạng thái</th>
                                <th className="px-2 py-3 whitespace-nowrap">Tổng tiền</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredBookings.sort((a, b) => {
                                // Sort by Date then Time if searching globally
                                if (searchTerm) {
                                    return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
                                }
                                return a.time.localeCompare(b.time);
                            }).map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-2 py-2.5 whitespace-nowrap pl-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 text-sm 2xl:text-base">{booking.time}</span>
                                            <span className="text-[11px] 2xl:text-xs text-gray-400">
                                                {searchTerm && booking.date !== currentDate ? `${booking.date} ` : ''}
                                                {booking.code}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {/* Quick Actions based on Status */}
                                            {booking.status === BookingStatus.PENDING && (
                                                <button title="Xác nhận" onClick={() => updateStatus(booking.id, BookingStatus.CONFIRMED)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><CheckCircle size={16} /></button>
                                            )}
                                            {booking.status === BookingStatus.CONFIRMED && (
                                                <button title="Bắt đầu" onClick={() => updateStatus(booking.id, BookingStatus.IN_PROGRESS)} className="p-1 text-purple-600 hover:bg-purple-50 rounded"><PlayCircle size={16} /></button>
                                            )}
                                            {booking.status === BookingStatus.IN_PROGRESS && (
                                                <button title="Hoàn thành" onClick={() => updateStatus(booking.id, BookingStatus.COMPLETED)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle size={16} /></button>
                                            )}
                                            {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                                                <button title="Hủy" onClick={() => updateStatus(booking.id, BookingStatus.CANCELLED)} className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle size={16} /></button>
                                            )}

                                            <div className="h-4 w-px bg-gray-200 mx-1"></div>

                                            <button onClick={() => openEditModal(booking)} className="text-gray-400 hover:text-gray-600 p-1"><FileText size={16} /></button>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5">
                                        <div className="font-medium text-gray-900 text-sm 2xl:text-base">{booking.customerName}</div>
                                        <div className="text-[11px] 2xl:text-xs text-gray-500">{booking.customerPhone}</div>
                                    </td>
                                    <td className="px-2 py-2.5">
                                        <div className="text-gray-900 text-sm 2xl:text-base">{booking.serviceName}</div>
                                        <div className="text-[11px] 2xl:text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={11} /> {booking.duration} phút
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5">
                                        <span className={`px-2 py-0.5 rounded text-[11px] 2xl:text-xs ${(!booking.staffIds || booking.staffIds.length === 0) ? 'bg-gray-100 text-gray-500 italic' : 'bg-green-50 text-green-700 font-medium'}`}>
                                            {booking.staffName}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2.5 whitespace-nowrap">
                                        <div className={`inline-flex flex-col items-start justify-center rounded-md px-2 py-1 text-[11px] 2xl:text-xs font-medium ring-1 ring-inset ${getStatusColorBadge(booking.status)}`}>
                                            <span>{booking.status}</span>
                                            {booking.status !== BookingStatus.CANCELLED && (
                                                <span className="text-[9px] opacity-80 whitespace-nowrap">
                                                    (đến {calculateEndTime(booking.time, booking.duration)})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 font-medium text-spa-700 whitespace-nowrap text-sm 2xl:text-base">
                                        <div className="flex flex-col">
                                            <span>{formatCurrency(booking.totalAmount)}</span>
                                            {booking.discount ? (
                                                <span className="text-[10px] text-red-500 line-through">
                                                    {formatCurrency(booking.totalAmount + booking.discount)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredBookings.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                                        Không tìm thấy lịch hẹn nào phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 5. ADD/EDIT BOOKING MODAL */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg transform transition-all">
                            <form onSubmit={handleSubmit}>
                                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {isEditing ? 'Cập nhật lịch hẹn' : 'Tạo lịch mới'}
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

                                    {/* Date & Time & Status */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                    {ALL_TIME_SLOTS.map(t => (
                                                        <option key={t.time} value={t.time}>{t.time}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {roomStatus.isFull && (
                                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-white rounded-full text-red-500 shadow-sm">
                                                            <AlertTriangle size={18} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-bold text-red-800">Hết phòng vào giờ này!</h4>
                                                            <p className="text-xs text-red-600 mt-1">
                                                                Đã có {TOTAL_ROOMS} khách đặt.
                                                                {roomStatus.nextTime ? (
                                                                    <span> Giờ trống gần nhất: <span className="font-bold text-red-800 bg-red-100 px-1 rounded">{roomStatus.nextTime}</span></span>
                                                                ) : (
                                                                    " Không còn giờ trống trong ngày."
                                                                )}
                                                            </p>

                                                            {roomStatus.nextTime && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData(prev => ({ ...prev, time: roomStatus.nextTime! }))}
                                                                    className="mt-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                                                                >
                                                                    Đổi sang {roomStatus.nextTime} <ArrowRight size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {!roomStatus.isFull && calculatedEndTime && (
                                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-2 rounded-lg">
                                                    <ArrowRight size={12} />
                                                    Kết thúc: <span className="font-bold text-gray-700">{calculatedEndTime}</span>
                                                </div>
                                            )}
                                        </div>
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

                                    {/* Discount Dropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            <Tag size={16} />
                                            Mã giảm giá / Voucher
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 outline-none text-spa-700 font-medium"
                                            value={formData.discount}
                                            onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                                        >
                                            <option value={0}>Không áp dụng giảm giá</option>
                                            <option value={100000}>Giảm 100.000đ (Voucher Silver)</option>
                                            <option value={200000}>Giảm 200.000đ (Voucher Gold)</option>
                                        </select>
                                    </div>

                                    {/* Staff Selection */}
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
                                                    {availableStaffForDropdown.map(e => {
                                                        const { isAvailable, message } = checkStaffAvailability(e.id);
                                                        // Check if already selected in another slot (for multi-staff services)
                                                        const isSelectedHere = formData.selectedStaffIds[index] === e.id;
                                                        const isSelectedElsewhere = formData.selectedStaffIds.includes(e.id) && !isSelectedHere;

                                                        // Disable if busy or selected elsewhere
                                                        const isDisabled = !isAvailable || isSelectedElsewhere;

                                                        return (
                                                            <option
                                                                key={e.id}
                                                                value={e.id}
                                                                disabled={isDisabled}
                                                                className={!isAvailable ? 'text-red-400 bg-gray-50' : 'text-gray-900'}
                                                            >
                                                                {e.name} {message}
                                                            </option>
                                                        );
                                                    })}
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
                                </div>

                                {/* Footer with Total Amount Preview */}
                                <div className="px-5 pb-5 pt-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                                    {selectedService && (
                                        <div className="flex justify-between items-center mb-4 text-sm">
                                            <span className="text-gray-600">Thành tiền:</span>
                                            <div className="text-right">
                                                {formData.discount > 0 && (
                                                    <div className="text-gray-400 text-xs line-through">{formatCurrency(selectedService.price)}</div>
                                                )}
                                                <div className="text-lg font-bold text-spa-700">{formatCurrency(finalAmount)}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-3">
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
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}