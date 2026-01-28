import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Sparkles, X, Save, Upload, User, AlertTriangle, Phone, Mail, Briefcase } from 'lucide-react';
import { Employee, EmployeeStatus, Position } from '../types';
import { generateEmployeeBio, analyzeStaffPerformance } from '../services/geminiService';

interface EmployeePageProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

const INITIAL_FORM_DATA: Omit<Employee, 'id'> = {
  code: '',
  name: '',
  avatar: '',
  position: Position.THERAPIST,
  status: EmployeeStatus.ACTIVE,
  phone: '',
  email: '',
  bio: ''
};

export const EmployeePage: React.FC<EmployeePageProps> = ({ 
  employees, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('All');
  
  // AI States
  const [isGeneratingBio, setIsGeneratingBio] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>(INITIAL_FORM_DATA);
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Derived state for filtering
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = filterPosition === 'All' || emp.position === filterPosition;
    return matchesSearch && matchesPosition;
  });

  const getStatusColor = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return 'bg-green-100 text-green-700 ring-green-600/20';
      case EmployeeStatus.ON_LEAVE:
        return 'bg-yellow-100 text-yellow-700 ring-yellow-600/20';
      case EmployeeStatus.RESIGNED:
        return 'bg-gray-100 text-gray-700 ring-gray-600/20';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff&bold=true`;
  };

  // --- AI Handlers ---

  const handleGenerateBio = async (id: string, name: string, position: string) => {
    setIsGeneratingBio(id);
    const newBio = await generateEmployeeBio(name, position);
    const emp = employees.find(e => e.id === id);
    if (emp) {
        onUpdateEmployee({ ...emp, bio: newBio });
    }
    setIsGeneratingBio(null);
  };

  const handleAnalyzeStaff = async () => {
    setIsAnalyzing(true);
    const result = await analyzeStaffPerformance(employees);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- CRUD Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNextCode = () => {
    const maxCode = employees.reduce((max, emp) => {
        const match = emp.code.match(/NV(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
        }
        return max;
    }, 0);
    return `NV${(maxCode + 1).toString().padStart(3, '0')}`;
  };

  const openAddModal = () => {
    setFormData({
        ...INITIAL_FORM_DATA,
        code: generateNextCode()
    });
    setIsEditing(false);
    setCurrentId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setFormData({
      code: employee.code,
      name: employee.name,
      avatar: employee.avatar,
      position: employee.position,
      status: employee.status,
      phone: employee.phone,
      email: employee.email,
      bio: employee.bio || ''
    });
    setIsEditing(true);
    setCurrentId(employee.id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
        onDeleteEmployee(deleteId);
        setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && currentId) {
      // Update existing
      onUpdateEmployee({ ...formData, id: currentId } as Employee);
    } else {
      // Create new
      const newEmployee: Employee = {
        ...formData,
        id: Date.now().toString(),
        avatar: formData.avatar || getAvatarUrl(formData.name)
      } as Employee;
      onAddEmployee(newEmployee);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-full 2xl:max-w-[1800px] mx-auto transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý nhân viên</h2>
          <p className="text-sm md:text-base text-gray-500 mt-1">Danh sách và thông tin chi tiết đội ngũ nhân sự.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
             <button 
                onClick={handleAnalyzeStaff}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm md:text-base"
            >
                <Sparkles size={18} />
                {isAnalyzing ? '...' : 'AI Phân tích'}
            </button>
            <button 
                onClick={openAddModal}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-spa-600 text-white rounded-lg hover:bg-spa-700 transition-colors shadow-sm font-medium text-sm md:text-base"
            >
                <Plus size={18} />
                Thêm NV
            </button>
        </div>
      </div>

      {/* AI Insight Box */}
      {aiAnalysis && (
        <div className="mb-6 bg-purple-50 border border-purple-100 rounded-xl p-4 relative animate-fade-in">
           <button onClick={() => setAiAnalysis('')} className="absolute top-2 right-2 text-purple-400 hover:text-purple-700">
             <X size={16} />
           </button>
           <h3 className="text-purple-800 font-semibold flex items-center gap-2 mb-2">
             <Sparkles size={16} /> Góc nhìn AI
           </h3>
           <div className="text-purple-700 text-sm md:text-base whitespace-pre-line">{aiAnalysis}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:flex-1 md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã NV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-spa-500/50 md:text-base"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-gray-400 hidden md:block" />
            <select 
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full md:w-auto bg-gray-50 border border-gray-200 text-gray-700 text-sm md:text-base rounded-lg focus:ring-spa-500 focus:border-spa-500 block p-2.5"
            >
                <option value="All">Tất cả chức vụ</option>
                {Object.values(Position).map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                ))}
            </select>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                         <img
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                            src={employee.avatar || getAvatarUrl(employee.name)}
                            alt={employee.name}
                            onError={(e) => { e.currentTarget.src = getAvatarUrl(employee.name); }}
                        />
                        <div>
                            <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                            <div className="text-xs text-gray-400 font-medium">{employee.code}</div>
                        </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase size={16} className="text-gray-400"/>
                        {employee.position}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={16} className="text-gray-400"/>
                        {employee.phone || 'Chưa cập nhật'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={16} className="text-gray-400"/>
                        {employee.email || 'Chưa cập nhật'}
                    </div>
                </div>

                {employee.bio && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 italic">
                        "{employee.bio}"
                    </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                     <button 
                        onClick={() => handleGenerateBio(employee.id, employee.name, employee.position)}
                        disabled={isGeneratingBio === employee.id}
                        className="text-xs flex items-center gap-1 text-spa-600 hover:text-spa-800 disabled:opacity-50 font-medium"
                    >
                        <Sparkles size={14} />
                        {isGeneratingBio === employee.id ? 'Đang tạo...' : 'Tạo Bio AI'}
                    </button>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => openEditModal(employee)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Edit size={18} />
                        </button>
                        <button 
                            onClick={() => handleDeleteClick(employee.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
        ))}
        {filteredEmployees.length === 0 && (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                Không tìm thấy nhân viên nào.
            </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm 2xl:text-base text-gray-500">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-xs 2xl:text-sm">
              <tr>
                <th className="px-6 py-4">STT</th>
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4">Chức vụ</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4">Giới thiệu (AI)</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        className="h-10 w-10 2xl:h-12 2xl:w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                        src={employee.avatar || getAvatarUrl(employee.name)}
                        alt={employee.name}
                        onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(employee.name);
                        }}
                      />
                      <div>
                        <div className="font-semibold text-gray-900 2xl:text-lg">{employee.name}</div>
                        <div className="text-xs 2xl:text-sm text-gray-400">{employee.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs 2xl:text-sm font-medium ring-1 ring-inset ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-gray-900">{employee.phone || '-'}</span>
                        <span className="text-xs 2xl:text-sm text-gray-400">{employee.email || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {employee.bio ? (
                        <p className="text-xs 2xl:text-sm text-gray-600 line-clamp-2" title={employee.bio}>{employee.bio}</p>
                    ) : (
                        <button 
                            onClick={() => handleGenerateBio(employee.id, employee.name, employee.position)}
                            disabled={isGeneratingBio === employee.id}
                            className="text-xs 2xl:text-sm flex items-center gap-1 text-spa-600 hover:text-spa-800 disabled:opacity-50"
                        >
                            <Sparkles size={12} />
                            {isGeneratingBio === employee.id ? 'Đang tạo...' : 'Tạo Bio'}
                        </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => openEditModal(employee)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} className="2xl:w-5 2xl:h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteClick(employee.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="2xl:w-5 2xl:h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        Không tìm thấy nhân viên nào phù hợp.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Delete Confirmation Modal */}
       {deleteId && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
                        <p className="text-sm text-gray-500">Bạn có chắc chắn muốn xóa nhân viên này không? Hành động này không thể hoàn tác.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button 
                        type="button"
                        onClick={() => setDeleteId(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        type="button"
                        onClick={confirmDelete}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        Xóa nhân viên
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800">
                            {isEditing ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
                        </h3>
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Avatar Upload */}
                         <div className="col-span-2 flex items-center justify-center mb-4">
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50">
                                    <img 
                                        src={formData.avatar || getAvatarUrl(formData.name || 'User')} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.currentTarget.src = getAvatarUrl(formData.name || 'User')}
                                    />
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white" size={24} />
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleImageUpload}
                                />
                            </div>
                         </div>

                        {/* Code */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã nhân viên</label>
                            <input 
                                type="text" 
                                name="code"
                                readOnly
                                value={formData.code}
                                className="w-full px-4 py-2 border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed rounded-lg focus:outline-none"
                            />
                        </div>

                        {/* Name */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                                    placeholder="VD: Nguyễn Văn A"
                                />
                            </div>
                        </div>

                        {/* Position */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Chức vụ</label>
                            <select 
                                name="position"
                                value={formData.position}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                            >
                                {Object.values(Position).map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>

                         {/* Status */}
                         <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                            <select 
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                            >
                                {Object.values(EmployeeStatus).map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>

                         {/* Phone */}
                         <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="tel" 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                         {/* Email */}
                         <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Giới thiệu (Bio)</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                                placeholder="Mô tả ngắn về nhân viên..."
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit"
                            className="px-5 py-2.5 text-sm font-medium text-white bg-spa-600 rounded-lg hover:bg-spa-700 focus:ring-4 focus:ring-spa-300 flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Save size={18} />
                            {isEditing ? 'Cập nhật' : 'Thêm mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};