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
const tesseract_js_1 = require("tesseract.js");
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
            console.log(`扫描件PDF路径: ${pdfPath}`);
            // 检查PDF文件是否存在
            if (!fs.existsSync(pdfPath)) {
                console.error('❌ 错误: 扫描件PDF文件不存在');
                throw new Error(`扫描件PDF文件不存在: ${pdfPath}`);
            }
            // 配置pdf2pic选项 - 针对扫描件表格优化
            const tempImagesPath = path.join(path.dirname(pdfPath), 'temp_images');
            console.log(`临时图片目录: ${tempImagesPath}`);
            console.log('检查临时目录权限...');
            // 确保临时目录存在且有写入权限
            try {
                if (!fs.existsSync(tempImagesPath)) {
                    fs.mkdirSync(tempImagesPath, { recursive: true });
                    console.log('✓ 临时目录创建成功');
                }
                // 测试写入权限
                const testFile = path.join(tempImagesPath, 'test_permission.txt');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                console.log('✓ 临时目录写入权限验证通过');
            }
            catch (err) {
                console.error('❌ 临时目录权限错误:', err.message);
                throw new Error(`无法写入临时目录: ${tempImagesPath}`);
            }
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
            // 创建Tesseract.js Worker - 针对扫描件表格优化
            console.log('初始化Tesseract.js Worker...');
            const worker = await (0, tesseract_js_1.createWorker)('chi_sim+eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR进度: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            // 配置Tesseract.js参数 - 针对表格优化
            await worker.setParameters({
                tessedit_pageseg_mode: tesseract_js_1.PSM.SINGLE_BLOCK, // PSM 6: 统一的文本块
                preserve_interword_spaces: '1', // 保持单词间空格
                tessedit_char_whitelist: '', // 不限制字符
                tessedit_char_blacklist: '', // 不黑名单字符
                user_defined_dpi: '300', // 设置DPI
                textord_min_linesize: '2.5', // 最小行高
                textord_really_old_xheight: '1', // 改善字符高度检测
                load_system_dawg: '0', // 不加载系统词典
                load_freq_dawg: '0', // 不加载频率词典
                load_unambig_dawg: '0', // 不加载无歧义词典
                load_punc_dawg: '0', // 不加载标点词典
                load_number_dawg: '0', // 不加载数字词典
                load_bigram_dawg: '0' // 不加载双字母词典
            });
            console.log('Tesseract.js Worker初始化完成');
            console.log('支持语言: 中文简体 + 英文');
            console.log('OCR引擎: LSTM + Legacy混合模式');
            console.log('页面分割: 统一文本块模式');
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
            console.log('\nTesseract.js配置已完成:');
            console.log('- 语言: 中文简体 + 英文');
            console.log('- 引擎模式: LSTM + Legacy混合');
            console.log('- 页面分割模式: 统一文本块(PSM 6)');
            console.log('- 保持空格: 启用');
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
                    // 使用Tesseract.js进行OCR识别
                    console.log(`开始OCR识别第 ${i + 1} 页...`);
                    const pageOcrStart = Date.now();
                    const { data: { text: ocrText } } = await worker.recognize(processedImageBuffer);
                    const pageOcrTime = Date.now() - pageOcrStart;
                    totalOcrTime += pageOcrTime;
                    console.log(`第 ${i + 1} 页OCR识别完成，耗时: ${pageOcrTime}ms`);
                    // 详细的OCR结果分析
                    console.log(`\n=== 第 ${i + 1} 页OCR结果详细分析 ===`);
                    if (ocrText && ocrText.trim().length > 0) {
                        console.log(`✓ 识别文本长度: ${ocrText.length} 字符`);
                        console.log(`✓ 去空格后长度: ${ocrText.trim().length} 字符`);
                        console.log(`✓ 行数: ${ocrText.split('\n').length}`);
                        console.log(`✓ 非空行数: ${ocrText.split('\n').filter(line => line.trim().length > 0).length}`);
                        // 字符类型统计
                        const hasNumbers = /\d/.test(ocrText);
                        const hasChinese = /[\u4e00-\u9fa5]/.test(ocrText);
                        const hasEnglish = /[a-zA-Z]/.test(ocrText);
                        const hasSpaces = /\s{2,}/.test(ocrText);
                        const hasTabs = /\t/.test(ocrText);
                        const hasPunctuation = /[，。、；：！？]/.test(ocrText);
                        console.log(`字符类型分析:`);
                        console.log(`  - 包含数字: ${hasNumbers}`);
                        console.log(`  - 包含中文: ${hasChinese}`);
                        console.log(`  - 包含英文: ${hasEnglish}`);
                        console.log(`  - 包含多空格: ${hasSpaces}`);
                        console.log(`  - 包含制表符: ${hasTabs}`);
                        console.log(`  - 包含标点: ${hasPunctuation}`);
                        // 显示完整OCR文本（分段显示）
                        console.log(`\n完整OCR文本内容:`);
                        console.log(`"""`);
                        console.log(ocrText);
                        console.log(`"""`);
                        // 按行显示前20行
                        const lines = ocrText.split('\n');
                        console.log(`\n前20行详细内容:`);
                        for (let lineIdx = 0; lineIdx < Math.min(20, lines.length); lineIdx++) {
                            const line = lines[lineIdx];
                            console.log(`  行${lineIdx + 1}: "${line}" (长度: ${line.length})`);
                        }
                        successfulPages++;
                        // 从OCR文本中提取表格
                        console.log(`\n开始从第 ${i + 1} 页文本中提取表格...`);
                        const pageTables = await this.extractTablesFromText(ocrText, 1);
                        if (pageTables.length > 0) {
                            console.log(`✓ 第 ${i + 1} 页找到 ${pageTables.length} 个表格`);
                            // 详细显示每个表格
                            pageTables.forEach((table, tableIdx) => {
                                console.log(`  表格${tableIdx + 1}:`);
                                console.log(`    - 表头: [${table.headers.join(', ')}]`);
                                console.log(`    - 行数: ${table.rows.length}`);
                                console.log(`    - 列数: ${table.headers.length}`);
                                if (table.rows.length > 0) {
                                    console.log(`    - 第一行数据: [${table.rows[0].join(', ')}]`);
                                }
                            });
                            // 更新页码信息
                            pageTables.forEach(table => {
                                table.page = i + 1;
                                table.tableIndex = tables.length;
                                tables.push(table);
                            });
                        }
                        else {
                            console.log(`✗ 第 ${i + 1} 页未识别到表格结构`);
                            console.log(`可能的原因:`);
                            console.log(`  1. OCR文本中没有符合表格模式的行`);
                            console.log(`  2. 表格分隔符识别失败`);
                            console.log(`  3. 文本格式不规范`);
                            console.log(`  4. 需要调整表格检测参数`);
                        }
                    }
                    else {
                        console.log(`⚠️ 第 ${i + 1} 页OCR未识别到任何文本`);
                        console.log(`可能的原因:`);
                        console.log(`  1. 图像质量过低`);
                        console.log(`  2. 图像预处理参数不当`);
                        console.log(`  3. OCR配置问题`);
                        console.log(`  4. 页面为空白或纯图像`);
                    }
                }
                catch (pageOcrError) {
                    console.error(`\n=== 第 ${i + 1} 页OCR识别失败详细诊断 ===`);
                    console.error(`错误类型: ${pageOcrError.constructor.name}`);
                    console.error(`错误信息: ${pageOcrError.message}`);
                    console.error(`错误代码: ${pageOcrError.code || '未知'}`);
                    // 详细的错误诊断
                    if (pageOcrError.message.includes('tesseract')) {
                        console.error('\n🔍 Tesseract.js相关错误诊断:');
                        console.error('1. 检查tesseract.js是否正确安装');
                        console.error('2. 检查网络连接（首次使用需下载语言包）');
                        console.error('3. 检查Worker是否正确初始化');
                        console.error('4. 检查语言包下载是否完成');
                    }
                    if (pageOcrError.message.includes('spawn') || pageOcrError.message.includes('ENOENT')) {
                        console.error('\n🔍 进程启动错误诊断:');
                        console.error('1. Tesseract可执行文件未找到');
                        console.error('2. PATH环境变量未正确配置');
                        console.error('3. 权限不足，无法执行tesseract命令');
                    }
                    if (pageOcrError.message.includes('timeout')) {
                        console.error('\n🔍 超时错误诊断:');
                        console.error('1. 图像过大，处理时间过长');
                        console.error('2. 系统资源不足');
                        console.error('3. OCR配置参数需要优化');
                    }
                    if (pageOcrError.message.includes('memory') || pageOcrError.message.includes('heap')) {
                        console.error('\n🔍 内存错误诊断:');
                        console.error('1. 图像文件过大');
                        console.error('2. Node.js内存限制');
                        console.error('3. 系统可用内存不足');
                    }
                    console.error(`\n当前页面信息:`);
                    console.error(`  - 页码: ${i + 1}`);
                    console.error(`  - 原始buffer大小: ${pageResult.buffer ? pageResult.buffer.length : '未知'} 字节`);
                    console.error(`  - 处理阶段: ${pageResult.buffer ? 'Sharp预处理后' : '原始buffer获取'}`);
                    console.error(`\n建议解决方案:`);
                    console.error(`1. 确保tesseract.js已正确安装: npm install tesseract.js`);
                    console.error(`2. 检查网络连接，确保语言包能正常下载`);
                    console.error(`3. 检查Worker初始化: 确保createWorker调用成功`);
                    console.error(`4. 验证语言包: 检查chi_sim+eng语言包下载`);
                    console.error(`5. 如果是权限问题，检查文件和目录权限`);
                    console.error(`6. 如果是内存问题，尝试减小图像尺寸或增加Node.js内存限制`);
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
            // 清理Tesseract.js Worker
            console.log('清理Tesseract.js Worker...');
            try {
                await worker.terminate();
                console.log('✓ Tesseract.js Worker已清理');
            }
            catch (terminateError) {
                console.warn('⚠️ 清理Worker失败:', terminateError.message);
            }
        }
        catch (error) {
            console.error('\n========================================');
            console.error('=== OCR处理流程异常详细诊断 ===');
            console.error('========================================');
            console.error(`错误类型: ${error.constructor.name}`);
            console.error(`错误信息: ${error.message}`);
            console.error(`错误代码: ${error.code || '未知'}`);
            console.error(`错误堆栈: ${error.stack}`);
            // 系统环境检查
            console.error('\n🔍 系统环境诊断:');
            console.error(`操作系统: ${process.platform}`);
            console.error(`Node.js版本: ${process.version}`);
            console.error(`当前工作目录: ${process.cwd()}`);
            console.error(`内存使用情况: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
            // PDF文件信息
            console.error('\n📄 PDF文件信息:');
            try {
                const fs = require('fs');
                if (fs.existsSync(pdfPath)) {
                    const stats = fs.statSync(pdfPath);
                    console.error(`  - 文件存在: 是`);
                    console.error(`  - 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                    console.error(`  - 文件权限: ${stats.mode.toString(8)}`);
                    console.error(`  - 修改时间: ${stats.mtime}`);
                }
                else {
                    console.error(`  - 文件存在: 否`);
                }
            }
            catch (fsError) {
                console.error(`  - 文件检查失败: ${fsError.message}`);
            }
            // 依赖检查
            console.error('\n🔧 依赖组件检查:');
            // 检查pdf2pic
            try {
                const pdf2pic = require('pdf2pic');
                console.error(`  - pdf2pic: 已安装`);
            }
            catch (pdf2picError) {
                console.error(`  - pdf2pic: 安装失败 - ${pdf2picError.message}`);
            }
            // 检查sharp
            try {
                const sharp = require('sharp');
                console.error(`  - sharp: 已安装`);
            }
            catch (sharpError) {
                console.error(`  - sharp: 安装失败 - ${sharpError.message}`);
            }
            // 检查tesseract.js
            try {
                const tesseractjs = require('tesseract.js');
                console.error(`  - tesseract.js: 已安装`);
            }
            catch (tesseractError) {
                console.error(`  - tesseract.js: 安装失败 - ${tesseractError.message}`);
            }
            // 错误类型特定诊断
            if (error.message.includes('tesseract')) {
                console.error('\n🔍 Tesseract.js特定错误诊断:');
                console.error('1. 检查tesseract.js是否正确安装: npm list tesseract.js');
                console.error('2. 检查网络连接（首次使用需下载语言包）');
                console.error('3. 检查Worker初始化是否成功');
                console.error('4. 验证语言包下载是否完成');
                console.error('5. 检查浏览器环境兼容性（如果在浏览器中运行）');
            }
            if (error.message.includes('pdf2pic') || error.message.includes('convert')) {
                console.error('\n🔍 PDF转图片错误诊断:');
                console.error('1. PDF文件可能已损坏或加密');
                console.error('2. 磁盘空间不足');
                console.error('3. 临时目录权限问题');
                console.error('4. GraphicsMagick/ImageMagick未安装');
            }
            if (error.message.includes('sharp')) {
                console.error('\n🔍 图像处理错误诊断:');
                console.error('1. 图像格式不支持');
                console.error('2. 图像文件损坏');
                console.error('3. 内存不足');
                console.error('4. Sharp库版本兼容性问题');
            }
            if (error.message.includes('ENOENT')) {
                console.error('\n🔍 文件/命令未找到错误诊断:');
                console.error('1. 检查所有依赖是否正确安装');
                console.error('2. 检查系统PATH环境变量');
                console.error('3. 检查文件路径是否正确');
                console.error('4. 检查文件权限');
            }
            console.error('\n💡 建议解决步骤:');
            console.error('1. 运行系统检查命令:');
            console.error('   - tesseract --version');
            console.error('   - tesseract --list-langs');
            console.error('   - which tesseract');
            console.error('2. 重新安装依赖:');
            console.error('   - npm install --rebuild');
            console.error('   - brew install tesseract tesseract-lang (macOS)');
            console.error('3. 检查系统资源:');
            console.error('   - 磁盘空间是否充足');
            console.error('   - 内存使用情况');
            console.error('   - 临时目录权限');
            console.error('4. 尝试简化测试:');
            console.error('   - 使用较小的PDF文件');
            console.error('   - 降低图像处理参数');
            console.error('========================================');
            throw error;
        }
        console.log(`\n--- OCR处理完成，共找到 ${tables.length} 个表格 ---`);
        return tables;
    }
    async extractTablesFromText(text, pageCount) {
        console.log(`\n🔍 开始从文本提取表格 (页数: ${pageCount})`);
        console.log(`📄 文本长度: ${text.length} 字符`);
        if (!text || text.trim().length === 0) {
            console.log('❌ 文本为空，无法提取表格');
            return [];
        }
        const preprocessedText = this.preprocessText(text);
        const lines = preprocessedText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        console.log(`📝 预处理后行数: ${lines.length}`);
        if (lines.length < 2) { // 降低阈值从3到2
            console.log('❌ 行数不足，无法构成表格');
            return [];
        }
        // 使用增强的表格检测
        const isTableLike = this.detectEnhancedTablePatterns(lines);
        if (!isTableLike) {
            console.log('❌ 未检测到表格模式，尝试替代方法...');
            return this.tryAlternativeTableExtraction(lines);
        }
        console.log('✅ 检测到表格模式，开始解析...');
        // 尝试不同的分隔符
        const separators = ['\t', /\s{2,}/, '|', ','];
        let bestTable = null;
        let maxScore = 0;
        for (const separator of separators) {
            try {
                const table = this.parseTableWithSeparator(lines, separator);
                if (table && table.rows.length >= 2) { // 降低阈值
                    const score = this.scoreTable(table);
                    console.log(`📊 分隔符 ${separator.toString()} 得分: ${score}`);
                    if (score > maxScore) {
                        maxScore = score;
                        bestTable = table;
                    }
                }
            }
            catch (error) {
                console.log(`⚠️ 分隔符 ${separator.toString()} 解析失败:`, error);
            }
        }
        if (bestTable) {
            console.log(`✅ 成功提取表格，${bestTable.rows.length} 行 x ${bestTable.headers.length} 列`);
            return [bestTable];
        }
        console.log('❌ 所有分隔符都无法解析出有效表格');
        return [];
    }
    scoreTable(table) {
        let score = 0;
        // 基础分数
        score += table.rows.length * 10; // 每行10分
        score += table.headers.length * 5; // 每列5分
        // 数据质量分数
        const totalCells = table.rows.length * table.headers.length;
        const nonEmptyCells = table.rows.flat().filter(cell => cell && cell.trim().length > 0).length;
        const fillRate = nonEmptyCells / totalCells;
        score += fillRate * 50; // 填充率最高50分
        // 数字内容分数
        const numericCells = table.rows.flat().filter(cell => /\d/.test(cell || '')).length;
        const numericRate = numericCells / totalCells;
        score += numericRate * 30; // 数字率最高30分
        // 列宽一致性分数
        const columnWidths = table.headers.map((_, colIndex) => {
            return table.rows.map(row => (row[colIndex] || '').length);
        });
        const consistency = columnWidths.map(widths => {
            const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
            const variance = widths.reduce((sum, width) => sum + Math.pow(width - avg, 2), 0) / widths.length;
            return Math.max(0, 10 - variance); // 方差越小分数越高
        }).reduce((a, b) => a + b, 0);
        score += consistency;
        return Math.round(score);
    }
    parseTableWithSeparator(lines, separator) {
        if (lines.length < 2)
            return null;
        // 解析表头
        const headers = lines[0].split(separator)
            .map(h => h.trim())
            .filter(h => h.length > 0);
        if (headers.length < 2)
            return null;
        // 解析数据行
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const rowData = lines[i].split(separator)
                .map(cell => cell.trim());
            // 确保列数一致
            while (rowData.length < headers.length) {
                rowData.push('');
            }
            if (rowData.length > headers.length) {
                rowData.splice(headers.length);
            }
            rows.push(rowData);
        }
        return {
            page: 1,
            tableIndex: 0,
            headers,
            rows
        };
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
        console.log(`\n--- 数字文本模式分析 ---`);
        console.log(`分析行: "${line.substring(0, 60)}${line.length > 60 ? '...' : ''}"`);
        // 检查行是否包含数字和文本的混合模式，可能是表格数据
        const hasNumbers = /\d/.test(line);
        const hasText = /[a-zA-Z\u4e00-\u9fa5]/.test(line);
        const hasMultipleWords = line.split(/\s+/).length >= 2;
        const wordCount = line.split(/\s+/).length;
        // 针对扫描件的额外检查
        const hasChineseNumbers = /[一二三四五六七八九十百千万亿]/.test(line); // 中文数字
        const hasAccountNumber = /\d{10,}/.test(line); // 长数字（如账号）
        const hasAmount = /\d+\.\d{2}/.test(line); // 金额格式
        const hasPercentage = /\d+%/.test(line); // 百分比
        // 提取所有数字
        const numbers = line.match(/\d+([.,]\d+)?/g) || [];
        const chineseNumbers = line.match(/[一二三四五六七八九十百千万亿]+/g) || [];
        console.log(`基本特征:`);
        console.log(`  包含阿拉伯数字: ${hasNumbers} (${numbers.length}个)`);
        console.log(`  包含文本: ${hasText}`);
        console.log(`  多词: ${hasMultipleWords} (${wordCount}个词)`);
        console.log(`  行长度: ${line.length}字符`);
        console.log(`扫描件特征:`);
        console.log(`  包含中文数字: ${hasChineseNumbers} (${chineseNumbers.length}个)`);
        console.log(`  包含长数字/账号: ${hasAccountNumber}`);
        console.log(`  包含金额格式: ${hasAmount}`);
        console.log(`  包含百分比: ${hasPercentage}`);
        if (numbers.length > 0) {
            console.log(`  数字列表: ${numbers.join(', ')}`);
        }
        if (chineseNumbers.length > 0) {
            console.log(`  中文数字列表: ${chineseNumbers.join(', ')}`);
        }
        // 判断结果
        const result = (hasNumbers || hasChineseNumbers || hasAccountNumber) &&
            hasText &&
            (hasMultipleWords || hasAmount || hasPercentage) &&
            line.length >= 8;
        console.log(`判断结果: ${result ? '✓ 符合数字文本模式' : '✗ 不符合数字文本模式'}`);
        if (!result) {
            console.log(`  不符合原因: ${!hasNumbers && !hasChineseNumbers && !hasAccountNumber ? '无数字' :
                !hasText ? '无文本' :
                    !hasMultipleWords && !hasAmount && !hasPercentage ? '无多词/金额/百分比' :
                        line.length < 8 ? '行太短' : '未知'}`);
        }
        return result;
    }
    // 新增：智能分割表格行的方法 - 针对扫描件优化
    smartSplitTableRow(line) {
        const trimmedLine = line.trim();
        console.log(`\n=== 智能分割行 ===`);
        console.log(`输入: "${trimmedLine}"`);
        console.log(`长度: ${trimmedLine.length} 字符`);
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
        console.log(`\n--- 尝试预定义模式匹配 ---`);
        // 尝试匹配预定义模式
        for (const { name, pattern, extract } of tablePatterns) {
            console.log(`测试模式 [${name}]...`);
            const match = trimmedLine.match(pattern);
            if (match) {
                const result = extract(match);
                console.log(`✓ 匹配成功! 模式 [${name}]: ${result.length}列`);
                console.log(`  完整匹配: "${match[0]}"`);
                for (let i = 1; i < match.length; i++) {
                    console.log(`  捕获组${i}: "${match[i]}"`);
                }
                console.log(`  分割结果: ${result.map(r => `"${r}"`).join(', ')}`);
                return result;
            }
            else {
                console.log(`✗ 不匹配`);
            }
        }
        console.log(`\n--- 未匹配预定义模式，使用通用分割 ---`);
        // 通用智能分割算法
        console.log(`1. 尝试空格分割:`);
        const parts = trimmedLine.split(/\s+/);
        console.log(`  空格分割得到 ${parts.length} 部分:`);
        parts.forEach((part, index) => {
            console.log(`    部分${index + 1}: "${part}" (${part.length}字符)`);
        });
        if (parts.length >= 3) {
            console.log(`\n2. 尝试智能合并:`);
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
                console.log(`  分析部分${i + 1}: "${part}" - 类型: ${partType}`);
                // 合并相同类型的连续部分（除了数字）
                if (partType === groupType && partType === 'chinese') {
                    console.log(`    合并到当前组: "${currentGroup}" + "${part}"`);
                    currentGroup += ' ' + part;
                }
                else {
                    if (currentGroup) {
                        console.log(`    添加组: "${currentGroup}"`);
                        merged.push(currentGroup);
                    }
                    console.log(`    开始新组: "${part}"`);
                    currentGroup = part;
                    groupType = partType;
                }
            }
            if (currentGroup) {
                console.log(`  添加最后一组: "${currentGroup}"`);
                merged.push(currentGroup);
            }
            console.log(`  合并后得到 ${merged.length} 列:`);
            merged.forEach((col, index) => {
                console.log(`    列${index + 1}: "${col}" (${col.length}字符)`);
            });
            const filtered = merged.filter(p => p.trim().length > 0);
            if (filtered.length < merged.length) {
                console.log(`  过滤空值后: ${filtered.length} 列`);
            }
            if (filtered.length >= 2) {
                console.log(`✓ 智能合并成功，返回 ${filtered.length} 列`);
                return filtered;
            }
            else {
                console.log(`✗ 智能合并后列数不足，继续尝试其他方法`);
            }
        }
        console.log(`\n3. 尝试替代分隔符:`);
        // 如果空格分割效果不好，尝试其他分割方式
        const alternativeSeparators = [
            { name: '逗号', pattern: /[,，]/g },
            { name: '分号', pattern: /[;；]/g },
            { name: '竖线', pattern: /[|｜]/g },
            { name: '制表符', pattern: /[\t]/g }
        ];
        for (const { name, pattern } of alternativeSeparators) {
            console.log(`  尝试 [${name}] 分隔:`);
            const altParts = trimmedLine.split(pattern).filter(p => p.trim().length > 0);
            if (altParts.length >= 2) {
                console.log(`    ✓ 成功! 得到 ${altParts.length} 列:`);
                altParts.forEach((part, index) => {
                    console.log(`      列${index + 1}: "${part.trim()}"`);
                });
                return altParts.map(p => p.trim());
            }
            else {
                console.log(`    ✗ 失败，列数不足: ${altParts.length}`);
            }
        }
        console.log(`\n4. 所有分割方法都失败，返回原始空格分割结果`);
        const finalResult = parts.filter(p => p.trim().length > 0);
        console.log(`  最终结果: ${finalResult.length} 列`);
        return finalResult;
    }
    isTableRow(line) {
        const originalLine = line;
        const trimmedLine = line.trim();
        console.log(`\n=== 分析行: "${trimmedLine.substring(0, 60)}${trimmedLine.length > 60 ? '...' : ''}" ===`);
        // 详细分析行内容
        console.log(`行详细信息:`);
        console.log(`  原始长度: ${line.length}`);
        console.log(`  修剪后长度: ${trimmedLine.length}`);
        console.log(`  前导空格数: ${line.length - line.trimLeft().length}`);
        console.log(`  尾部空格数: ${line.length - line.trimRight().length}`);
        console.log(`  包含数字: ${/\d/.test(trimmedLine)}`);
        console.log(`  包含中文: ${/[\u4e00-\u9fa5]/.test(trimmedLine)}`);
        console.log(`  包含英文: ${/[a-zA-Z]/.test(trimmedLine)}`);
        console.log(`  包含标点: ${/[,.:;，。：；]/.test(trimmedLine)}`);
        console.log(`  包含空格: ${/\s/.test(trimmedLine)}`);
        console.log(`  空格数量: ${(trimmedLine.match(/\s/g) || []).length}`);
        console.log(`  连续空格: ${/\s{2,}/.test(trimmedLine) ? '是' : '否'}`);
        console.log(`  最长连续空格: ${Math.max(...(trimmedLine.match(/\s+/g) || ['']).map(s => s.length))}`);
        // 跳过空行和太短的行
        if (trimmedLine.length < 5) { // 降低最小长度要求，适应扫描件
            console.log(`✗ 行太短，跳过: "${trimmedLine}" (长度: ${trimmedLine.length})`);
            return false;
        }
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
        console.log(`\n--- 分隔符检测 ---`);
        // 检查是否包含分隔符
        let matchedSeparators = [];
        const hasSeparator = separatorPatterns.some(({ name, pattern }) => {
            const matches = trimmedLine.match(pattern);
            if (matches) {
                matchedSeparators.push(name);
                console.log(`  ✓ 匹配分隔符 [${name}]: ${matches.length}个匹配`);
                if (matches.length > 0 && name.includes('空格')) {
                    // 显示空格位置
                    const positions = [];
                    let match;
                    const regex = new RegExp(pattern);
                    let tempStr = trimmedLine;
                    let offset = 0;
                    while ((match = regex.exec(tempStr)) !== null) {
                        positions.push(match.index + offset);
                        offset += match.index + match[0].length;
                        tempStr = tempStr.substring(match.index + match[0].length);
                        if (positions.length >= 5)
                            break; // 最多显示5个位置
                    }
                    console.log(`    空格位置: ${positions.join(', ')}`);
                }
                return true;
            }
            return false;
        });
        console.log(`分隔符检测结果: ${matchedSeparators.length > 0 ? matchedSeparators.join(', ') : '无'}`);
        console.log(`\n--- 特殊模式检测 ---`);
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
        const hasSpecialPattern = specialPatterns.some(({ name, pattern, description }) => {
            const match = trimmedLine.match(pattern);
            if (match) {
                matchedSpecialPatterns.push(name);
                console.log(`  ✓ 匹配特殊模式 [${name}]: ${description}`);
                console.log(`    匹配内容: "${match[0]}"`);
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
        console.log(`\n--- 行分割测试 ---`);
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
            console.log(`\n分割结果详情:`);
            columns.forEach((col, index) => {
                console.log(`  列${index + 1}: "${col}" (长度: ${col.length})`);
            });
        }
        // 检查是否有足够的列且列内容合理
        const hasEnoughColumns = columns.length >= 2;
        const hasValidContent = columns.every(col => col.trim().length > 0 && col.trim().length < 200); // 增加长度限制
        // 检查是否包含数字和文本的混合模式（表格特征）
        const hasPattern = this.hasNumberTextPattern(trimmedLine);
        console.log(`\n--- 表格特征分析 ---`);
        console.log(`数字文本模式检查: ${hasPattern ? '✓' : '✗'}`);
        // 详细分析每列内容类型
        if (columns.length > 0) {
            console.log(`列内容类型分析:`);
            columns.forEach((col, index) => {
                const hasNum = /\d/.test(col);
                const hasChinese = /[\u4e00-\u9fa5]/.test(col);
                const hasEnglish = /[a-zA-Z]/.test(col);
                const hasSymbol = /[,.:;，。：；%]/.test(col);
                console.log(`  列${index + 1}: 数字=${hasNum}, 中文=${hasChinese}, 英文=${hasEnglish}, 符号=${hasSymbol}`);
            });
        }
        // 放宽判断条件，只要有足够的列或符合数字文本模式即可
        const isValid = (hasEnoughColumns && hasValidContent) || (hasPattern && columns.length > 0);
        console.log(`\n--- 最终判断 ---`);
        console.log(`  列数足够(>=2): ${hasEnoughColumns} (${columns.length}列)`);
        console.log(`  内容有效: ${hasValidContent}`);
        console.log(`  数字文本模式: ${hasPattern}`);
        if (isValid) {
            console.log(`✓ 最终判定为表格行`);
        }
        else {
            console.log(`✗ 最终判定为非表格行`);
            console.log(`  原因: ${!hasEnoughColumns ? '列数不足' : !hasValidContent ? '列内容无效' : '不符合表格模式'}`);
        }
        return isValid;
    }
    parseTableData(tableLines, page, tableIndex) {
        console.log(`\n=== 开始解析表格数据 ===`);
        console.log(`表格行数: ${tableLines.length}`);
        if (tableLines.length < 2) {
            console.log(`✗ 表格行数不足，至少需要2行 (当前: ${tableLines.length}行)`);
            return null;
        }
        console.log(`表格首行: "${tableLines[0].substring(0, 100)}${tableLines[0].length > 100 ? '...' : ''}"`);
        console.log(`表格尾行: "${tableLines[tableLines.length - 1].substring(0, 100)}${tableLines[tableLines.length - 1].length > 100 ? '...' : ''}"`);
        // 针对扫描件优化的分隔符模式
        const separatorPatterns = [
            { name: '多空格', pattern: /\s{2,}/ }, // 2个或更多空格
            { name: '制表符', pattern: /\t+/ }, // 制表符
            { name: '竖线', pattern: /\|/ }, // 竖线分隔符
            { name: '逗号', pattern: /,\s*/ }, // 逗号分隔
            { name: '分号', pattern: /;\s*/ }, // 分号分隔
            { name: '数字空格', pattern: /\s+\d+\s+/ }, // 数字前后的空格模式
            { name: '中文数字', pattern: /[\u4e00-\u9fa5]+\s+\d/ }, // 中文后跟数字的模式
            { name: '小数空格', pattern: /\d+\.\d+\s+/ } // 小数后跟空格的模式
        ];
        console.log(`\n--- 表头分隔符测试 ---`);
        let bestPattern = separatorPatterns[0].pattern;
        let bestPatternName = separatorPatterns[0].name;
        let maxColumns = 0;
        let bestHeaders = [];
        // 找到能产生最多列的分隔符模式
        for (const { name, pattern } of separatorPatterns) {
            const testHeaders = tableLines[0].split(pattern).filter(col => col.trim().length > 0);
            console.log(`  ${name}: 分割出 ${testHeaders.length} 列`);
            if (testHeaders.length > 0) {
                console.log(`    首列: "${testHeaders[0]}"`);
                if (testHeaders.length > 1) {
                    console.log(`    次列: "${testHeaders[1]}"`);
                }
            }
            if (testHeaders.length > maxColumns) {
                maxColumns = testHeaders.length;
                bestPattern = pattern;
                bestPatternName = name;
                bestHeaders = testHeaders;
            }
        }
        console.log(`最佳表头分隔符: [${bestPatternName}], 产生 ${maxColumns} 列`);
        // 如果常规分隔符不行，使用智能分割
        if (maxColumns < 2) {
            console.log(`常规分隔符效果不佳，尝试智能分割...`);
            bestHeaders = this.smartSplitTableRow(tableLines[0]);
            maxColumns = bestHeaders.length;
            bestPatternName = '智能分割';
            console.log(`智能分割产生 ${maxColumns} 列`);
        }
        // 解析表头
        const headers = bestHeaders.map(h => h.trim()).filter(h => h.length > 0);
        console.log(`\n--- 表头解析结果 ---`);
        console.log(`有效表头列数: ${headers.length}`);
        headers.forEach((header, index) => {
            console.log(`  表头${index + 1}: "${header}"`);
        });
        if (headers.length < 2) {
            console.log(`✗ 表头列数不足，至少需要2列 (当前: ${headers.length}列)`);
            return null;
        }
        console.log(`\n--- 开始解析数据行 ---`);
        // 解析数据行
        const rows = [];
        let rowParseSuccessCount = 0;
        let rowParseFailCount = 0;
        for (let i = 1; i < tableLines.length; i++) {
            console.log(`\n处理第 ${i} 行: "${tableLines[i].substring(0, 60)}${tableLines[i].length > 60 ? '...' : ''}"`);
            let rowData;
            // 尝试使用最佳分隔符模式
            if (maxColumns >= 2 && bestPattern) {
                console.log(`  使用 [${bestPatternName}] 分隔符分割`);
                rowData = tableLines[i].split(bestPattern).filter(col => col.trim().length > 0).map(cell => cell.trim());
            }
            else {
                // 使用智能分割
                console.log(`  使用智能分割`);
                rowData = this.smartSplitTableRow(tableLines[i]);
            }
            console.log(`  分割结果: ${rowData.length} 列`);
            if (rowData.length > 0) {
                // 显示分割结果
                rowData.forEach((cell, cellIndex) => {
                    console.log(`    列${cellIndex + 1}: "${cell}"`);
                });
                // 列数调整前
                console.log(`  列数调整前: ${rowData.length} 列 vs 表头 ${headers.length} 列`);
                // 确保行数据与表头列数一致
                if (rowData.length < headers.length) {
                    console.log(`  ⚠️ 列数不足，添加 ${headers.length - rowData.length} 个空列`);
                    while (rowData.length < headers.length) {
                        rowData.push('');
                    }
                }
                // 如果行数据过多，截取到表头长度
                if (rowData.length > headers.length) {
                    console.log(`  ⚠️ 列数过多，截取前 ${headers.length} 列 (丢弃 ${rowData.length - headers.length} 列)`);
                    rowData = rowData.slice(0, headers.length);
                }
                console.log(`  ✓ 成功解析行，最终 ${rowData.length} 列`);
                rows.push(rowData);
                rowParseSuccessCount++;
            }
            else {
                console.log(`  ✗ 行解析失败，未能提取有效列`);
                rowParseFailCount++;
            }
        }
        console.log(`\n--- 数据行解析统计 ---`);
        console.log(`总行数: ${tableLines.length - 1}`);
        console.log(`成功解析: ${rowParseSuccessCount} 行`);
        console.log(`解析失败: ${rowParseFailCount} 行`);
        // 只有当有实际数据行时才返回表格
        if (rows.length === 0) {
            console.log(`✗ 没有成功解析的数据行，表格解析失败`);
            return null;
        }
        // 后处理：清理和验证数据
        console.log(`\n--- 表格数据清理 ---`);
        const originalRowCount = rows.length;
        const cleanedRows = this.cleanTableRows(rows, headers.length);
        console.log(`清理前行数: ${originalRowCount}`);
        console.log(`清理后行数: ${cleanedRows.length}`);
        console.log(`过滤掉的行数: ${originalRowCount - cleanedRows.length}`);
        if (cleanedRows.length === 0) {
            console.log(`✗ 清理后没有有效数据行，表格解析失败`);
            return null;
        }
        console.log(`\n--- 最终表格数据 ---`);
        console.log(`表头: ${headers.length} 列`);
        console.log(`数据: ${cleanedRows.length} 行`);
        // 显示前3行数据预览
        const previewRows = Math.min(3, cleanedRows.length);
        console.log(`数据预览 (前 ${previewRows} 行):`);
        for (let i = 0; i < previewRows; i++) {
            console.log(`  行${i + 1}: [${cleanedRows[i].join(', ')}]`);
        }
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
    checkColumnAlignment(lines) {
        console.log('🔍 检查列对齐模式...');
        if (lines.length < 2)
            return false;
        const positions = new Map();
        let validLines = 0;
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length < 5)
                return; // 跳过太短的行
            const words = trimmedLine.split(/\s+/).filter(word => word.length > 0);
            if (words.length < 2)
                return; // 至少需要2个词
            validLines++;
            let searchPos = 0;
            words.forEach(word => {
                const pos = line.indexOf(word, searchPos);
                if (pos !== -1) {
                    // 将位置归类到最近的5字符边界
                    const normalizedPos = Math.round(pos / 5) * 5;
                    positions.set(normalizedPos, (positions.get(normalizedPos) || 0) + 1);
                    searchPos = pos + word.length;
                }
            });
        });
        if (validLines < 2)
            return false;
        // 统计频繁出现的位置
        const threshold = Math.max(2, Math.floor(validLines * 0.4)); // 至少40%的行
        const frequentPositions = Array.from(positions.entries())
            .filter(([pos, count]) => count >= threshold)
            .length;
        console.log(`📊 列对齐分析: 有效行=${validLines}, 频繁位置=${frequentPositions}, 阈值=${threshold}`);
        return frequentPositions >= 3; // 至少3个对齐位置
    }
    checkNumericPattern(lines) {
        console.log('🔢 检查数字模式...');
        let numericLines = 0;
        let totalValidLines = 0;
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.length < 3)
                return;
            totalValidLines++;
            // 检查是否包含数字、货币符号、百分比等
            const hasNumbers = /\d/.test(trimmedLine);
            const hasCurrency = /[¥$€£￥]/.test(trimmedLine);
            const hasPercent = /%/.test(trimmedLine);
            const hasDecimal = /\d+\.\d+/.test(trimmedLine);
            const hasCommaNumbers = /\d{1,3}(,\d{3})+/.test(trimmedLine);
            if (hasNumbers || hasCurrency || hasPercent || hasDecimal || hasCommaNumbers) {
                numericLines++;
            }
        });
        const numericRatio = totalValidLines > 0 ? numericLines / totalValidLines : 0;
        console.log(`📊 数字模式分析: 数字行=${numericLines}/${totalValidLines}, 比例=${(numericRatio * 100).toFixed(1)}%`);
        return numericRatio >= 0.3; // 至少30%的行包含数字
    }
    checkHeaderPattern(lines) {
        console.log('📋 检查表头模式...');
        if (lines.length < 2)
            return false;
        const firstLine = lines[0].trim();
        const secondLine = lines[1].trim();
        // 检查第一行是否像表头
        const firstLineWords = firstLine.split(/\s+/).filter(word => word.length > 0);
        const secondLineWords = secondLine.split(/\s+/).filter(word => word.length > 0);
        // 表头特征
        const hasMultipleColumns = firstLineWords.length >= 2;
        const hasConsistentColumnCount = Math.abs(firstLineWords.length - secondLineWords.length) <= 1;
        const hasHeaderKeywords = /名称|姓名|编号|序号|日期|时间|金额|数量|单价|总计|合计|项目|类型|状态/.test(firstLine);
        const firstLineHasLessNumbers = (firstLine.match(/\d/g) || []).length < (secondLine.match(/\d/g) || []).length;
        console.log(`📊 表头分析: 多列=${hasMultipleColumns}, 列数一致=${hasConsistentColumnCount}, 关键词=${hasHeaderKeywords}, 数字较少=${firstLineHasLessNumbers}`);
        return hasMultipleColumns && (hasConsistentColumnCount || hasHeaderKeywords || firstLineHasLessNumbers);
    }
    detectEnhancedTablePatterns(lines) {
        console.log('🔍 执行增强表格模式检测...');
        // 原有的基础检测
        const hasTabSeparators = lines.some(line => line.includes('\t'));
        const hasMultipleSpaces = lines.some(line => /\s{2,}/.test(line));
        const hasPipeSeparators = lines.some(line => line.includes('|'));
        const hasCommaSeparators = lines.some(line => line.includes(',') && line.split(',').length > 2);
        // 新增的增强检测
        const hasColumnAlignment = this.checkColumnAlignment(lines);
        const hasNumericPattern = this.checkNumericPattern(lines);
        const hasHeaderPattern = this.checkHeaderPattern(lines);
        // 检查行长度一致性
        const lineLengths = lines.map(line => line.trim().split(/\s+/).length).filter(len => len > 1);
        const avgLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;
        const consistentLength = lineLengths.filter(len => Math.abs(len - avgLength) <= 1).length >= lineLengths.length * 0.6;
        console.log('📊 模式检测结果:');
        console.log(`  - 制表符分隔: ${hasTabSeparators}`);
        console.log(`  - 多空格分隔: ${hasMultipleSpaces}`);
        console.log(`  - 竖线分隔: ${hasPipeSeparators}`);
        console.log(`  - 逗号分隔: ${hasCommaSeparators}`);
        console.log(`  - 列对齐: ${hasColumnAlignment}`);
        console.log(`  - 数字模式: ${hasNumericPattern}`);
        console.log(`  - 表头模式: ${hasHeaderPattern}`);
        console.log(`  - 长度一致: ${consistentLength}`);
        const isTable = hasTabSeparators || hasMultipleSpaces || hasPipeSeparators ||
            hasCommaSeparators || hasColumnAlignment ||
            (hasNumericPattern && (hasHeaderPattern || consistentLength));
        console.log(`✅ 最终判断: ${isTable ? '是表格' : '不是表格'}`);
        return isTable;
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