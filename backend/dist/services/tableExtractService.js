"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableExtractService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const unpdf_1 = require("unpdf");
const XLSX = __importStar(require("xlsx"));
const node_tesseract_ocr_1 = __importDefault(require("node-tesseract-ocr"));
const pdf2pic_1 = require("pdf2pic");
class TableExtractService {
    async extractTables(options) {
        try {
            const { pdfPath, outputPath } = options;
            // 确保输出目录存在
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            // 读取PDF文件
            const dataBuffer = fs.readFileSync(pdfPath);
            let tables = [];
            try {
                // 首先尝试使用pdf-parse提取文本内容
                console.log('尝试使用pdf-parse提取文本...');
                const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
                // 从文本中识别表格结构
                tables = await this.extractTablesFromText(pdfData.text, pdfData.numpages);
                if (tables.length > 0) {
                    console.log(`通过pdf-parse找到 ${tables.length} 个表格`);
                }
            }
            catch (error) {
                console.log('pdf-parse提取失败，尝试使用unpdf:', error);
            }
            // 如果pdf-parse没有找到表格，使用unpdf进行更强大的文本提取
            if (tables.length === 0) {
                try {
                    console.log('使用unpdf进行高级文本提取...');
                    const pdf = await (0, unpdf_1.getDocumentProxy)(new Uint8Array(dataBuffer));
                    const { totalPages, text } = await (0, unpdf_1.extractText)(pdf, { mergePages: true });
                    console.log(`unpdf提取完成，总页数: ${totalPages}，文本长度: ${text.length}`);
                    if (text && text.length > 0) {
                        tables = await this.extractTablesFromText(text, totalPages);
                        if (tables.length > 0) {
                            console.log(`通过unpdf找到 ${tables.length} 个表格`);
                        }
                    }
                }
                catch (error) {
                    console.error('unpdf提取失败:', error);
                }
            }
            // 如果仍然没有找到表格，尝试OCR识别
            if (tables.length === 0) {
                try {
                    console.log('尝试使用OCR识别扫描件PDF...');
                    const ocrTables = await this.extractTablesWithOCR(pdfPath);
                    tables.push(...ocrTables);
                    if (tables.length > 0) {
                        console.log(`通过OCR识别找到 ${tables.length} 个表格`);
                    }
                }
                catch (ocrError) {
                    console.error('OCR识别失败:', ocrError);
                    console.log('所有方法都未能找到表格数据，可能的原因：');
                    console.log('1. PDF是扫描件且OCR识别失败');
                    console.log('2. 表格格式不规范或过于复杂');
                    console.log('3. 文档中确实没有表格');
                    console.log('建议：请使用包含可选择文本的PDF文件或清晰的扫描件');
                }
            }
            // 只有当找到表格时才写入Excel文件
            if (tables.length > 0) {
                await this.writeToExcel(tables, outputPath);
            }
            return tables;
        }
        catch (error) {
            console.error('提取表格失败:', error);
            throw error;
        }
    }
    async extractTablesWithOCR(pdfPath) {
        const tables = [];
        try {
            // 配置pdf2pic选项
            const convert = (0, pdf2pic_1.fromPath)(pdfPath, {
                density: 300, // 设置DPI为300，提高图片质量
                saveFilename: "page",
                savePath: path.join(path.dirname(pdfPath), 'temp_images'),
                format: "png",
                width: 2000, // 设置图片宽度
                height: 2000 // 设置图片高度
            });
            // 转换PDF的所有页面为图片
            console.log('正在将PDF转换为图片...');
            const results = await convert.bulk(-1, { responseType: "buffer" });
            // 配置Tesseract OCR选项
            const ocrConfig = {
                lang: "eng+chi_sim", // 支持英文和简体中文
                oem: 1, // OCR引擎模式
                psm: 6, // 页面分割模式：统一的文本块
                tessedit_char_whitelist: undefined, // 不限制字符
            };
            // 对每个页面进行OCR识别
            for (let i = 0; i < results.length; i++) {
                const pageResult = results[i];
                console.log(`正在OCR识别第 ${i + 1} 页...`);
                try {
                    // 检查buffer是否存在
                    if (!pageResult.buffer) {
                        console.warn(`第 ${i + 1} 页没有有效的图片buffer`);
                        continue;
                    }
                    // 使用Tesseract进行OCR识别
                    const ocrText = await node_tesseract_ocr_1.default.recognize(pageResult.buffer, ocrConfig);
                    if (ocrText && ocrText.trim().length > 0) {
                        console.log(`第 ${i + 1} 页OCR识别完成，文本长度: ${ocrText.length}`);
                        // 从OCR文本中提取表格
                        const pageTables = await this.extractTablesFromText(ocrText, 1);
                        // 更新页码信息
                        pageTables.forEach(table => {
                            table.page = i + 1;
                            table.tableIndex = tables.length;
                            tables.push(table);
                        });
                    }
                }
                catch (pageOcrError) {
                    console.error(`第 ${i + 1} 页OCR识别失败:`, pageOcrError);
                }
            }
            // 清理临时图片文件
            const tempDir = path.join(path.dirname(pdfPath), 'temp_images');
            if (fs.existsSync(tempDir)) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    console.log('临时图片文件已清理');
                }
                catch (cleanupError) {
                    console.warn('清理临时文件失败:', cleanupError);
                }
            }
        }
        catch (error) {
            console.error('OCR处理过程中发生错误:', error);
            throw error;
        }
        return tables;
    }
    async extractTablesFromText(text, pageCount) {
        const tables = [];
        // 清理和预处理文本
        const cleanedText = this.preprocessText(text);
        const lines = cleanedText.split('\n').filter(line => line.trim().length > 0);
        console.log(`开始分析PDF文本，共${lines.length}行`);
        console.log('原始文本前500字符:', text.substring(0, 500));
        console.log('清理后文本前500字符:', cleanedText.substring(0, 500));
        // 查找可能的表格模式
        let currentTable = [];
        let tableIndex = 0;
        let currentPage = 1;
        let consecutiveNonTableLines = 0;
        let potentialTableLines = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            console.log(`\n分析第 ${i + 1}/${lines.length} 行: "${line.substring(0, 80)}..."`);
            // 检测表格行
            if (this.isTableRow(line)) {
                currentTable.push(line);
                consecutiveNonTableLines = 0;
                potentialTableLines++;
                console.log(`✓ 检测到表格行 (当前表格累计: ${currentTable.length} 行)`);
            }
            else {
                consecutiveNonTableLines++;
                console.log(`✗ 非表格行 (连续非表格行: ${consecutiveNonTableLines})`);
                // 如果连续遇到多行非表格内容，认为表格结束
                if (consecutiveNonTableLines >= 2 && currentTable.length >= 2) {
                    console.log(`\n尝试解析表格 (${currentTable.length} 行数据)...`);
                    const tableData = this.parseTableData(currentTable, currentPage, tableIndex);
                    if (tableData) {
                        console.log(`✓ 成功解析表格 ${tableIndex + 1}，包含 ${tableData.headers.length} 列，${tableData.rows.length} 行数据`);
                        tables.push(tableData);
                        tableIndex++;
                    }
                    else {
                        console.log(`✗ 表格解析失败`);
                    }
                    currentTable = [];
                    consecutiveNonTableLines = 0;
                }
            }
        }
        // 处理最后一个表格
        if (currentTable.length >= 2) {
            console.log(`\n处理最后一个表格 (${currentTable.length} 行数据)...`);
            const tableData = this.parseTableData(currentTable, currentPage, tableIndex);
            if (tableData) {
                console.log(`✓ 成功解析最后一个表格，包含 ${tableData.headers.length} 列，${tableData.rows.length} 行数据`);
                tables.push(tableData);
            }
            else {
                console.log(`✗ 最后一个表格解析失败`);
            }
        }
        console.log(`\n=== 表格识别统计 ===`);
        console.log(`总行数: ${lines.length}`);
        console.log(`潜在表格行数: ${potentialTableLines}`);
        console.log(`识别到的表格数量: ${tables.length}`);
        // 如果没有找到表格，尝试其他方法
        if (tables.length === 0) {
            console.log('\n未检测到标准表格结构，尝试其他识别方法...');
            const alternativeTables = this.tryAlternativeTableExtraction(lines);
            if (alternativeTables.length > 0) {
                console.log(`通过替代方法找到 ${alternativeTables.length} 个表格`);
            }
            tables.push(...alternativeTables);
        }
        console.log(`\n表格提取完成，共找到 ${tables.length} 个表格`);
        return tables;
    }
    preprocessText(text) {
        // 清理文本，移除多余的空白字符
        return text
            .replace(/\r\n/g, '\n') // 统一换行符
            .replace(/\r/g, '\n') // 统一换行符
            .replace(/\f/g, '\n') // 替换换页符
            .replace(/[ \t]+/g, ' ') // 合并多个空格和制表符
            .replace(/\n\s*\n/g, '\n'); // 移除空行
    }
    tryAlternativeTableExtraction(lines) {
        const tables = [];
        console.log('\n=== 尝试替代表格识别方法 ===');
        // 方法1：查找包含数字和文本混合的行
        const potentialTableLines = [];
        console.log('方法1: 查找数字文本混合模式...');
        for (const line of lines) {
            const trimmed = line.trim();
            // 检查是否包含数字和文本的混合模式
            if (this.hasNumberTextPattern(trimmed)) {
                potentialTableLines.push(trimmed);
                console.log(`找到数字文本混合行: "${trimmed.substring(0, 50)}..."`);
            }
        }
        console.log(`数字文本混合行总数: ${potentialTableLines.length}`);
        if (potentialTableLines.length >= 3) {
            console.log('尝试将数字文本混合行解析为表格...');
            // 尝试解析为表格
            const tableData = this.parseTableData(potentialTableLines, 1, 0);
            if (tableData && tableData.rows.length > 0) {
                console.log('✓ 通过数字文本模式识别到表格');
                tables.push(tableData);
            }
            else {
                console.log('✗ 数字文本模式解析失败');
            }
        }
        else {
            console.log('数字文本混合行数量不足，跳过此方法');
        }
        return tables;
    }
    hasNumberTextPattern(line) {
        // 检查行是否包含数字和文本的混合模式，可能是表格数据
        const hasNumbers = /\d/.test(line);
        const hasText = /[a-zA-Z\u4e00-\u9fa5]/.test(line);
        const hasMultipleWords = line.split(/\s+/).length >= 2;
        return hasNumbers && hasText && hasMultipleWords && line.length >= 10;
    }
    isTableRow(line) {
        // 检测是否为表格行：包含多个由空格、制表符或特殊字符分隔的列
        const trimmedLine = line.trim();
        // 跳过空行和太短的行
        if (trimmedLine.length < 10) {
            console.log(`行太短，跳过: "${trimmedLine}" (长度: ${trimmedLine.length})`);
            return false;
        }
        // 检测常见的表格分隔符模式
        const separatorPatterns = [
            /\s{3,}/, // 3个或更多空格
            /\t+/, // 制表符
            /\|/, // 竖线分隔符
            /,\s+/, // 逗号后跟空格
            /;\s+/ // 分号后跟空格
        ];
        // 检查是否包含分隔符
        const hasSeperator = separatorPatterns.some(pattern => pattern.test(trimmedLine));
        if (!hasSeperator) {
            console.log(`未找到分隔符: "${trimmedLine.substring(0, 50)}..."`);
            return false;
        }
        // 分割并检查列数
        let columns = [];
        let usedPattern = null;
        for (const pattern of separatorPatterns) {
            const testColumns = trimmedLine.split(pattern).filter(col => col.trim().length > 0);
            if (testColumns.length >= 2) {
                columns = testColumns;
                usedPattern = pattern;
                break;
            }
        }
        // 检查是否有足够的列且列内容合理
        const isValid = columns.length >= 2 && columns.every(col => col.trim().length > 0 && col.trim().length < 100);
        if (isValid) {
            console.log(`识别为表格行 (${columns.length}列): "${trimmedLine.substring(0, 50)}..."`);
        }
        else {
            console.log(`不是表格行 (${columns.length}列): "${trimmedLine.substring(0, 50)}..."`);
        }
        return isValid;
    }
    parseTableData(tableLines, page, tableIndex) {
        if (tableLines.length < 2)
            return null;
        // 尝试不同的分隔符模式来解析表格
        const separatorPatterns = [
            /\s{3,}/, // 3个或更多空格
            /\t+/, // 制表符
            /\|/, // 竖线分隔符
            /,\s+/, // 逗号后跟空格
            /;\s+/ // 分号后跟空格
        ];
        let bestPattern = separatorPatterns[0];
        let maxColumns = 0;
        // 找到能产生最多列的分隔符模式
        for (const pattern of separatorPatterns) {
            const testHeaders = tableLines[0].split(pattern).filter(col => col.trim().length > 0);
            if (testHeaders.length > maxColumns) {
                maxColumns = testHeaders.length;
                bestPattern = pattern;
            }
        }
        // 解析表头
        const headerLine = tableLines[0];
        const headers = headerLine.split(bestPattern).filter(col => col.trim().length > 0).map(h => h.trim());
        if (headers.length < 2)
            return null;
        // 解析数据行
        const rows = [];
        for (let i = 1; i < tableLines.length; i++) {
            const rowData = tableLines[i].split(bestPattern).filter(col => col.trim().length > 0).map(cell => cell.trim());
            if (rowData.length > 0) {
                // 确保行数据与表头列数一致
                while (rowData.length < headers.length) {
                    rowData.push('');
                }
                rows.push(rowData.slice(0, headers.length));
            }
        }
        // 只有当有实际数据行时才返回表格
        if (rows.length === 0)
            return null;
        return {
            page,
            tableIndex,
            headers,
            rows
        };
    }
    async writeToExcel(tables, outputPath) {
        try {
            // 检查是否有表格数据
            if (tables.length === 0) {
                throw new Error('没有表格数据可以导出');
            }
            // 创建工作簿
            const workbook = XLSX.utils.book_new();
            // 为每个表格创建工作表
            tables.forEach((table, index) => {
                const sheetName = `Page${table.page}_Table${table.tableIndex + 1}`;
                // 准备数据，包括表头
                const data = [table.headers, ...table.rows];
                // 创建工作表
                const worksheet = XLSX.utils.aoa_to_sheet(data);
                // 添加到工作簿
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            });
            // 写入文件
            XLSX.writeFile(workbook, outputPath);
            console.log(`Excel文件已创建: ${outputPath}`);
        }
        catch (error) {
            console.error('创建Excel文件失败:', error);
            throw error;
        }
    }
}
exports.TableExtractService = TableExtractService;
//# sourceMappingURL=tableExtractService.js.map