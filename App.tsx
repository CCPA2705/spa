import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmployeePage } from './pages/EmployeePage';
import { ServicePage } from './pages/ServicePage';
import { OperationsPage } from './pages/OperationsPage';
import { Booking, Employee, BookingStatus, Position, EmployeeStatus, ServiceCategory, ServiceStatus, Service } from './types';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Loader2 } from 'lucide-react';

// --- SHARED MOCK DATA (SYNCED WITH PAGES) ---
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: '1', code: 'NV001', name: 'Nguyễn Thị Lan', avatar: 'https://picsum.photos/200/200?random=1',
    position: Position.MANAGER, status: EmployeeStatus.ACTIVE, phone: '0901234567', email: 'lan.nt@lotusspa.com',
  },
  {
    id: '2', code: 'NV002', name: 'Trần Văn Minh', avatar: 'https://picsum.photos/200/200?random=2',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0909876543', email: 'minh.tv@lotusspa.com'
  },
  {
    id: '3', code: 'NV003', name: 'Lê Thu Hà', avatar: '',
    position: Position.RECEPTIONIST, status: EmployeeStatus.ON_LEAVE, phone: '0912345678', email: 'ha.lt@lotusspa.com'
  },
  {
    id: '4', code: 'NV004', name: 'Phạm Thanh Hương', avatar: 'https://picsum.photos/200/200?random=4',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0987654321', email: 'huong.pt@lotusspa.com'
  },
  {
    id: '5', code: 'NV005', name: 'Ngô Thị Bích', avatar: 'https://picsum.photos/200/200?random=5',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0933111222', email: 'bich.nt@lotusspa.com'
  },
  {
    id: '6', code: 'NV006', name: 'Đỗ Văn Hùng', avatar: 'https://picsum.photos/200/200?random=6',
    position: Position.SECURITY, status: EmployeeStatus.ACTIVE, phone: '0944555666', email: 'hung.dv@lotusspa.com'
  },
  {
    id: '7', code: 'NV007', name: 'Hoàng Mai Anh', avatar: 'https://picsum.photos/200/200?random=7',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0977888999', email: 'anh.hm@lotusspa.com'
  },
  {
    id: '8', code: 'NV008', name: 'Vũ Thu Trang', avatar: 'https://picsum.photos/200/200?random=8',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0911223344', email: 'trang.vt@lotusspa.com'
  },
  {
    id: '9', code: 'NV009', name: 'Nguyễn Văn Nam', avatar: 'https://picsum.photos/200/200?random=9',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0955667788', email: 'nam.nv@lotusspa.com'
  },
  {
    id: '10', code: 'NV010', name: 'Phạm Thị Dung', avatar: 'https://picsum.photos/200/200?random=10',
    position: Position.RECEPTIONIST, status: EmployeeStatus.ACTIVE, phone: '0999000111', email: 'dung.pt@lotusspa.com'
  },
  {
    id: '11', code: 'NV011', name: 'Trần Quốc Bảo', avatar: 'https://picsum.photos/200/200?random=11',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0922333444', email: 'bao.tq@lotusspa.com'
  },
  {
    id: '12', code: 'NV012', name: 'Lê Thị Hồng', avatar: 'https://picsum.photos/200/200?random=12',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0966777888', email: 'hong.lt@lotusspa.com'
  },
  {
    id: '13', code: 'NV013', name: 'Đặng Minh Tâm', avatar: 'https://picsum.photos/200/200?random=13',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0988111222', email: 'tam.dm@lotusspa.com'
  },
  {
    id: '14', code: 'NV014', name: 'Bùi Thị Yến', avatar: 'https://picsum.photos/200/200?random=14',
    position: Position.THERAPIST, status: EmployeeStatus.ACTIVE, phone: '0900555999', email: 'yen.bt@lotusspa.com'
  }
];

