import { GoogleGenAI } from "@google/genai";
import { Employee } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEmployeeBio = async (name: string, position: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Viết một đoạn giới thiệu ngắn, chuyên nghiệp và thân thiện (khoảng 50 từ) cho một nhân viên Spa tên là ${name}, làm việc tại vị trí ${position}. Giọng văn nhẹ nhàng, thư giãn. Tiếng Việt.`,
    });
    
    return response.text || "Không thể tạo nội dung lúc này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Đã xảy ra lỗi khi kết nối với AI.";
  }
};

export const analyzeStaffPerformance = async (employees: Employee[]): Promise<string> => {
    const staffList = employees.map(e => `${e.name} (${e.position}) - ${e.status}`).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dựa trên danh sách nhân viên sau đây của một Spa:\n${staffList}\n\nĐưa ra 3 gợi ý ngắn gọn để cải thiện quản lý nhân sự hoặc tối ưu hóa lịch làm việc.`,
        });
        return response.text || "Không có dữ liệu.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Lỗi phân tích.";
    }
}