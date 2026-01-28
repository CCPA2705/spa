import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, X, Save, Upload, AlertTriangle, Image as ImageIcon, Clock, DollarSign, Users } from 'lucide-react';
import { Service, ServiceCategory, ServiceStatus } from '../types';

interface ServicePageProps {
  services: Service[];
  onAddService: (service: Service) => void;
  onUpdateService: (service: Service) => void;
  onDeleteService: (id: string) => void;
}

const INITIAL_FORM_DATA: Omit<Service, 'id'> = {
  code: '',
  name: '',
  image: '',
  category: ServiceCategory.MASSAGE,
  duration: 60,
  price: 0,
  staffCount: 1,
  status: ServiceStatus.ACTIVE,
  description: ''
};

export const ServicePage: React.FC<ServicePageProps> = ({
  services,
  onAddService,
  onUpdateService,
  onDeleteService
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Service, 'id'>>(INITIAL_FORM_DATA);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Derived state for filtering
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          service.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || service.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: ServiceStatus) => {
    return status === ServiceStatus.ACTIVE 
      ? 'bg-green-100 text-green-700 ring-green-600/20'
      : 'bg-gray-100 text-gray-700 ring-gray-600/20';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNextCode = () => {
    const maxCode = services.reduce((max, svc) => {
        const match = svc.code.match(/DV(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
        }
        return max;
    }, 0);
    return `DV${(maxCode + 1).toString().padStart(3, '0')}`;
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

  const openEditModal = (service: Service) => {
    setFormData({
      code: service.code,
      name: service.name,
      image: service.image,
      category: service.category,
      duration: service.duration,
      price: service.price,
      staffCount: service.staffCount || 1,
      status: service.status,
      description: service.description
    });
    setIsEditing(true);
    setCurrentId(service.id);
    setIsModalOpen(true);
  };

  // Trigger delete confirmation
  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  // Confirm delete action
  const confirmDelete = () => {
    if (deleteId) {
        onDeleteService(deleteId);
        setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name || formData.price < 0 || formData.duration <= 0 || (formData.staffCount && formData.staffCount < 0)) {
        alert("Vui lòng kiểm tra lại thông tin nhập.");
        return;
    }

    if (isEditing && currentId) {
      onUpdateService({ ...formData, id: currentId } as Service);
    } else {
      const newService: Service = {
        ...formData,
        id: Date.now().toString(),
        staffCount: formData.staffCount || 1
      };
      onAddService(newService);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-full 2xl:max-w-[1800px] mx-auto transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý dịch vụ</h2>
          <p className="text-sm md:text-base text-gray-500 mt-1">Danh mục các liệu trình và gói dịch vụ tại Spa.</p>
        </div>
        <button 
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-spa-600 text-white rounded-lg hover:bg-spa-700 transition-colors shadow-sm font-medium text-sm md:text-base"
        >
            <Plus size={18} />
            Thêm dịch vụ
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:flex-1 md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm dịch vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-spa-500/50 md:text-base"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-gray-400 hidden md:block" />
            <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full md:w-auto bg-gray-50 border border-gray-200 text-gray-700 text-sm md:text-base rounded-lg focus:ring-spa-500 focus:border-spa-500 block p-2.5"
            >
                <option value="All">Tất cả danh mục</option>
                {Object.values(ServiceCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Grid of Services */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* MOBILE CARD VIEW */}
        <div className="md:hidden p-4 space-y-4">
             {filteredServices.map((service) => (
                 <div key={service.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative">
                     <div className="flex items-start gap-4 mb-3">
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                             {service.image ? (
                                 <img src={service.image} alt="" className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-400">
                                     <ImageIcon size={24} />
                                 </div>
                             )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 line-clamp-1">{service.name}</h4>
                            <span className="text-xs text-gray-400 block mb-1">{service.code}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                                {service.category}
                            </span>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            <span>{service.duration}p</span>
                        </div>
                         <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-gray-400" />
                            <span>{service.staffCount || 1} NV</span>
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="font-bold text-spa-700 text-lg">
                            {formatCurrency(service.price)}
                        </span>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => openEditModal(service)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(service.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                        </div>
                     </div>
                 </div>
             ))}
             {filteredServices.length === 0 && (
                 <div className="text-center py-10 text-gray-400">Không tìm thấy dịch vụ.</div>
             )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm 2xl:text-base text-gray-500">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-xs 2xl:text-sm">
              <tr>
                <th className="px-6 py-4">STT</th>
                <th className="px-6 py-4">Dịch vụ</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Thời gian / Nhân sự</th>
                <th className="px-6 py-4">Giá</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredServices.map((service, index) => (
                <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 2xl:h-16 2xl:w-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                         {service.image ? (
                             <img src={service.image} alt="" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                                 <ImageIcon size={20} />
                             </div>
                         )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 2xl:text-lg">{service.name}</div>
                        <div className="text-xs 2xl:text-sm text-gray-400">{service.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs 2xl:text-sm font-medium bg-blue-50 text-blue-700">
                        {service.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock size={16} className="2xl:w-5 2xl:h-5"/>
                            <span className="text-xs 2xl:text-sm">{service.duration} phút</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Users size={16} className="2xl:w-5 2xl:h-5"/>
                            <span className="text-xs 2xl:text-sm">{service.staffCount || 1} nhân viên</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-spa-700 2xl:text-lg">
                    {formatCurrency(service.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs 2xl:text-sm font-medium ring-1 ring-inset ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} className="2xl:w-5 2xl:h-5"/>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteClick(service.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="2xl:w-5 2xl:h-5"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        Không tìm thấy dịch vụ nào phù hợp.
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
                        <p className="text-sm text-gray-500">Bạn có chắc chắn muốn xóa dịch vụ này không? Hành động này không thể hoàn tác.</p>
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
                        Xóa dịch vụ
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
                            {isEditing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}
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
                        {/* Service Code */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã dịch vụ (Tự động)</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tên dịch vụ <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                                placeholder="VD: Massage Body"
                            />
                        </div>

                        {/* Category */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                            <select 
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                            >
                                {Object.values(ServiceCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
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
                                {Object.values(ServiceStatus).map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>

                        {/* Duration */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian (phút) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="number" 
                                    name="duration"
                                    min="1"
                                    required
                                    value={formData.duration}
                                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                         {/* Staff Count */}
                         <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng nhân viên <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="number" 
                                    name="staffCount"
                                    min="0"
                                    required
                                    value={formData.staffCount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, staffCount: parseInt(e.target.value) || 0 }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Price */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Giá (VNĐ) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₫</div>
                                <input 
                                    type="number" 
                                    name="price"
                                    min="0"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh minh họa</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    {formData.image ? (
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        id="service-img-upload"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                    <label
                                        htmlFor="service-img-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors shadow-sm"
                                    >
                                        <Upload size={16} />
                                        Tải ảnh lên
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả dịch vụ</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-transparent outline-none transition-all"
                                placeholder="Chi tiết về liệu trình..."
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