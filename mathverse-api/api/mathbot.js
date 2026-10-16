import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
export default async function handler(req, res) {
  // Allow GitHub Pages, local development, and AI Studio preview environments
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Only POST allowed'
    });
  }
  const { message, grade = 6, history = [] } = req.body;
  try {
    const systemInstruction = `Bạn là MathBot - Trợ lý Gia sư AI môn Toán cấp THCS (Lớp 6, 7, 8, 9) chuẩn chương trình GDPT 2018 Việt Nam (Kết nối tri thức, Chân trời sáng tạo, Cánh diều). Hiện tại đang hỗ trợ học sinh Lớp ${grade}.
NGUYÊN TẮC GIẢNG BÀI:
1. Trình bày bằng tiếng Việt trong sáng, gần gũi, khích lệ (gọi em xưng MathBot hoặc thầy).
2. GIẢI THÍCH TỪNG BƯỚC rõ ràng (Bước 1, Bước 2,...), ngắn gọn, súc tích, dễ hiểu cho lứa tuổi 11-15 tuổi.
3. Không chỉ đưa đáp án cộc lốc mà phải chỉ ra phương pháp, công thức và bản chất vấn đề.
4. Nếu học sinh hỏi cách làm, hướng dẫn và gợi mở tư duy. Nếu học sinh làm sai, chỉ ra chính xác sai ở bước nào và cách sửa.
5. Cung cấp 1 ví dụ tương tự ngắn hoặc mẹo nhớ nhanh khi phù hợp.
6. Sử dụng ký hiệu Toán học rõ ràng (ví dụ: x², √, a/b, 30°...).`;

    const contents = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content || item.text || '' }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents.length > 1 ? contents : message,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return res.json({
      reply: result.text
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "MathBot đang bận"
    });
  }
}
