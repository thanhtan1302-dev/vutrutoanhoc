export interface GeneratedQuestion {
  id: string;
  templateType: string;
  templateName: string;
  topic: string;
  question: string;
  mathExpression?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  type: 'multiple_choice' | 'fill_in';
}

// Hàm tính ước chung lớn nhất (GCD / UCLN)
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

// Bội chung nhỏ nhất (LCM / BCNN)
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

// Rút gọn phân số và format thành chuỗi "a/b" hoặc "a"
function formatFraction(num: number, den: number): string {
  if (den === 0) return '0';
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  num = num / g;
  den = den / g;
  if (den === 1) return `${num}`;
  return `${num}/${den}`;
}

// Shuffle mảng ngẫu nhiên
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Lấy số nguyên ngẫu nhiên trong khoảng [min, max]
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// -------------------------------------------------------------
// 1. TEMPLATE: CỘNG / TRỪ PHÂN SỐ
// -------------------------------------------------------------
function generateFractionArithmeticQuestion(): GeneratedQuestion {
  // Chọn các cặp mẫu số đẹp thường gặp ở THCS
  const samplePairs: [number, number][] = [
    [6, 3],
    [8, 4],
    [7, 7],
    [5, 10],
    [4, 6],
    [3, 5],
    [8, 6],
    [9, 3],
    [12, 4],
    [10, 15],
  ];
  const [den1, den2] = samplePairs[randInt(0, samplePairs.length - 1)];
  const isAddition = Math.random() > 0.3; // 70% cộng, 30% trừ

  let num1 = randInt(1, den1 - 1);
  let num2 = randInt(1, den2 - 1);

  // Đảm bảo nếu trừ thì phân số 1 >= phân số 2 để ra kết quả dương
  if (!isAddition && num1 / den1 < num2 / den2) {
    const tempN = num1;
    num1 = num2;
    num2 = tempN;
  }

  const commonDen = lcm(den1, den2);
  const factor1 = commonDen / den1;
  const factor2 = commonDen / den2;

  const resNum = isAddition
    ? num1 * factor1 + num2 * factor2
    : num1 * factor1 - num2 * factor2;

  const correctFractionStr = formatFraction(resNum, commonDen);
  const opSymbol = isAddition ? '+' : '-';
  const opWord = isAddition ? 'cộng' : 'trừ';

  // Tạo các phương án bẫy phổ biến của học sinh
  const wrong1 = isAddition
    ? formatFraction(num1 + num2, den1 + den2) // Bẫy cộng cả tử và mẫu
    : formatFraction(Math.abs(num1 - num2), Math.abs(den1 - den2) || 1);
  const wrong2 = formatFraction(resNum + randInt(1, 2), commonDen);
  const wrong3 = formatFraction(resNum, commonDen * 2);

  const rawOptions = Array.from(new Set([correctFractionStr, wrong1, wrong2, wrong3]));
  // Nếu bị trùng làm thiếu 4 phương án, bù thêm
  while (rawOptions.length < 4) {
    rawOptions.push(formatFraction(randInt(1, 10), randInt(2, 12)));
  }

  const options = shuffleArray(rawOptions.slice(0, 4));

  const explanation =
    `✨ **Phương pháp giải chi tiết:**\n` +
    `• Đề bài: ${num1}/${den1} ${opSymbol} ${num2}/${den2}\n` +
    `• **Bước 1:** Tìm Mẫu số chung = BCNN(${den1}, ${den2}) = ${commonDen}.\n` +
    `• **Bước 2:** Quy đồng mẫu số hai phân số:\n` +
    `  ${num1}/${den1} = (${num1} · ${factor1}) / (${den1} · ${factor1}) = ${num1 * factor1}/${commonDen}\n` +
    `  ${num2}/${den2} = (${num2} · ${factor2}) / (${den2} · ${factor2}) = ${num2 * factor2}/${commonDen}\n` +
    `• **Bước 3:** Thực hiện phép ${opWord} các tử số và giữ nguyên mẫu số chung:\n` +
    `  ${num1 * factor1}/${commonDen} ${opSymbol} ${num2 * factor2}/${commonDen} = (${num1 * factor1} ${opSymbol} ${num2 * factor2}) / ${commonDen} = ${resNum}/${commonDen}\n` +
    `• **Bước 4:** Rút gọn tối giản (nếu có) được kết quả: **${correctFractionStr}**.`;

  return {
    id: `gen-frac-${Date.now()}-${randInt(100, 999)}`,
    templateType: 'fraction_arithmetic',
    templateName: 'Cộng trừ phân số',
    topic: 'Phân số',
    question: `Kết quả của phép tính ${num1}/${den1} ${opSymbol} ${num2}/${den2} sau khi rút gọn tối giản là:`,
    mathExpression: `${num1}/${den1} ${opSymbol} ${num2}/${den2} = ?`,
    options,
    correctAnswer: correctFractionStr,
    explanation,
    hint: `Tìm mẫu số chung nhỏ nhất của ${den1} và ${den2} là ${commonDen}, quy đồng rồi ${opWord} hai tử số.`,
    type: 'multiple_choice',
  };
}

