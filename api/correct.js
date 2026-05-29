export default async function handler(req, res) {
    // 只允许 POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { essay } = req.body;
    if (!essay || essay.trim().length === 0) {
        return res.status(400).json({ error: '作文内容不能为空' });
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        console.error('DEEPSEEK_API_KEY 未配置');
        return res.status(500).json({ error: '服务端配置错误' });
    }

    const prompt = `你是一位四六级英语作文批改专家。请对以下学生作文进行批改，输出格式如下：

【语法/拼写错误】
- 错误原文：xxx → 正确写法：xxx （逐条列出）
- 如果没有明显错误，则写“没有明显语法错误”。

【词汇升级建议】
- 建议将“xxx”替换为“yyy” （至少给出2条）
- 如果已经很好，可写“词汇使用较好，无升级建议”。

【整体评分】xx分（百分制），并给出一句简短的评语。

【优化后版本】将原文改写得更地道、更高级。

学生作文：
${essay}

请严格按照上述格式输出，不要额外内容。`;

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
                max_tokens: 1000
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