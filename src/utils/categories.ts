export const CATEGORY_MAP: Record<string, string> = {
    'adap-org': '적응 및 조직 시스템',
    'alg-geom': '대수기하학',
    'astro-ph': '천체물리학',
    'atom-ph': '원자물리학',
    'chao-dyn': '카오스 역학',
    'chem-ph': '화학물리학',
    'cmp-lg': '계산 및 언어',
    'cond-mat': '응집물질물리학',
    'cs': '컴퓨터 과학',
    'dg-ga': '미분기하학 및 기하해석',
    'econ': '경제학',
    'eess': '전기전자 및 시스템공학',
    'gr-qc': '일반상대성이론 및 양자우주론',
    'hep-ex': '고에너지물리학-실험',
    'hep-lat': '고에너지물리학-격자이론',
    'hep-ph': '고에너지물리학-현상론',
    'hep-th': '고에너지물리학-이론',
    'math': '수학',
    'math-ph': '수리물리학',
    'mtrl-th': '재료이론',
    'nlin': '비선형과학',
    'nucl-ex': '핵물리학-실험',
    'nucl-th': '핵물리학-이론',
    'physics': '물리학',
    'q-alg': '양자대수학',
    'q-bio': '정량생물학',
    'q-fin': '계량금융학',
    'quant-ph': '양자물리학',
    'solv-int': '가해적분계',
    'stat': '통계학',
};

export const getCategoryName = (code?: string): string => {
    if (!code) return '';
    // Handle cases like "cs.AI" -> "컴퓨터 과학 (cs.AI)" or just "컴퓨터 과학"
    // The user request implies simple mapping, but arXiv categories often have subcategories like cs.AI.
    // If the exact code is in the map, return it.
    if (CATEGORY_MAP[code]) {
        return CATEGORY_MAP[code];
    }

    // If it's a subcategory like "cs.AI", try to map the prefix "cs"
    const prefix = code.split('.')[0];
    if (CATEGORY_MAP[prefix]) {
        return `${CATEGORY_MAP[prefix]} (${code})`;
    }

    return code;
};