// -------------------------------------------------------------
// 2. TEMPLATE: TÌM X TRONG TỈ LỆ PHÂN SỐ (x/b = c/d)
// -------------------------------------------------------------
function generateFractionFindXQuestion(): GeneratedQuestion {
  const c = randInt(2, 7);
  const d = randInt(3, 9);
  const k = randInt(2, 4); // hệ số nhân
  const b = d * k;
  const x = c * k;

  const correctAnswer = `${x}`;
  const wrong1 = `${x + randInt(1, 3)}`;
  const wrong2 = `${Math.max(1, x - randInt(1, 2))}`;
  const wrong3 = `${c * d}`;

  const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

  const explanation =
    `✨ **Phương pháp tìm x trong hai phân số bằng nhau:**\n` +
    `• Đề bài: x / ${b} = ${c} / ${d}\n` +
    `• Áp dụng quy tắc nhân chéo: x · ${d} = ${b} · ${c}\n` +
    `• Ta có: x · ${d} = ${b * c}\n` +
    `• Suy ra: x = ${b * c} : ${d} = **${x}**.`;

  return {
    id: `gen-findx-${Date.now()}-${randInt(100, 999)}`,
    templateType: 'fraction_find_x',
    templateName: 'Tìm x trong tỉ lệ thức',
    topic: 'Phân số',
    question: `Tìm số nguyên x biết: x / ${b} = ${c} / ${d}. Giá trị của x là:`,
    mathExpression: `x / ${b} = ${c} / ${d}`,
    options,
    correctAnswer,
    explanation,
    hint: `Nhân chéo: x · ${d} = ${b} · ${c}, sau đó chia cho ${d}.`,
    type: 'multiple_choice',
  };
}

// -------------------------------------------------------------
// 3. TEMPLATE: PHÉP TÍNH SỐ NGUYÊN (ÂM / DƯƠNG)
// -------------------------------------------------------------
function generateIntegerArithmeticQuestion(): GeneratedQuestion {
  const a = randInt(12, 35);
  const b = randInt(5, 25);
  const mode = randInt(1, 3);

  let question = '';
  let correctAnswer = '';
  let explanation = '';
  let hint = '';

  if (mode === 1) {
    // (-a) + b
    const res = -a + b;
    question = `Tính giá trị của phép tính: (-${a}) + ${b} = ?`;
    correctAnswer = `${res}`;
    explanation =
      `✨ **Quy tắc cộng hai số nguyên khác dấu:**\n` +
      `• So sánh phần tự nhiên: ${a} > ${b}.\n` +
      `• Lấy số lớn trừ số bé: ${a} - ${b} = ${Math.abs(res)}.\n` +
      `• Đặt dấu của số có phần tự nhiên lớn hơn (-${a} mang dấu âm): Kết quả là **${res}**.`;
    hint = `Lấy ${a} - ${b} rồi đặt dấu của số lớn hơn (-${a}).`;
  } else if (mode === 2) {
    // (-a) . (-b)
    const m1 = randInt(3, 8);
    const m2 = randInt(4, 9);
    const res = m1 * m2;
    question = `Kết quả của phép nhân: (-${m1}) · (-${m2}) bằng:`;
    correctAnswer = `${res}`;
    explanation =
      `✨ **Quy tắc dấu khi nhân hai số nguyên:**\n` +
      `• Tích của hai số nguyên cùng dấu âm luôn là số nguyên DƯƠNG: (-) · (-) = (+).\n` +
      `• Ta có: (-${m1}) · (-${m2}) = ${m1} · ${m2} = **${res}**.`;
    hint = `Âm nhân âm ra số dương.`;
  } else {
    // a - (-b) = a + b
    const res = a + b;
    question = `Tính kết quả của biểu thức: ${a} - (-${b}) = ?`;
    correctAnswer = `${res}`;
    explanation =
      `✨ **Quy tắc trừ số nguyên:**\n` +
      `• Trừ đi một số âm tương đương với cộng với số dương đối của nó: a - (-b) = a + b.\n` +
      `• Ta có: ${a} - (-${b}) = ${a} + ${b} = **${res}**.`;
    hint = `Dấu trừ đằng trước số âm biến thành phép cộng: ${a} + ${b}.`;
  }

  const numAns = parseInt(correctAnswer);
  const wrong1 = `${-numAns}`;
  const wrong2 = `${numAns + randInt(1, 3)}`;
  const wrong3 = `${numAns - randInt(1, 3)}`;
  const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

  return {
    id: `gen-int-${Date.now()}-${randInt(100, 999)}`,
    templateType: 'integer_arithmetic',
    templateName: 'Phép tính số nguyên',
    topic: 'Số học',
    question,
    options,
    correctAnswer,
    explanation,
    hint,
    type: 'multiple_choice',
  };
}