const INITIAL_SERVICES: Service[] = [
  {
    id: '1', code: 'DV001', name: 'Massage Body Đá Nóng', image: 'https://picsum.photos/200/200?random=10',
    category: ServiceCategory.MASSAGE, duration: 90, price: 500000, staffCount: 1, status: ServiceStatus.ACTIVE,
    description: 'Liệu trình massage thư giãn toàn thân kết hợp đá nóng bazan giúp lưu thông khí huyết.'
  },
  {
    id: '2', code: 'DV002', name: 'Gội Đầu Dưỡng Sinh', image: 'https://picsum.photos/200/200?random=11',
    category: ServiceCategory.SKIN_CARE, duration: 60, price: 250000, staffCount: 1, status: ServiceStatus.ACTIVE,
    description: 'Làm sạch da đầu, massage cổ vai gáy với thảo dược thiên nhiên.'
  },
  {
    id: '3', code: 'DV003', name: 'Combo Thư Giãn Sâu', image: '',
    category: ServiceCategory.COMBO, duration: 120, price: 850000, staffCount: 2, status: ServiceStatus.ACTIVE,
    description: 'Kết hợp massage body và chăm sóc da mặt cơ bản.'
  },
  {
    id: '4', code: 'DV004', name: 'Massage Aroma 60', image: '', category: ServiceCategory.MASSAGE, duration: 60, price: 400000, staffCount: 1, status: ServiceStatus.ACTIVE, description: ''
  },
  {
    id: '5', code: 'DV005', name: 'Massage Aroma 90', image: '', category: ServiceCategory.MASSAGE, duration: 90, price: 600000, staffCount: 1, status: ServiceStatus.ACTIVE, description: ''
  },
  {
    id: '6', code: 'DV006', name: 'Massage Aroma 120', image: '', category: ServiceCategory.MASSAGE, duration: 120, price: 800000, staffCount: 1, status: ServiceStatus.ACTIVE, description: ''
  },
  {
    id: '7', code: 'DV007', name: 'Massage Cổ Vai Gáy Chuyên Sâu', image: '',
    category: ServiceCategory.MASSAGE, duration: 30, price: 200000, staffCount: 1, status: ServiceStatus.ACTIVE,
    description: 'Tập trung trị liệu vùng cổ vai gáy giúp giảm đau mỏi nhanh chóng.'
  },
  {
    id: '8', code: 'DV008', name: 'Tắm Trắng Thảo Dược', image: '',
    category: ServiceCategory.BODY_CARE, duration: 60, price: 600000, staffCount: 1, status: ServiceStatus.ACTIVE,
    description: 'Sử dụng các loại thảo mộc tự nhiên giúp da trắng sáng, mịn màng.'
  },
  {
    id: '9', code: 'DV009', name: 'Massage Chân Bấm Huyệt', image: '',
    category: ServiceCategory.MASSAGE, duration: 45, price: 300000, staffCount: 1, status: ServiceStatus.ACTIVE,
    description: 'Kích thích các huyệt đạo ở lòng bàn chân giúp thư giãn và cải thiện sức khỏe.'
  },
  {
    id: '10', code: 'DV010', name: 'Xông Hơi Đá Muối Himalaya', image: '',
    category: ServiceCategory.OTHER, duration: 30, price: 150000, staffCount: 0, status: ServiceStatus.ACTIVE,
    description: 'Phòng xông hơi đá muối giúp thải độc và thư giãn cơ bắp.'
  },
  {
    id: '11', code: 'DV011', name: 'Combo Da Sáng Dáng Xinh', image: '',
    category: ServiceCategory.COMBO, duration: 150, price: 1200000, staffCount: 2, status: ServiceStatus.ACTIVE,
    description: 'Gói chăm sóc toàn diện bao gồm tắm trắng, massage body và chăm sóc da mặt cao cấp.'
  }
];

