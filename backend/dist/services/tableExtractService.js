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
const sharp_1 = __importDefault(require("sharp"));
class TableExtractService {
    async extractTables(options) {
        try {
            const { pdfPath, outputPath } = options;
            console.log('\n========================================');
            console.log('=== 开始表格提取流程 ===');
            console.log('========================================');
            console.log(`PDF文件路径: ${pdfPath}`);
            console.log(`输出文件路径: ${outputPath}`);
            // 检查PDF文件是否存在
            if (!fs.existsSync(pdfPath)) {
                console.error(`❌ 错误: PDF文件不存在: ${pdfPath}`);
                throw new Error(`PDF文件不存在: ${pdfPath}`);
            }
            const fileStats = fs.statSync(pdfPath);
            const fileSizeInMB = (fileStats.size / 1024 / 1024).toFixed(2);
            console.log(`PDF文件大小: ${fileSizeInMB} MB`);
            // 确保输出目录存在
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                console.log(`创建输出目录: ${outputDir}`);
            }
            // 读取PDF文件
            console.log('\n--- 准备阶段: 读取PDF文件 ---');
            console.log('正在读取PDF文件...');
            const dataBuffer = fs.readFileSync(pdfPath);
            console.log(`PDF数据缓冲区大小: ${(dataBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
            let tables = [];
            try {
                // 首先尝试使用pdf-parse提取文本内容
                console.log('\n=== 方法1: 使用pdf-parse提取文本 ===');
                console.log('开始pdf-parse解析...');
                const startTime = Date.now();
                const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
                const parseTime = Date.now() - startTime;
                console.log(`PDF解析耗时: ${parseTime}ms`);
                console.log(`PDF页数: ${pdfData.numpages}`);
                console.log(`提取的文本长度: ${pdfData.text.length} 字符`);
                console.log(`文本前200字符: ${pdfData.text.substring(0, 200)}`);
                if (pdfData.text.length === 0) {
                    console.log('⚠️ pdf-parse未提取到任何文本内容，可能是扫描件PDF');
                }
                else {
                    console.log('✓ pdf-parse成功提取文本，开始查找表格...');
                    // 从文本中识别表格结构
                    tables = await this.extractTablesFromText(pdfData.text, pdfData.numpages);
                    if (tables.length > 0) {
                        console.log(`✓ 通过pdf-parse找到 ${tables.length} 个表格`);
                    }
                    else {
                        console.log('✗ pdf-parse提取的文本中未识别到表格结构');
                    }
                }
            }
            catch (error) {
                console.log('✗ pdf-parse提取失败:', error.message);
            }
            // 如果pdf-parse没有找到表格，使用unpdf进行更强大的文本提取
            if (tables.length === 0) {
                try {
                    console.log('\n=== 方法2: 使用unpdf进行高级文本提取 ===');
                    console.log('开始unpdf提取...');
                    const startTime = Date.now();
                    const pdf = await (0, unpdf_1.getDocumentProxy)(new Uint8Array(dataBuffer));
                    const { totalPages, text } = await (0, unpdf_1.extractText)(pdf, { mergePages: true });
                    const unpdfTime = Date.now() - startTime;
                    console.log(`unpdf提取耗时: ${unpdfTime}ms`);
                    console.log(`unpdf提取完成，总页数: ${totalPages}，文本长度: ${text.length}`);
                    console.log(`unpdf文本前200字符: ${text.substring(0, 200)}`);
                    if (text && text.length > 0) {
                        console.log('✓ unpdf成功提取文本，开始查找表格...');
                        tables = await this.extractTablesFromText(text, totalPages);
                        if (tables.length > 0) {
                            console.log(`✓ 通过unpdf找到 ${tables.length} 个表格`);
                        }
                        else {
                            console.log('✗ unpdf提取的文本中未识别到表格结构');
                        }
                    }
                    else {
                        console.log('⚠️ unpdf未提取到任何文本内容');
                    }
                }
                catch (error) {
                    console.error('✗ unpdf提取失败:', error.message);
                }
            }
            // 如果仍然没有找到表格，尝试OCR识别
            if (tables.length === 0) {
                try {
                    console.log('\n=== 方法3: 使用OCR识别扫描件PDF ===');
                    console.log('前两种方法未找到表格，开始OCR识别流程...');
                    const ocrTables = await this.extractTablesWithOCR(pdfPath);
                    tables.push(...ocrTables);
                    if (tables.length > 0) {
                        console.log(`✓ 通过OCR识别找到 ${tables.length} 个表格`);
                    }
                    else {
                        console.log('✗ OCR识别未找到表格');
                    }
                }
                catch (ocrError) {
                    console.error('✗ OCR识别失败:', ocrError.message);
                    console.log('\n=== 诊断信息 ===');
                    console.log('所有方法都未能找到表格数据，可能的原因：');
                    console.log('1. PDF是扫描件且OCR识别失败');
                    console.log('2. 表格格式不规范或过于复杂');
                    console.log('3. 文档中确实没有表格');
                    console.log('4. Tesseract OCR未正确安装或配置');
                    console.log('建议：请使用包含可选择文本的PDF文件或清晰的扫描件');
                }
            }
            // 只有当找到表格时才写入Excel文件
            if (tables.length > 0) {
                console.log('\n=== 写入Excel文件 ===');
                console.log(`✓ 找到 ${tables.length} 个表格，准备写入Excel...`);
                console.log(`输出路径: ${outputPath}`);
                // 打印表格统计信息
                console.log('\n表格统计:');
                tables.forEach((table, index) => {
                    console.log(`- 表格${index + 1} (页${table.page}): ${table.headers.length}列 x ${table.rows.length}行`);
                    console.log(`  表头: ${JSON.stringify(table.headers).substring(0, 100)}${table.headers.length > 5 ? '...' : ''}`);
                    if (table.rows.length > 0) {
                        console.log(`  首行数据: ${JSON.stringify(table.rows[0]).substring(0, 100)}${table.rows[0].length > 5 ? '...' : ''}`);
                    }
                });
                await this.writeToExcel(tables, outputPath);
                console.log(`\n✓ 成功写入Excel文件: ${outputPath}`);
            }
            else {
                console.log('\n=== 提取结果 ===');
                console.log('❌ 未找到任何表格数据，不生成Excel文件');
            }
            console.log(`\n========================================`);
            console.log(`=== 表格提取完成 ===`);
            console.log(`总共找到 ${tables.length} 个表格`);
            console.log(`========================================`);
            return tables;
        }
        catch (error) {
            console.error('\n========================================');
            console.error('=== 表格提取流程异常 ===');
            console.error('========================================');
            console.error(`错误类型: ${error.constructor.name}`);
            console.error(`错误信息: ${error.message}`);
            console.error(`错误堆栈: ${error.stack}`);
            // 提供诊断信息
            console.error('\n诊断信息:');
            console.error('1. 检查PDF文件是否存在且可读');
            console.error('2. 检查PDF是否包含可提取的文本或表格');
            console.error('3. 对于扫描件，确保Tesseract OCR已正确安装');
            console.error('4. 检查是否有足够的磁盘空间用于临时文件');
            console.error('5. 确保输出目录有写入权限');
            console.error('========================================');
            throw error;
        }
    }
    async extractTablesWithOCR(pdfPath) {
        const tables = [];
        try {
            console.log('\n--- OCR处理开始 ---');
            // 配置pdf2pic选项 - 针对扫描件表格优化
            const tempImagesPath = path.join(path.dirname(pdfPath), 'temp_images');
            console.log(`临时图片目录: ${tempImagesPath}`);
            const convert = (0, pdf2pic_1.fromPath)(pdfPath, {
                density: 400, // 提高DPI到400，更好的OCR识别效果
                saveFilename: "page",
                savePath: tempImagesPath,
                format: "png",
                width: 2400, // 增加图片宽度
                height: 3200, // 增加图片高度，适应A4比例
                quality: 100 // 最高质量
            });
            console.log('PDF转图片配置:');
            console.log(`- DPI: 400`);
            console.log(`- 尺寸: 2400x3200`);
            console.log(`- 格式: PNG`);
            console.log(`- 质量: 100%`);
            // 转换PDF的所有页面为图片
            console.log('\n正在将PDF转换为图片...');
            const startTime = Date.now();
            const results = await convert.bulk(-1, { responseType: "buffer" });
            const conversionTime = Date.now() - startTime;
            console.log(`PDF转换完成，耗时: ${conversionTime}ms`);
            console.log(`转换结果数量: ${results.length} 页`);
            if (results.length === 0) {
                console.log('⚠️ PDF转换未产生任何图片');
                return tables;
            }
            // 配置Tesseract OCR选项 - 针对扫描件表格优化
            const ocrConfig = {
                lang: "eng+chi_sim+chi_tra", // 支持英文、简体中文和繁体中文
                oem: 1, // OCR引擎模式：神经网络LSTM引擎
                psm: 6, // 页面分割模式：统一的文本块
                tessedit_char_whitelist: undefined, // 不限制字符
                // 针对表格优化的额外配置
                tessedit_pageseg_mode: 6,
                preserve_interword_spaces: 1, // 保持单词间空格
                tessedit_create_hocr: 0, // 不创建HOCR输出
                tessedit_create_tsv: 0, // 不创建TSV输出
                // 针对扫描件的额外优化配置
                tessedit_ocr_engine_mode: 1, // LSTM引擎
                textord_really_old_xheight: 1, // 改善字符高度检测
                textord_min_linesize: 2.5, // 最小行高
                user_defined_dpi: 300, // 设置DPI
                tessedit_char_blacklist: '', // 不黑名单任何字符
                load_system_dawg: 0, // 不加载系统词典
                load_freq_dawg: 0, // 不加载频率词典
                load_unambig_dawg: 0, // 不加载无歧义词典
                load_punc_dawg: 0, // 不加载标点词典
                load_number_dawg: 0, // 不加载数字词典
                load_bigram_dawg: 0 // 不加载双字母词典
            };
            // 配置图像处理 - 使用Sharp替代ImageMagick
            console.log('图像处理配置:');
            console.log('- 使用Sharp进行图像预处理');
            console.log('- 自动处理架构兼容性');
            console.log('- 高性能图像处理库');
            // Sharp配置选项
            const sharpOptions = {
                // 提高图像质量以便OCR识别
                density: 300,
                // 转换为灰度图像
                greyscale: true,
                // 增强对比度
                normalize: true
            };
            console.log('Sharp配置:');
            console.log(`- 密度: ${sharpOptions.density} DPI`);
            console.log(`- 灰度处理: ${sharpOptions.greyscale}`);
            console.log(`- 对比度增强: ${sharpOptions.normalize}`);
            console.log('\nTesseract OCR配置:');
            console.log(`- 语言: ${ocrConfig.lang}`);
            console.log(`- 引擎模式: ${ocrConfig.oem}`);
            console.log(`- 页面分割模式: ${ocrConfig.psm}`);
            console.log(`- 保持空格: ${ocrConfig.preserve_interword_spaces}`);
            let totalOcrTime = 0;
            let totalPreprocessTime = 0;
            let successfulPages = 0;
            // 对每个页面进行OCR识别
            console.log('\n开始逐页OCR识别...');
            for (let i = 0; i < results.length; i++) {
                const pageResult = results[i];
                console.log(`\n--- 处理第 ${i + 1}/${results.length} 页 ---`);
                try {
                    // 检查buffer是否存在
                    if (!pageResult.buffer) {
                        console.warn(`⚠️ 第 ${i + 1} 页没有有效的图片buffer`);
                        continue;
                    }
                    console.log(`图片buffer大小: ${pageResult.buffer.length} 字节`);
                    // 使用Sharp进行图像预处理以提高OCR效果
                    console.log(`开始Sharp图像预处理第 ${i + 1} 页...`);
                    const preprocessStart = Date.now();
                    // 针对扫描版PDF优化的图像预处理
                    const processedImageBuffer = await (0, sharp_1.default)(pageResult.buffer)
                        .resize({ width: 2480, height: 3508, fit: 'inside', withoutEnlargement: false }) // 放大到A4尺寸300DPI
                        .greyscale() // 转为灰度图像
                        .gamma(1.2) // 调整伽马值增强对比度
                        .normalize() // 标准化亮度
                        .linear(1.2, -(128 * 0.2)) // 线性变换增强对比度
                        .sharpen({ sigma: 1, m1: 0.5, m2: 2, x1: 2, y2: 10, y3: 20 }) // 精细锐化
                        .median(3) // 中值滤波去噪
                        .threshold(128) // 二值化处理
                        .png({ quality: 100, compressionLevel: 0 }) // 无损PNG输出
                        .toBuffer();
                    const preprocessTime = Date.now() - preprocessStart;
                    totalPreprocessTime += preprocessTime;
                    console.log(`Sharp预处理完成，耗时: ${preprocessTime}ms`);
                    console.log(`处理后图片大小: ${processedImageBuffer.length} 字节`);
                    // 使用Tesseract进行OCR识别
                    console.log(`开始OCR识别第 ${i + 1} 页...`);
                    const pageOcrStart = Date.now();
                    const ocrText = await node_tesseract_ocr_1.default.recognize(processedImageBuffer, ocrConfig);
                    const pageOcrTime = Date.now() - pageOcrStart;
                    totalOcrTime += pageOcrTime;
                    console.log(`第 ${i + 1} 页OCR识别完成，耗时: ${pageOcrTime}ms`);
                    if (ocrText && ocrText.trim().length > 0) {
                        console.log(`✓ 识别文本长度: ${ocrText.length} 字符`);
                        console.log(`文本前200字符: ${ocrText.substring(0, 200)}`);
                        successfulPages++;
                        // 从OCR文本中提取表格
                        console.log(`开始从第 ${i + 1} 页文本中提取表格...`);
                        const pageTables = await this.extractTablesFromText(ocrText, 1);
                        if (pageTables.length > 0) {
                            console.log(`✓ 第 ${i + 1} 页找到 ${pageTables.length} 个表格`);
                            // 更新页码信息
                            pageTables.forEach(table => {
                                table.page = i + 1;
                                table.tableIndex = tables.length;
                                tables.push(table);
                            });
                        }
                        else {
                            console.log(`✗ 第 ${i + 1} 页未识别到表格结构`);
                        }
                    }
                    else {
                        console.log(`⚠️ 第 ${i + 1} 页OCR未识别到任何文本`);
                    }
                }
                catch (pageOcrError) {
                    console.error(`✗ 第 ${i + 1} 页OCR识别失败:`, pageOcrError.message);
                }
            }
            console.log('\n--- OCR识别统计 ---');
            console.log(`总页数: ${results.length}`);
            console.log(`成功识别页数: ${successfulPages}`);
            console.log(`总Sharp预处理耗时: ${totalPreprocessTime}ms`);
            console.log(`总OCR耗时: ${totalOcrTime}ms`);
            console.log(`平均每页预处理耗时: ${successfulPages > 0 ? Math.round(totalPreprocessTime / successfulPages) : 0}ms`);
            console.log(`平均每页OCR耗时: ${successfulPages > 0 ? Math.round(totalOcrTime / successfulPages) : 0}ms`);
            console.log(`总处理耗时: ${totalPreprocessTime + totalOcrTime}ms`);
            // 清理临时图片文件
            console.log('\n清理临时文件...');
            const tempDir = path.join(path.dirname(pdfPath), 'temp_images');
            if (fs.existsSync(tempDir)) {
                try {
                    const tempFiles = fs.readdirSync(tempDir);
                    console.log(`临时目录包含 ${tempFiles.length} 个文件`);
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    console.log('✓ 临时图片文件已清理');
                }
                catch (cleanupError) {
                    console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
                }
            }
            else {
                console.log('临时目录不存在，无需清理');
            }
        }
        catch (error) {
            console.error('\n=== OCR处理异常 ===');
            console.error('错误类型:', error.constructor.name);
            console.error('错误信息:', error.message);
            if (error.message.includes('tesseract')) {
                console.error('\n可能的解决方案:');
                console.error('1. 检查Tesseract是否已安装: tesseract --version');
                console.error('2. 安装中文语言包: brew install tesseract-lang (macOS)');
                console.error('3. 检查语言包路径配置');
            }
            throw error;
        }
        console.log(`\n--- OCR处理完成，共找到 ${tables.length} 个表格 ---`);
        return tables;
    }
    async extractTablesFromText(text, pageCount) {
        console.log(`\n--- 开始从文本中提取表格 ---`);
        console.log(`文本总长度: ${text.length} 字符`);
        console.log(`PDF总页数: ${pageCount}`);
        const tables = [];
        // 清理和预处理文本
        const cleanedText = this.preprocessText(text);
        const lines = cleanedText.split('\n').filter(line => line.trim().length > 0);
        console.log(`处理后的有效行数: ${lines.length}`);
        console.log('原始文本前500字符:', text.substring(0, 500));
        console.log('清理后文本前500字符:', cleanedText.substring(0, 500));
        console.log(`前10行内容:`);
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            console.log(`  ${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
        }
        // 增加文本内容分析
        console.log(`\n=== 文本内容分析 ===`);
        const hasNumbers = /\d/.test(text);
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        const hasEnglish = /[a-zA-Z]/.test(text);
        const hasCommas = /,/.test(text);
        const hasTabs = /\t/.test(text);
        const hasMultipleSpaces = /\s{2,}/.test(text);
        const hasPipes = /\|/.test(text);
        console.log(`包含数字: ${hasNumbers}`);
        console.log(`包含中文: ${hasChinese}`);
        console.log(`包含英文: ${hasEnglish}`);
        console.log(`包含逗号: ${hasCommas}`);
        console.log(`包含制表符: ${hasTabs}`);
        console.log(`包含多空格: ${hasMultipleSpaces}`);
        console.log(`包含竖线: ${hasPipes}`);
        // 查找可能的表格模式
        let currentTable = [];
        let tableIndex = 0;
        let currentPage = 1;
        let consecutiveNonTableLines = 0;
        let potentialTableLines = 0;
        let tableCount = 0;
        console.log(`\n开始逐行分析表格模式...`);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            console.log(`\n分析第 ${i + 1}/${lines.length} 行: "${line.substring(0, 80)}..."`);
            // 检测表格行
            if (this.isTableRow(line)) {
                potentialTableLines++;
                if (currentTable.length === 0) {
                    tableCount++;
                    console.log(`\n✓ 第 ${i + 1} 行发现表格${tableCount}开始:`);
                    console.log(`  内容: ${line}`);
                }
                currentTable.push(line);
                consecutiveNonTableLines = 0;
                console.log(`✓ 检测到表格行 (当前表格累计: ${currentTable.length} 行)`);
            }
            else {
                consecutiveNonTableLines++;
                console.log(`✗ 非表格行 (连续非表格行: ${consecutiveNonTableLines})`);
                // 如果连续遇到多行非表格内容，认为表格结束
                if (consecutiveNonTableLines >= 2 && currentTable.length >= 2) {
                    console.log(`\n表格${tableCount}在第 ${i} 行结束，共 ${currentTable.length} 行`);
                    console.log(`表格内容预览:`);
                    for (let j = 0; j < Math.min(3, currentTable.length); j++) {
                        console.log(`  行${j + 1}: ${currentTable[j]}`);
                    }
                    const tableData = this.parseTableData(currentTable, currentPage, tableIndex);
                    if (tableData) {
                        console.log(`✓ 成功解析表格${tableCount}: ${tableData.headers.length}列 x ${tableData.rows.length}行`);
                        tables.push(tableData);
                        tableIndex++;
                    }
                    else {
                        console.log(`✗ 表格${tableCount}解析失败`);
                    }
                    currentTable = [];
                    consecutiveNonTableLines = 0;
                }
                else if (consecutiveNonTableLines >= 2 && currentTable.length < 2) {
                    if (currentTable.length > 0) {
                        console.log(`✗ 表格${tableCount}行数不足(${currentTable.length}行)，忽略`);
                    }
                    currentTable = [];
                }
            }
        }
        // 处理最后一个表格
        if (currentTable.length >= 2) {
            console.log(`\n文本末尾表格${tableCount}结束，共 ${currentTable.length} 行`);
            const tableData = this.parseTableData(currentTable, currentPage, tableIndex);
            if (tableData) {
                console.log(`✓ 成功解析末尾表格: ${tableData.headers.length}列 x ${tableData.rows.length}行`);
                tables.push(tableData);
            }
            else {
                console.log(`✗ 最后一个表格解析失败`);
            }
        }
        console.log(`\n=== 表格识别统计 ===`);
        console.log(`总行数: ${lines.length}`);
        console.log(`潜在表格行数: ${potentialTableLines}`);
        console.log(`发现表格候选: ${tableCount}`);
        console.log(`成功提取表格: ${tables.length}`);
        // 如果没有找到表格，尝试其他方法
        if (tables.length === 0) {
            console.log('\n未检测到标准表格结构，尝试其他识别方法...');
            const alternativeTables = this.tryAlternativeTableExtraction(lines);
            if (alternativeTables.length > 0) {
                console.log(`通过替代方法找到 ${alternativeTables.length} 个表格`);
            }
            tables.push(...alternativeTables);
            console.log(`\n⚠️ 未找到表格的可能原因:`);
            console.log(`1. 文本中没有符合表格模式的行`);
            console.log(`2. 表格分隔符不被识别`);
            console.log(`3. 表格行数不足(需要至少2行)`);
            console.log(`4. 可能是扫描件，需要OCR处理`);
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
        // 方法2：针对扫描件的序号模式识别
        if (tables.length === 0) {
            console.log('\n方法2: 查找序号模式...');
            const sequentialLines = this.findSequentialPattern(lines);
            if (sequentialLines.length >= 3) {
                console.log(`找到 ${sequentialLines.length} 行序号模式数据`);
                const tableData = this.parseTableData(sequentialLines, 1, 0);
                if (tableData && tableData.rows.length > 0) {
                    console.log('✓ 通过序号模式识别到表格');
                    tables.push(tableData);
                }
            }
        }
        // 方法3：基于关键词的表格识别（如"合计"、"总计"等）
        if (tables.length === 0) {
            console.log('\n方法3: 基于关键词的表格识别...');
            const keywordBasedLines = this.findKeywordBasedTable(lines);
            if (keywordBasedLines.length >= 2) {
                console.log(`找到 ${keywordBasedLines.length} 行关键词相关数据`);
                const tableData = this.parseTableData(keywordBasedLines, 1, 0);
                if (tableData && tableData.rows.length > 0) {
                    console.log('✓ 通过关键词模式识别到表格');
                    tables.push(tableData);
                }
            }
        }
        return tables;
    }
    // 新增：查找序号模式的行
    findSequentialPattern(lines) {
        const sequentialLines = [];
        let expectedNumber = 1;
        for (const line of lines) {
            const trimmed = line.trim();
            // 检查是否以期望的序号开始
            const startsWithNumber = new RegExp(`^${expectedNumber}[\s\u4e00-\u9fa5]`);
            if (startsWithNumber.test(trimmed) && trimmed.length > 10) {
                sequentialLines.push(trimmed);
                expectedNumber++;
                console.log(`找到序号 ${expectedNumber - 1}: "${trimmed.substring(0, 50)}..."`);
            }
        }
        return sequentialLines;
    }
    // 新增：基于关键词查找表格
    findKeywordBasedTable(lines) {
        const tableLines = [];
        const keywords = ['合计', '总计', '小计', '序号', '户名', '账号', '金额', '余额', '支出', '收入'];
        let inTableSection = false;
        let headerFound = false;
        for (const line of lines) {
            const trimmed = line.trim();
            // 检查是否包含表格关键词
            const hasKeyword = keywords.some(keyword => trimmed.includes(keyword));
            if (hasKeyword && !headerFound) {
                // 可能是表头
                tableLines.push(trimmed);
                headerFound = true;
                inTableSection = true;
                console.log(`找到可能的表头: "${trimmed.substring(0, 50)}..."`);
            }
            else if (inTableSection && this.hasNumberTextPattern(trimmed)) {
                // 在表格区域内且符合数字文本模式
                tableLines.push(trimmed);
                console.log(`添加表格行: "${trimmed.substring(0, 50)}..."`);
            }
            else if (inTableSection && trimmed.length < 5) {
                // 遇到空行或短行，可能表格结束
                break;
            }
        }
        return tableLines;
    }
    hasNumberTextPattern(line) {
        // 检查行是否包含数字和文本的混合模式，可能是表格数据
        const hasNumbers = /\d/.test(line);
        const hasText = /[a-zA-Z\u4e00-\u9fa5]/.test(line);
        const hasMultipleWords = line.split(/\s+/).length >= 2;
        // 针对扫描件的额外检查
        const hasChineseNumbers = /[一二三四五六七八九十百千万亿]/.test(line); // 中文数字
        const hasAccountNumber = /\d{10,}/.test(line); // 长数字（如账号）
        const hasAmount = /\d+\.\d{2}/.test(line); // 金额格式
        const hasPercentage = /\d+%/.test(line); // 百分比
        return (hasNumbers || hasChineseNumbers || hasAccountNumber) &&
            hasText &&
            (hasMultipleWords || hasAmount || hasPercentage) &&
            line.length >= 8;
    }
    // 新增：智能分割表格行的方法 - 针对扫描件优化
    smartSplitTableRow(line) {
        const trimmedLine = line.trim();
        console.log(`智能分割输入: "${trimmedLine}"`);
        // 预定义的表格模式
        const tablePatterns = [
            // 模式1：序号 + 中文名称 + 数字/账号 + 金额
            {
                name: '序号+名称+账号+金额',
                pattern: /^(\d+)\s*([\u4e00-\u9fa5]+.*?)\s+(\d{8,})\s+([\d.,]+)$/,
                extract: (match) => [match[1], match[2].trim(), match[3], match[4]]
            },
            // 模式2：序号 + 名称 + 多个数值
            {
                name: '序号+名称+数值',
                pattern: /^(\d+)\s*([\u4e00-\u9fa5]+.*?)\s+([\d.,]+(?:\s+[\d.,]+)*)$/,
                extract: (match) => {
                    const numbers = match[3].split(/\s+/).filter(n => n.trim());
                    return [match[1], match[2].trim(), ...numbers];
                }
            },
            // 模式3：名称 + 冒号 + 数值
            {
                name: '名称+冒号+数值',
                pattern: /^([\u4e00-\u9fa5]+.*?)[：:]\s*([\d.,]+(?:\s+[\d.,]+)*)$/,
                extract: (match) => {
                    const numbers = match[2].split(/\s+/).filter(n => n.trim());
                    return [match[1].trim(), ...numbers];
                }
            },
            // 模式4：日期 + 描述 + 金额
            {
                name: '日期+描述+金额',
                pattern: /^(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}|\d{1,2}[-\/月]\d{1,2})\s+([\u4e00-\u9fa5]+.*?)\s+([\d.,]+)$/,
                extract: (match) => [match[1], match[2].trim(), match[3]]
            },
            // 模式5：编号 + 名称 + 数值
            {
                name: '编号+名称+数值',
                pattern: /^([a-zA-Z0-9-_]+)\s+([\u4e00-\u9fa5]+.*?)\s+([\d.,]+)$/,
                extract: (match) => [match[1], match[2].trim(), match[3]]
            }
        ];
        // 尝试匹配预定义模式
        for (const { name, pattern, extract } of tablePatterns) {
            const match = trimmedLine.match(pattern);
            if (match) {
                const result = extract(match);
                console.log(`✓ 匹配模式 [${name}]: ${result.length}列`);
                console.log(`  结果: ${result.map(r => `"${r}"`).join(', ')}`);
                return result;
            }
        }
        console.log(`未匹配预定义模式，使用通用分割...`);
        // 通用智能分割算法
        const parts = trimmedLine.split(/\s+/);
        console.log(`空格分割得到 ${parts.length} 部分: ${parts.map(p => `"${p}"`).join(', ')}`);
        if (parts.length >= 3) {
            // 合并策略：将连续的中文部分合并
            const merged = [];
            let currentGroup = '';
            let groupType = ''; // 'chinese', 'number', 'english', 'mixed'
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                let partType = '';
                if (/^[\u4e00-\u9fa5]+$/.test(part)) {
                    partType = 'chinese';
                }
                else if (/^\d+([.,]\d+)*$/.test(part)) {
                    partType = 'number';
                }
                else if (/^[a-zA-Z]+$/.test(part)) {
                    partType = 'english';
                }
                else {
                    partType = 'mixed';
                }
                // 合并相同类型的连续部分（除了数字）
                if (partType === groupType && partType === 'chinese') {
                    currentGroup += ' ' + part;
                }
                else {
                    if (currentGroup) {
                        merged.push(currentGroup);
                    }
                    currentGroup = part;
                    groupType = partType;
                }
            }
            if (currentGroup) {
                merged.push(currentGroup);
            }
            console.log(`合并后得到 ${merged.length} 列: ${merged.map(m => `"${m}"`).join(', ')}`);
            return merged.filter(p => p.trim().length > 0);
        }
        // 如果空格分割效果不好，尝试其他分割方式
        const alternativeSeparators = [/[,，]/g, /[;；]/g, /[|｜]/g, /[\t]/g];
        for (const separator of alternativeSeparators) {
            const altParts = trimmedLine.split(separator).filter(p => p.trim().length > 0);
            if (altParts.length >= 2) {
                console.log(`使用替代分隔符分割得到 ${altParts.length} 列`);
                return altParts.map(p => p.trim());
            }
        }
        console.log(`智能分割失败，返回原始分割结果`);
        return parts.filter(p => p.trim().length > 0);
    }
    isTableRow(line) {
        const originalLine = line;
        const trimmedLine = line.trim();
        console.log(`\n--- 分析行: "${trimmedLine.substring(0, 60)}${trimmedLine.length > 60 ? '...' : ''}" ---`);
        // 跳过空行和太短的行
        if (trimmedLine.length < 5) { // 降低最小长度要求，适应扫描件
            console.log(`✗ 行太短，跳过: "${trimmedLine}" (长度: ${trimmedLine.length})`);
            return false;
        }
        console.log(`行长度: ${trimmedLine.length}`);
        // 扩展的分隔符模式 - 针对扫描件优化
        const separatorPatterns = [
            { name: '多空格', pattern: /\s{2,}/ },
            { name: '制表符', pattern: /\t+/ },
            { name: '竖线', pattern: /\|/ },
            { name: '逗号分号', pattern: /[,;](?!\s)/ },
            { name: '数字间空格', pattern: /(?<=\d)\s+(?=\d)/ },
            { name: '中文数字', pattern: /(?<=[\u4e00-\u9fa5])\s+(?=\d)/ },
            { name: '小数空格', pattern: /(?<=\d\.\d)\s+/ },
            // 扫描件特有模式
            { name: '数字后空格', pattern: /\d+\s+/ },
            { name: '中文后空格', pattern: /[\u4e00-\u9fa5]+\s+/ },
            { name: '字母后空格', pattern: /[a-zA-Z]+\s+/ },
            { name: '空格数字', pattern: /\s+\d+/ },
            { name: '空格中文', pattern: /\s+[\u4e00-\u9fa5]+/ },
            { name: '空格字母', pattern: /\s+[a-zA-Z]+/ },
            { name: '字符间隔', pattern: /(?<=.)\s{1,}(?=.)/ }, // 更宽松的空格匹配
        ];
        // 检查是否包含分隔符
        let matchedSeparators = [];
        const hasSeparator = separatorPatterns.some(({ name, pattern }) => {
            if (pattern.test(trimmedLine)) {
                matchedSeparators.push(name);
                return true;
            }
            return false;
        });
        console.log(`分隔符检测结果: ${matchedSeparators.length > 0 ? matchedSeparators.join(', ') : '无'}`);
        // 扫描件特殊模式检查
        const specialPatterns = [
            { name: '序号模式', pattern: /^\d+[\s\u4e00-\u9fa5]+.*\d/, description: '行首数字+空格+中文+数字' },
            { name: '表格项目', pattern: /^[\u4e00-\u9fa5]{2,}[：:]+/, description: '中文标题+冒号' },
            { name: '数字序列', pattern: /\d+([.,，、]\d+)+/, description: '多个数字序列' },
            { name: '金额模式', pattern: /\d+([.,]\d{2})/, description: '金额格式' },
            { name: '日期模式', pattern: /(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}|\d{1,2}[-\/月]\d{1,2}[-\/日])/, description: '日期格式' },
            { name: '百分比', pattern: /\d+([.,]\d+)?\s*[%％]/, description: '百分比格式' },
            { name: '编号模式', pattern: /[a-zA-Z0-9]{2,}[-_][a-zA-Z0-9]{2,}/, description: '编号格式' },
        ];
        // 检查特殊模式
        let matchedSpecialPatterns = [];
        const hasSpecialPattern = specialPatterns.some(({ name, pattern }) => {
            if (pattern.test(trimmedLine)) {
                matchedSpecialPatterns.push(name);
                return true;
            }
            return false;
        });
        console.log(`特殊模式检测结果: ${matchedSpecialPatterns.length > 0 ? matchedSpecialPatterns.join(', ') : '无'}`);
        // 如果没有常规分隔符但有特殊模式，也视为表格行
        if (!hasSeparator && hasSpecialPattern) {
            console.log(`✓ 特殊模式匹配 [${matchedSpecialPatterns.join(', ')}]，判定为表格行`);
            return true;
        }
        else if (!hasSeparator && !hasSpecialPattern) {
            console.log(`✗ 未找到分隔符且不符合特殊模式，判定为非表格行`);
            return false;
        }
        console.log(`✓ 检测到分隔符 [${matchedSeparators.join(', ')}]`);
        // 尝试分割行
        let columns = [];
        let bestSeparator = '';
        console.log(`开始尝试各种分隔符...`);
        for (const { name, pattern } of separatorPatterns) {
            if (pattern.test(trimmedLine)) {
                const testColumns = trimmedLine.split(pattern).filter(col => col.trim().length > 0);
                console.log(`  ${name}: 分割出${testColumns.length}列`);
                if (testColumns.length > columns.length) {
                    columns = testColumns;
                    bestSeparator = name;
                }
            }
            else {
                console.log(`  ${name}: 不匹配`);
            }
        }
        console.log(`最佳分隔符: [${bestSeparator}], 产生${columns.length}列`);
        // 如果常规分隔符不行，尝试智能分割
        if (columns.length < 2) {
            console.log(`列数不足，尝试智能分割...`);
            const smartColumns = this.smartSplitTableRow(trimmedLine);
            console.log(`智能分割产生${smartColumns.length}列`);
            if (smartColumns.length >= 2) {
                columns = smartColumns;
                bestSeparator = '智能分割';
            }
        }
        // 显示分割结果
        if (columns.length > 0) {
            console.log(`分割结果预览:`);
            columns.slice(0, 3).forEach((col, index) => {
                console.log(`  列${index + 1}: "${col.substring(0, 20)}${col.length > 20 ? '...' : ''}"`);
            });
        }
        // 检查是否有足够的列且列内容合理
        const hasEnoughColumns = columns.length >= 2;
        const hasValidContent = columns.every(col => col.trim().length > 0 && col.trim().length < 200); // 增加长度限制
        // 检查是否包含数字和文本的混合模式（表格特征）
        const hasPattern = this.hasNumberTextPattern(trimmedLine);
        console.log(`数字文本模式检查: ${hasPattern ? '✓' : '✗'}`);
        // 放宽判断条件，只要有足够的列或符合数字文本模式即可
        const isValid = (hasEnoughColumns && hasValidContent) || (hasPattern && columns.length > 0);
        console.log(`最终判断:`);
        console.log(`  列数足够(>=2): ${hasEnoughColumns} (${columns.length}列)`);
        console.log(`  内容有效: ${hasValidContent}`);
        console.log(`  数字文本模式: ${hasPattern}`);
        if (isValid) {
            console.log(`✓ 最终判定为表格行`);
        }
        else {
            console.log(`✗ 最终判定为非表格行`);
        }
        return isValid;
    }
    parseTableData(tableLines, page, tableIndex) {
        if (tableLines.length < 2)
            return null;
        // 针对扫描件优化的分隔符模式
        const separatorPatterns = [
            /\s{2,}/, // 2个或更多空格
            /\t+/, // 制表符
            /\|/, // 竖线分隔符
            /,\s*/, // 逗号分隔
            /;\s*/, // 分号分隔
            /\s+\d+\s+/, // 数字前后的空格模式
            /[\u4e00-\u9fa5]+\s+\d/, // 中文后跟数字的模式
            /\d+\.\d+\s+/ // 小数后跟空格的模式
        ];
        let bestPattern = separatorPatterns[0];
        let maxColumns = 0;
        let bestHeaders = [];
        // 找到能产生最多列的分隔符模式
        for (const pattern of separatorPatterns) {
            const testHeaders = tableLines[0].split(pattern).filter(col => col.trim().length > 0);
            if (testHeaders.length > maxColumns) {
                maxColumns = testHeaders.length;
                bestPattern = pattern;
                bestHeaders = testHeaders;
            }
        }
        // 如果常规分隔符不行，使用智能分割
        if (maxColumns < 2) {
            bestHeaders = this.smartSplitTableRow(tableLines[0]);
            maxColumns = bestHeaders.length;
        }
        // 解析表头
        const headers = bestHeaders.map(h => h.trim()).filter(h => h.length > 0);
        if (headers.length < 2)
            return null;
        // 解析数据行
        const rows = [];
        for (let i = 1; i < tableLines.length; i++) {
            let rowData;
            // 尝试使用最佳分隔符模式
            if (maxColumns >= 2 && bestPattern) {
                rowData = tableLines[i].split(bestPattern).filter(col => col.trim().length > 0).map(cell => cell.trim());
            }
            else {
                // 使用智能分割
                rowData = this.smartSplitTableRow(tableLines[i]);
            }
            if (rowData.length > 0) {
                // 确保行数据与表头列数一致
                while (rowData.length < headers.length) {
                    rowData.push('');
                }
                // 如果行数据过多，截取到表头长度
                if (rowData.length > headers.length) {
                    rowData = rowData.slice(0, headers.length);
                }
                rows.push(rowData);
            }
        }
        // 只有当有实际数据行时才返回表格
        if (rows.length === 0)
            return null;
        // 后处理：清理和验证数据
        const cleanedRows = this.cleanTableRows(rows, headers.length);
        return {
            page,
            tableIndex,
            headers,
            rows: cleanedRows
        };
    }
    // 新增：清理表格行数据
    cleanTableRows(rows, expectedColumns) {
        return rows.filter(row => {
            // 过滤掉空行或无效行
            const nonEmptyColumns = row.filter(cell => cell.trim().length > 0).length;
            return nonEmptyColumns >= Math.min(2, expectedColumns * 0.5); // 至少有一半的列有数据
        }).map(row => {
            // 清理每个单元格的数据
            return row.map(cell => {
                return cell.trim()
                    .replace(/\s+/g, ' ') // 合并多个空格
                    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽字符
                    .trim();
            });
        });
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