// -------------------------------------------------------------
// 4. TEMPLATE: NHÂN / CHIA LŨY THỪA CÙNG CƠ SỐ
// -------------------------------------------------------------
function generatePowersQuestion(): GeneratedQuestion {
  const base = randInt(2, 5);
  const m = randInt(2, 5);
  const n = randInt(2, 4);
  const isMul = Math.random() > 0.4;

  let question = '';
  let correctAnswer = '';
  let explanation = '';

  if (isMul) {
    const sumExp = m + n;
    question = `Kết quả của phép nhân hai lũy thừa ${base}^${m} · ${base}^${n} là:`;
    correctAnswer = `${base}^${sumExp}`;
    explanation =
      `✨ **Công thức nhân hai lũy thừa cùng cơ số:**\n` +
      `• aᵐ · aⁿ = aᵐ⁺ⁿ (Giữ nguyên cơ số, cộng các số mũ).\n` +
      `• Ta có: ${base}^${m} · ${base}^${n} = ${base}^(${m} + ${n}) = **${base}^${sumExp}**.`;
  } else {
    const totalM = m + n;
    question = `Kết quả của phép chia hai lũy thừa ${base}^${totalM} : ${base}^${n} là:`;
    correctAnswer = `${base}^${m}`;
    explanation =
      `✨ **Công thức chia hai lũy thừa cùng cơ số:**\n` +
      `• aᵐ : aⁿ = aᵐ⁻ⁿ (Giữ nguyên cơ số, trừ các số mũ).\n` +
      `• Ta có: ${base}^${totalM} : ${base}^${n} = ${base}^(${totalM} - ${n}) = **${base}^${m}**.`;
  }

  const baseExp = isMul ? m + n : m;
  const wrong1 = `${base}^${isMul ? m * n : Math.max(1, baseExp - 1)}`;
  const wrong2 = `${base * 2}^${baseExp}`;
  const wrong3 = `${base}^${baseExp + 1}`;
  const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

  return {
    id: `gen-power-${Date.now()}-${randInt(100, 999)}`,
    templateType: 'powers_arithmetic',
    templateName: 'Lũy thừa cùng cơ số',
    topic: 'Số học',
    question,
    options,
    correctAnswer,
    explanation,
    hint: isMul ? 'Giữ nguyên cơ số và cộng số mũ.' : 'Giữ nguyên cơ số và trừ số mũ.',
    type: 'multiple_choice',
  };
}