const INITIAL_BOOKINGS: Booking[] = [];

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('operations');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      setDataLoading(true);

      // 1. Employees
      let { data: empData, error: empError } = await supabase.from('employees').select('*');
      if (empError) throw empError;

      // Seed Employees if empty
      if (!empData || empData.length === 0) {
        const { error: seedError } = await supabase.from('employees').insert(INITIAL_EMPLOYEES.map(e => ({
          code: e.code, name: e.name, position: e.position, status: e.status,
          phone: e.phone, email: e.email, avatar: e.avatar
        })));
        if (seedError) throw seedError;
        // Fetch again
        const res = await supabase.from('employees').select('*');
        empData = res.data;
      }
      if (empData) setEmployees(empData as unknown as Employee[]);

      // 2. Services
      let { data: svcData, error: svcError } = await supabase.from('services').select('*');
      if (svcError) throw svcError;

      // Seed Services if empty
      if (!svcData || svcData.length === 0) {
        const { error: seedError } = await supabase.from('services').insert(INITIAL_SERVICES.map(s => ({
          code: s.code, name: s.name, category: s.category, duration: s.duration,
          price: s.price, staff_count: s.staffCount, status: s.status,
          description: s.description, image: s.image
        })));
        if (seedError) throw seedError;
        // Fetch again
        const res = await supabase.from('services').select('*');
        svcData = res.data;
      }
      // Map DB snake_case to CamelCase
      if (svcData) {
        setServices(svcData.map((s: any) => ({
          ...s,
          staffCount: s.staff_count
        })));
      }

      // 3. Bookings
      const { data: bookData, error: bookError } = await supabase.from('bookings').select('*');
      if (bookError) throw bookError;
      if (bookData) {
        setBookings(bookData.map((b: any) => ({
          id: b.id,
          code: b.code,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
          serviceId: b.service_id,
          serviceName: '', // Will fill below
          staffId: b.staff_id,
          staffIds: b.staff_ids || [],
          staffName: '', // Will fill below
          date: b.date,
          time: b.time, // HH:MM
          duration: b.duration,
          status: b.status,
          notes: b.notes,
          totalAmount: b.total_amount,
          discount: b.discount
        })));
      }

    } catch (err: any) {
      console.error("Error fetching data:", err.message);
      // Fallback for demo if DB fail? No, show error.
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Enhance Bookings with Name Lookups (Denormalization on frontend for display)
  const enrichedBookings = bookings.map(b => {
    const service = services.find(s => s.id === b.serviceId);
    const staffNames = (b.staffIds || []).map(sid => employees.find(e => e.id === sid)?.name).filter(Boolean).join(', ');
    return {
      ...b,
      serviceName: service?.name || b.serviceName || 'Unknown Service',
      staffName: staffNames || 'Unassigned'
    };
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleFullScreen = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleFullScreen);
    return () => window.removeEventListener('keydown', handleFullScreen);
  }, []);

  // --- HANDLERS (SUPABASE) ---
  const handleAddEmployee = async (newEmp: Employee) => {
    const { data, error } = await supabase.from('employees').insert({
      code: newEmp.code, name: newEmp.name, position: newEmp.position,
      status: newEmp.status, phone: newEmp.phone, email: newEmp.email, avatar: newEmp.avatar
    }).select().single();

    if (!error && data) {
      setEmployees(prev => [data as unknown as Employee, ...prev]);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    const { error } = await supabase.from('employees').update({
      code: updatedEmp.code, name: updatedEmp.name, position: updatedEmp.position,
      status: updatedEmp.status, phone: updatedEmp.phone, email: updatedEmp.email, avatar: updatedEmp.avatar
    }).eq('id', updatedEmp.id);

    if (!error) {
      setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) {
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleAddService = async (newService: Service) => {
    const { data, error } = await supabase.from('services').insert({
      code: newService.code, name: newService.name, category: newService.category,
      duration: newService.duration, price: newService.price, staff_count: newService.staffCount,
      status: newService.status, description: newService.description, image: newService.image
    }).select().single();

    if (!error && data) {
      const mapped = { ...data, staffCount: data.staff_count };
      setServices(prev => [mapped as unknown as Service, ...prev]);
    }
  };

  const handleUpdateService = async (updatedService: Service) => {
    const { error } = await supabase.from('services').update({
      code: updatedService.code, name: updatedService.name, category: updatedService.category,
      duration: updatedService.duration, price: updatedService.price, staff_count: updatedService.staffCount,
      status: updatedService.status, description: updatedService.description, image: updatedService.image
    }).eq('id', updatedService.id);

    if (!error) {
      setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
    }
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) {
      setServices(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddBooking = async (newBooking: Booking) => {
    // Generate ID on client or let DB do it. Let DB do it. 
    // But Booking interface needs ID. We usually submit without ID.
    // Assuming newBooking comes with temp ID or we ignore it.
    const payload = {
      code: newBooking.code,
      customer_name: newBooking.customerName,
      customer_phone: newBooking.customerPhone,
      service_id: newBooking.serviceId,
      staff_ids: newBooking.staffIds,
      date: newBooking.date,
      time: newBooking.time,
      duration: newBooking.duration,
      status: newBooking.status,
      total_amount: newBooking.totalAmount,
      notes: newBooking.notes,
      discount: newBooking.discount
    };

    const { data, error } = await supabase.from('bookings').insert(payload).select().single();

    if (error) {
      console.error("Error creating booking", error);
      alert("Lỗi tạo lịch hẹn: " + error.message);
      return;
    }

    if (data) {
      const mapped: Booking = {
        id: data.id,
        code: data.code,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        serviceId: data.service_id,
        serviceName: '',
        staffId: null,
        staffIds: data.staff_ids,
        staffName: '',
        date: data.date,
        time: data.time,
        duration: data.duration,
        status: data.status,
        notes: data.notes,
        totalAmount: data.total_amount,
        discount: data.discount
      };
      setBookings(prev => [...prev, mapped]);
    }
  };

  const handleUpdateBooking = async (updatedBooking: Booking) => {
    const payload = {
      // code: updatedBooking.code, // usually unchangeable
      customer_name: updatedBooking.customerName,
      customer_phone: updatedBooking.customerPhone,
      service_id: updatedBooking.serviceId,
      staff_ids: updatedBooking.staffIds,
      date: updatedBooking.date,
      time: updatedBooking.time,
      duration: updatedBooking.duration,
      status: updatedBooking.status,
      total_amount: updatedBooking.totalAmount,
      notes: updatedBooking.notes,
      discount: updatedBooking.discount
    };

    const { error } = await supabase.from('bookings').update(payload).eq('id', updatedBooking.id);

    if (error) {
      alert("Lỗi cập nhật: " + error.message);
      return;
    }
    setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'employees':
        return (
          <EmployeePage
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        );
      case 'services':
        return (
          <ServicePage
            services={services}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
          />
        );
      case 'operations':
        return (
          <OperationsPage
            bookings={enrichedBookings}
            employees={employees}
            services={services}
            onAddBooking={handleAddBooking}
            onUpdateBooking={handleUpdateBooking}
          />
        );
      case 'dashboard':
        return (
          <div className="flex items-center justify-center h-full text-gray-400 flex-col">
            <h2 className="text-2xl font-bold mb-2">Trang Tổng Quan</h2>
            <p>Đang được xây dựng...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full text-gray-400 flex-col">
            <h2 className="text-2xl font-bold mb-2">Cài Đặt Hệ Thống</h2>
            <p>Đang được xây dựng...</p>
          </div>
        );
      default:
        return (
          <OperationsPage
            bookings={enrichedBookings}
            employees={employees}
            services={services}
            onAddBooking={handleAddBooking}
            onUpdateBooking={handleUpdateBooking}
          />
        );
    }
  };

  if (authLoading || (user && dataLoading && employees.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
        <Loader2 className="animate-spin text-spa-600" size={40} />
        <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Mobile Backdrop Overlay */}
      {isMobile && !isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 ${!isSidebarCollapsed || !isMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (isMobile) setIsSidebarCollapsed(true);
          }}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <main
        className={`flex-1 transition-all duration-300 min-h-screen flex flex-col ${isSidebarCollapsed ? 'ml-20' : (isMobile ? 'ml-20' : 'ml-64')
          }`}
      >
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;