class CustomMarkdownParser {
    constructor() {
        // 缓存正则表达式以提高性能
        this.regexCache = {
            escape: /\\[\\*_~#+\-]/g,
            bold: /\*\*([^*]+?)\*\*/g,
            italic: /\*([^*]+?)\*/g,
            boldItalic: /\*\*\*([^*]+?)\*\*\*/g,
            underline: /_([^_]+?)_/g,
            strikethrough: /-([^-]+?)-/g,
            heading: /^(#{1,6}) (.+)$/gm,
            blockquote: /^(>+) (.+)$/gm,
            unorderedList: /^(\++)\s*(.+)$/gm,
            orderedList: /^(\d+\.)\s*(.+)$/gm,
            inlineCode: /~([^~]+?)~/g,
            codeBlock: /~~~([\s\S]*?)~~~/g,
            colorTag: /<([a-z0-9#]+)>([\s\S]*?)<\/\1>/gi,
            link: /\[([^\]]+)\]\(([^)]+)\)/g,
            image: /!\[([^\]]+)\]\(([^)]+)\)/g
        };
    }

    parse(markdown) {
        // 1. 首先处理转义字符
        markdown = this.parseEscapes(markdown);
        
        // 2. 处理代码块（避免解析其中的内容）
        markdown = this.parseCodeBlocks(markdown);
        
        // 3. 处理块级元素
        markdown = this.parseBlockElements(markdown);
        
        // 4. 处理行内元素
        markdown = this.parseInlineElements(markdown);
        
        return markdown;
    }

    parseEscapes(input) {
        return input.replace(this.regexCache.escape, match => {
            return match.charAt(1); // 返回转义后的字符
        });
    }

    parseCodeBlocks(input) {
        return input.replace(this.regexCache.codeBlock, (_, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });
    }

    parseBlockElements(input) {
        // 使用reduce减少中间字符串生成
        return [
            this.parseHeadings,
            this.parseBlockquotes,
            this.parseUnorderedLists,
            this.parseOrderedLists
        ].reduce((text, parser) => parser.call(this, text), input);
    }

    parseInlineElements(input) {
        return [
            this.parseBold,
            this.parseItalic,
            this.parseBoldItalic,
            this.parseUnderline,
            this.parseStrikethrough,
            this.parseInlineCode,
            this.parseColorTags,
            this.parseLinks,
            this.parseImages
        ].reduce((text, parser) => parser.call(this, text), input);
    }

    parseHeadings(input) {
        return input.replace(this.regexCache.heading, (_, level, text) => {
            const levelNum = level.length;
            return `<h${levelNum}>${text.trim()}</h${levelNum}>`;
        });
    }

    parseBlockquotes(input) {
        return input.replace(this.regexCache.blockquote, (_, level, text) => {
            const depth = level.length;
            return `<blockquote depth="${depth}">${text.trim()}</blockquote>`;
        });
    }

    parseUnorderedLists(input) {
        const lines = input.split('\n');
        let inList = false;
        let currentDepth = 0;
        let output = [];
        
        for (const line of lines) {
            const match = line.match(this.regexCache.unorderedList);
            
            if (match) {
                const depth = match[1].length;
                const content = match[2].trim();
                
                if (!inList) {
                    output.push(`<ul>`);
                    inList = true;
                }
                
                // 处理嵌套层级
                if (depth > currentDepth) {
                    output.push(`<li><ul>`);
                    currentDepth = depth;
                } else if (depth < currentDepth) {
                    output.push(`</ul></li>`);
                    currentDepth = depth;
                } else {
                    output.push(`</li>`);
                }
                
                output.push(`<li>${content}`);
            } else {
                if (inList) {
                    // 结束当前列表
                    while (currentDepth > 0) {
                        output.push('</li></ul>');
                        currentDepth--;
                    }
                    output.push('</ul>');
                    inList = false;
                }
                output.push(line);
            }
        }
        
        // 处理文档末尾的列表
        if (inList) {
            while (currentDepth >= 0) {
                output.push('</li>');
                if (currentDepth > 0) output.push('</ul>');
                currentDepth--;
            }
        }
        
        return output.join('\n');
    }

    parseOrderedLists(input) {
        return input.replace(this.regexCache.orderedList, (_, num, text) => {
            return `<li>${text.trim()}</li>`;
        });
    }

    parseBold(input) {
        return input.replace(this.regexCache.bold, '<strong>$1</strong>');
    }

    parseItalic(input) {
        return input.replace(this.regexCache.italic, '<em>$1</em>');
    }

    parseBoldItalic(input) {
        return input.replace(this.regexCache.boldItalic, '<strong><em>$1</em></strong>');
    }

    parseUnderline(input) {
        return input.replace(this.regexCache.underline, '<u>$1</u>');
    }

    parseStrikethrough(input) {
        return input.replace(this.regexCache.strikethrough, '<del>$1</del>');
    }

    parseInlineCode(input) {
        return input.replace(this.regexCache.inlineCode, '<code>$1</code>');
    }

    parseColorTags(input) {
        return input.replace(this.regexCache.colorTag, (_, color, content) => {
            // 处理颜色名称大小写不敏感
            const normalizedColor = color.toLowerCase();
            
            // 检查是否是十六进制颜色
            if (/^#[0-9a-f]{6}$/i.test(normalizedColor)) {
                return `<span style="color: ${normalizedColor}">${content}</span>`;
            }
            
            // 处理预定义颜色
            const colorMap = {
                red: '#FF0000',
                green: '#00FF00',
                blue: '#0000FF',
                yellow: '#FFFF00',
                purple: '#800080',
                cyan: '#00FFFF',
                magenta: '#FF00FF',
                orange: '#FFA500',
                pink: '#FFC0CB',
                brown: '#A52A2A',
                black: '#000000',
                white: '#FFFFFF',
                gray: '#808080'
            };
            
            const hexColor = colorMap[normalizedColor] || '#000000';
            return `<span style="color: ${hexColor}">${content}</span>`;
        });
    }

    parseLinks(input) {
        return input.replace(this.regexCache.link, '<a href="$2">$1</a>');
    }

    parseImages(input) {
        return input.replace(this.regexCache.image, '<img src="$2" alt="$1">');
    }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = CustomMarkdownParser;
} else {
    window.CustomMarkdownParser = CustomMarkdownParser;
}