// -------------------------------------------------------------
// 5. TEMPLATE: PHƯƠNG TRÌNH BẬC NHẤT (ax + b = c)
// -------------------------------------------------------------
function generateLinearEquationQuestion(): GeneratedQuestion {
  const x = randInt(2, 8); // nghiệm đẹp
  const a = randInt(2, 5); // hệ số của x
  const b = randInt(3, 15);
  const isPlus = Math.random() > 0.5;
  const c = isPlus ? a * x + b : a * x - b;

  const eqStr = isPlus ? `${a}x + ${b} = ${c}` : `${a}x - ${b} = ${c}`;
  const correctAnswer = `${x}`;

  const wrong1 = `${x + randInt(1, 2)}`;
  const wrong2 = `${Math.max(1, x - randInt(1, 2))}`;
  const wrong3 = `${x + 3}`;
  const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

  const explanation =
    `✨ **Các bước giải phương trình tìm x:**\n` +
    `• Phương trình: ${eqStr}\n` +
    `• **Bước 1 (Chuyển vế đổi dấu):**\n` +
    `  ${a}x = ${c} ${isPlus ? '-' : '+'} ${b}\n` +
    `  ${a}x = ${a * x}\n` +
    `• **Bước 2 (Tìm x):**\n` +
    `  x = ${a * x} : ${a} = **${x}**.\n` +
    `• Vậy nghiệm của phương trình là x = ${x}.`;

  return {
    id: `gen-eq-${Date.now()}-${randInt(100, 999)}`,
    templateType: 'linear_equation',
    templateName: 'Phương trình bậc nhất',
    topic: 'Đại số',
    question: `Tìm x biết: ${eqStr}. Giá trị của x là:`,
    mathExpression: eqStr,
    options,
    correctAnswer,
    explanation,
    hint: `Chuyển ${isPlus ? '+' : '-'}${b} sang vế phải thành ${isPlus ? '-' : '+'}${b}, sau đó chia cả hai vế cho ${a}.`,
    type: 'multiple_choice',
  };
}

// -------------------------------------------------------------
// 6. TEMPLATE: ĐỊNH LÝ PYTHAGORE TRONG TAM GIÁC VUÔNG
// -------------------------------------------------------------
function generatePythagoreQuestion(): GeneratedQuestion {
  // Bộ ba số Pythagore nguyên đẹp: (3k, 4k, 5k), (5, 12, 13), (8, 15, 17)
  const pythTriples = [
    [3, 4, 5],
    [6, 8, 10],
    [9, 12, 15],
    [12, 16, 20],
    [5, 12, 13],
    [8, 15, 17],
  ];
  const [a, b, c] = pythTriples[randInt(0, pythTriples.length - 1)];
  const findHypotenuse = Math.random() > 0.4;

  let question = '';
  let correctAnswer = '';
  let explanation = '';

  if (findHypotenuse) {
    question = `Cho tam giác ABC vuông tại A có AB = ${a} cm, AC = ${b} cm. Độ dài cạnh huyền BC là bao nhiêu cm?`;
    correctAnswer = `${c}`;
    explanation =
      `✨ **Định lý Pythagore trong tam giác vuông:**\n` +
      `• Bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông:\n` +
      `  BC² = AB² + AC² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}.\n` +
      `• Suy ra: BC = √(${c * c}) = **${c} cm**.`;
  } else {
    question = `Cho tam giác ABC vuông tại A có cạnh huyền BC = ${c} cm và cạnh góc vuông AB = ${a} cm. Độ dài cạnh góc vuông AC là:`;
    correctAnswer = `${b}`;
    explanation =
      `✨ **Định lý Pythagore:**\n` +
      `• AC² = BC² - AB² = ${c}² - ${a}² = ${c * c} - ${a * a} = ${b * b}.\n` +
      `• Suy ra: AC = √(${b * b}) = **${b} cm**.`;
  }

  const ansNum = parseInt(correctAnswer);
  const wrong1 = `${ansNum + randInt(1, 3)}`;
  const wrong2 = `${Math.max(1, ansNum - randInt(1, 2))}`;
  const wrong3 = `${ansNum + 4}`;
  const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

  return {
    id: `gen-pyth-${Date.now()}-${randInt(100, 999)}`,
    templateType: 'pythagorean_theorem',
    templateName: 'Định lý Pythagore',
    topic: 'Hình học',
    question,
    options,
    correctAnswer,
    explanation,
    hint: `Áp dụng công thức c² = a² + b² trong tam giác vuông.`,
    type: 'multiple_choice',
  };
}

