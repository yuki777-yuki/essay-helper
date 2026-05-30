export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { essay, mode = 'correct', topic } = req.body;
    if (!essay || essay.trim().length === 0) {
        return res.status(400).json({ error: '内容不能为空' });
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        console.error('DEEPSEEK_API_KEY 未配置');
        return res.status(500).json({ error: '服务端配置错误' });
    }

    let prompt = '';

    if (mode === 'correct') {
        let topicPrompt = "";
        if (topic && topic.trim() !== "") {
            topicPrompt = `作文题目：${topic}\n\n请首先判断学生作文是否切题（是否围绕题目要求展开），如果跑题，请明确指出并给出建议。\n\n`;
        } else {
            topicPrompt = "未提供作文题目，无法判断是否切题。请仅针对语法、词汇和表达给出批改。\n\n";
        }
        prompt = `你是一位四六级英语作文批改专家。${topicPrompt}请对以下学生作文进行批改，输出格式如下：

【切题分析】（如果提供了题目）
- 是否切题：是/否
- 简要分析：...

【语法/拼写错误】
- 错误原文：xxx → 正确写法：xxx （逐条列出）
- 如果没有明显错误，则写“没有明显语法错误”。

【词汇升级建议】
- 建议将“xxx”替换为“yyy” （至少给出2条）

【整体评分】xx分（百分制），并给出一句简短的评语。

【优化后版本】将原文改写得更地道、更高级。

学生作文：
${essay}

请严格按照上述格式输出，不要额外内容。`;
    } 
    else if (mode === 'guide') {
        prompt = `你是大学英语四级作文辅导专家。用户将给出作文题目，请按以下结构输出纯文本内容，不要使用任何 Markdown 语法（不要使用 #、*、-、> 等符号），用换行和普通数字序号即可：
    
    1. 【题目分析】用中文解释题目要求，关键词，写作方向。
    2. 【高分结构】给出最简单实用的三段式模板（开头、中间、结尾各写什么）。
    3. 【亮眼句型】提供3个简单但让阅卷老师眼前一亮的句型（可套用任何题目），每个句型附中文解释。
    4. 【避坑提醒】列出2个最常犯的低级错误（比如主谓一致、时态混乱）。
    
    用户题目：${essay}
    
    请严格按照以上格式输出纯文本，不要添加任何额外的说明或结尾。`;
    }
    else if (mode === 'translate') {
        prompt = `你是四级翻译专家。用户输入中文句子，请输出：
1. 【英文翻译】
2. 【解析】为什么这么翻译，重点词汇或句型说明。
3. 【升级版】一个更高级或更地道的表达方式（可选）。

中文句子：${essay}

输出格式要清晰，请用中文解释。`;
    } 
    else {
        return res.status(400).json({ error: '无效的模式' });
    }

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 1200
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`DeepSeek API 错误: ${response.status}`, errText);
            return res.status(500).json({ error: 'AI 服务调用失败' });
        }

        const data = await response.json();
        const result = data.choices[0].message.content;
        return res.status(200).json({ result });
    } catch (error) {
        console.error('API 处理异常:', error);
        return res.status(500).json({ error: '服务器内部错误' });
    }
}