// -------------------------------------------------------------
// 7. TEMPLATE: DIỆN TÍCH HÌNH HỌC (HÌNH THOI / HÌNH THANG)
// -------------------------------------------------------------
function generateGeometryAreaQuestion(): GeneratedQuestion {
  const isRhombus = Math.random() > 0.5;

  if (isRhombus) {
    const d1 = randInt(4, 10) * 2; // số chẵn
    const d2 = randInt(5, 15);
    const area = (d1 * d2) / 2;

    const correctAnswer = `${area}`;
    const wrong1 = `${d1 * d2}`; // bẫy quên chia 2
    const wrong2 = `${area + 10}`;
    const wrong3 = `${Math.max(1, area - 10)}`;
    const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

    return {
      id: `gen-geom-${Date.now()}-${randInt(100, 999)}`,
      templateType: 'rhombus_area',
      templateName: 'Diện tích hình thoi',
      topic: 'Hình học',
      question: `Một hình thoi có độ dài hai đường chéo lần lượt là ${d1} cm và ${d2} cm. Diện tích của hình thoi là bao nhiêu cm²?`,
      options,
      correctAnswer,
      explanation:
        `✨ **Công thức tính diện tích hình thoi:**\n` +
        `• S = (d₁ · d₂) / 2\n` +
        `• Thay số: S = (${d1} · ${d2}) / 2 = ${d1 * d2} / 2 = **${area} cm²**.`,
      hint: `Diện tích hình thoi bằng tích hai đường chéo chia đôi: (d₁ · d₂) / 2.`,
      type: 'multiple_choice',
    };
  } else {
    const a = randInt(4, 12);
    const b = randInt(6, 16);
    const h = randInt(2, 6) * 2; // chẵn để chia 2 nguyên
    const area = ((a + b) * h) / 2;

    const correctAnswer = `${area}`;
    const wrong1 = `${(a + b) * h}`; // bẫy quên chia 2
    const wrong2 = `${area + randInt(5, 12)}`;
    const wrong3 = `${Math.max(1, area - 8)}`;
    const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

    return {
      id: `gen-geom-${Date.now()}-${randInt(100, 999)}`,
      templateType: 'trapezoid_area',
      templateName: 'Diện tích hình thang',
      topic: 'Hình học',
      question: `Hình thang có độ dài hai đáy lần lượt là ${a} cm và ${b} cm, chiều cao là ${h} cm. Diện tích hình thang là:`,
      options,
      correctAnswer,
      explanation:
        `✨ **Công thức tính diện tích hình thang:**\n` +
        `• S = [(a + b) · h] / 2\n` +
        `• Thay số: S = [(${a} + ${b}) · ${h}] / 2 = [${a + b} · ${h}] / 2 = ${ (a + b) * h } / 2 = **${area} cm²**.`,
      hint: `Lấy đáy lớn cộng đáy nhỏ, nhân với chiều cao rồi chia đôi.`,
      type: 'multiple_choice',
    };
  }
}

// -------------------------------------------------------------
// 8. TEMPLATE: HẰNG ĐẲNG THỨC ĐẠI SỐ
// -------------------------------------------------------------
function generateAlgebraIdentityQuestion(): GeneratedQuestion {
  const isDiffOfSquares = Math.random() > 0.5;

  if (isDiffOfSquares) {
    // A² - B² với các số đẹp
    const pairs = [
      [65, 35],
      [75, 25],
      [85, 15],
      [55, 45],
      [105, 95],
      [62, 38],
    ];
    const [A, B] = pairs[randInt(0, pairs.length - 1)];
    const res = (A - B) * (A + B);

    const correctAnswer = `${res}`;
    const wrong1 = `${(A - B) * 10}`;
    const wrong2 = `${res + 100}`;
    const wrong3 = `${res - 200}`;
    const options = shuffleArray(Array.from(new Set([correctAnswer, wrong1, wrong2, wrong3])).slice(0, 4));

    return {
      id: `gen-ident-${Date.now()}-${randInt(100, 999)}`,
      templateType: 'algebra_identity',
      templateName: 'Hằng đẳng thức hiệu hai bình phương',
      topic: 'Đại số',
      question: `Tính nhanh giá trị của biểu thức: ${A}² - ${B}² = ?`,
      options,
      correctAnswer,
      explanation:
        `✨ **Áp dụng hằng đẳng thức A² - B² = (A - B)(A + B):**\n` +
        `• ${A}² - ${B}² = (${A} - ${B}) · (${A} + ${B})\n` +
        `• = ${A - B} · ${A + B} = **${res}**.`,
      hint: `Dùng công thức (A - B)(A + B) để tính nhẩm nhanh.`,
      type: 'multiple_choice',
    };
  } else {
    const a = randInt(2, 5);
    const correctAnswer = `x² - ${2 * a}x + ${a * a}`;
    const wrong1 = `x² - ${a}x + ${a * a}`;
    const wrong2 = `x² - ${2 * a}x - ${a * a}`;
    const wrong3 = `x² - ${a * a}`;
    const options = shuffleArray([correctAnswer, wrong1, wrong2, wrong3]);

    return {
      id: `gen-ident-${Date.now()}-${randInt(100, 999)}`,
      templateType: 'algebra_identity',
      templateName: 'Khai triển hằng đẳng thức',
      topic: 'Đại số',
      question: `Khai triển hằng đẳng thức (x - ${a})² ta được kết quả là:`,
      options,
      correctAnswer,
      explanation:
        `✨ **Áp dụng hằng đẳng thức bình phương của một hiệu:**\n` +
        `• (A - B)² = A² - 2AB + B²\n` +
        `• Với A = x, B = ${a}:\n` +
        `  (x - ${a})² = x² - 2 · x · ${a} + ${a}² = **x² - ${2 * a}x + ${a * a}**.`,
      hint: `Hệ số ở giữa là -2 · x · ${a}.`,
      type: 'multiple_choice',
    };
  }
}

// -------------------------------------------------------------
// HÀM NHẬN DIỆN VÀ SINH CÂU HỎI TƯƠNG TỰ
// -------------------------------------------------------------
export function generateSimilarQuestion(
  sourceQuestionText: string,
  topic: string,
  _originalCorrectAnswer?: string
): GeneratedQuestion {
  const text = (sourceQuestionText || '').toLowerCase();
  const top = (topic || '').toLowerCase();

  // 1. Phân số
  if (
    top.includes('phân số') ||
    text.includes('/') ||
    text.includes('mẫu số') ||
    text.includes('quy đồng')
  ) {
    if (text.includes('tìm x') || text.includes('x /') || text.includes('bằng nhau')) {
      return generateFractionFindXQuestion();
    }
    return generateFractionArithmeticQuestion();
  }

  // 2. Hình học (Pythagore, hình thoi, diện tích)
  if (top.includes('hình học') || text.includes('tam giác') || text.includes('hình thoi') || text.includes('diện tích')) {
    if (text.includes('pythagore') || text.includes('vuông') || text.includes('cạnh huyền')) {
      return generatePythagoreQuestion();
    }
    return generateGeometryAreaQuestion();
  }

  // 3. Đại số (Phương trình, Hằng đẳng thức)
  if (top.includes('đại số') || text.includes('phương trình') || text.includes('tìm x') || text.includes('hằng đẳng thức')) {
    if (text.includes('hằng đẳng thức') || text.includes('²') || text.includes('bình phương')) {
      return generateAlgebraIdentityQuestion();
    }
    return generateLinearEquationQuestion();
  }

  // 4. Số học (Lũy thừa, số nguyên âm)
  if (top.includes('số học') || text.includes('lũy thừa') || text.includes('số nguyên') || text.includes('âm')) {
    if (text.includes('lũy thừa') || text.includes('^') || text.includes('²') || text.includes('³')) {
      return generatePowersQuestion();
    }
    return generateIntegerArithmeticQuestion();
  }

  // Fallback ngẫu nhiên theo topic
  if (top.includes('đại')) return generateLinearEquationQuestion();
  if (top.includes('hình')) return generateGeometryAreaQuestion();
  return generateFractionArithmeticQuestion();
}

// -------------------------------------------------------------
// HÀM SINH BỘ CÂU HỎI TƯƠNG TỰ (MẶC ĐỊNH 3 CÂU THEO YÊU CẦU ĐỀ BÀI)
// Ví dụ: Câu sai 5/6 + 1/3 -> Sinh bộ: 7/8 + 1/4, 3/7 + 2/7, 4/5 + 1/10
// -------------------------------------------------------------
export function generateSimilarQuestionSet(
  sourceQuestionText: string,
  topic: string,
  count: number = 3,
  originalCorrectAnswer?: string
): GeneratedQuestion[] {
  const result: GeneratedQuestion[] = [];
  const seenSignatures = new Set<string>();

  for (let attempt = 0; attempt < count * 8 && result.length < count; attempt++) {
    const q = generateSimilarQuestion(sourceQuestionText, topic, originalCorrectAnswer);
    // Tránh trùng lặp câu hỏi trong cùng một bộ bài tập
    const sig = q.mathExpression || q.question;
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      result.push(q);
    }
  }

  // Đảm bảo luôn trả về ít nhất 1 câu hỏi
  if (result.length === 0) {
    result.push(generateSimilarQuestion(sourceQuestionText, topic, originalCorrectAnswer));
  }

  return result;
}

