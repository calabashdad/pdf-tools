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
exports.PdfService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const pdf_lib_1 = require("pdf-lib");
const fontkit_1 = __importDefault(require("@pdf-lib/fontkit"));
const archiver = __importStar(require("archiver"));
class PdfService {
    async convertToImages(options) {
        try {
            const { pdfPath, outputPath } = options;
            // 确保输出目录存在
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
            }
            // 读取PDF文件
            const pdfBuffer = fs.readFileSync(pdfPath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            const pageCount = pdfDoc.getPageCount();
            const browser = await puppeteer_1.default.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            const page = await browser.newPage();
            const imagePaths = [];
            // 为每一页生成图片
            for (let i = 0; i < pageCount; i++) {
                const imagePath = path.join(outputPath, `page-${i + 1}.png`);
                // 获取当前页面的尺寸
                const currentPage = pdfDoc.getPage(i);
                const { width: pageWidth, height: pageHeight } = currentPage.getSize();
                // 创建只包含当前页面的新PDF
                const singlePagePdf = await pdf_lib_1.PDFDocument.create();
                const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
                singlePagePdf.addPage(copiedPage);
                // 将单页PDF转换为base64
                const pdfBytes = await singlePagePdf.save();
                const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
                // 使用Canvas和PDF.js来渲染PDF，完全避免浏览器PDF查看器
                const html = `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                    margin: 0; 
                                    padding: 0; 
                                    background: white;
                                    overflow: hidden;
                                }
                                #pdfCanvas {
                                    display: block;
                                    margin: 0;
                                    padding: 0;
                                }
                            </style>
                            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                        </head>
                        <body>
                            <canvas id="pdfCanvas"></canvas>
                            <script>
                                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                
                                async function renderPDF() {
                                    try {
                                        const pdfData = atob('${pdfBase64}');
                                        const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
                                        const page = await pdf.getPage(1);
                                        
                                        const scale = 2; // 高分辨率
                                        const viewport = page.getViewport({scale: scale});
                                        
                                        const canvas = document.getElementById('pdfCanvas');
                                        const context = canvas.getContext('2d');
                                        canvas.height = viewport.height;
                                        canvas.width = viewport.width;
                                        
                                        // 设置页面和canvas尺寸
                                        document.body.style.width = viewport.width + 'px';
                                        document.body.style.height = viewport.height + 'px';
                                        
                                        const renderContext = {
                                            canvasContext: context,
                                            viewport: viewport
                                        };
                                        
                                        await page.render(renderContext).promise;
                                        window.pdfRendered = true;
                                    } catch (error) {
                                        console.error('PDF渲染失败:', error);
                                        window.pdfRendered = false;
                                    }
                                }
                                
                                renderPDF();
                            </script>
                        </body>
                    </html>
                `;
                await page.setContent(html);
                // 等待PDF渲染完成
                await page.waitForFunction('window.pdfRendered !== undefined', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 1000)); // 额外等待确保渲染完成
                // 获取canvas元素的尺寸进行精确截图
                const canvasElement = await page.$('#pdfCanvas');
                if (canvasElement) {
                    await canvasElement.screenshot({
                        path: imagePath,
                        type: 'png'
                    });
                }
                else {
                    // 如果canvas方法失败，回退到页面截图
                    const bodySize = await page.evaluate(() => {
                        const body = document.body;
                        return {
                            width: body.scrollWidth,
                            height: body.scrollHeight
                        };
                    });
                    await page.setViewport({
                        width: bodySize.width,
                        height: bodySize.height
                    });
                    await page.screenshot({
                        path: imagePath,
                        type: 'png',
                        clip: {
                            x: 0,
                            y: 0,
                            width: bodySize.width,
                            height: bodySize.height
                        }
                    });
                }
                imagePaths.push(imagePath);
            }
            await browser.close();
            return imagePaths;
        }
        catch (error) {
            console.error('PDF转图片失败:', error);
            throw new Error(`PDF转图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async addWatermark(options) {
        try {
            const { pdfPath, watermarkText, outputPath, rotation = -45, opacity = 0.3, repeatCount = 3, fontSize = 50 } = options;
            // 读取原始PDF文件
            const existingPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(existingPdfBytes);
            // 注册fontkit以支持自定义字体
            pdfDoc.registerFontkit(fontkit_1.default);
            // 获取所有页面
            const pages = pdfDoc.getPages();
            // 嵌入字体以支持中文
            let font;
            let finalWatermarkText = watermarkText;
            // 检查是否包含中文字符
            const containsChinese = /[\u4e00-\u9fff]/.test(watermarkText);
            if (containsChinese) {
                // 对于包含中文的文本，尝试加载中文字体
                try {
                    console.log('检测到中文字符，尝试加载中文字体');
                    const fontPath = path.join(__dirname, '..', 'NotoSansCJK-Regular.ttf');
                    const fontBytes = fs.readFileSync(fontPath);
                    font = await pdfDoc.embedFont(fontBytes);
                    finalWatermarkText = watermarkText;
                    console.log('中文字体加载成功');
                }
                catch (error) {
                    console.warn('中文字体加载失败，使用英文替代:', error.message);
                    // 如果中文字体加载失败，使用英文替代
                    font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
                    // 将中文转换为英文描述
                    const chineseToEnglish = {
                        '机密': 'CONFIDENTIAL',
                        '样本': 'SAMPLE',
                        '草稿': 'DRAFT',
                        '副本': 'COPY',
                        '水印': 'WATERMARK',
                        '涉密': 'CLASSIFIED',
                        '内部': 'INTERNAL',
                        '测试': 'TEST',
                        '文件': 'FILE',
                        '文档': 'DOCUMENT',
                        '保密': 'CONFIDENTIAL',
                        '重要': 'IMPORTANT',
                        '紧急': 'URGENT',
                        '临时': 'TEMPORARY'
                    };
                    // 尝试翻译常见中文词汇
                    let translatedText = watermarkText;
                    let hasTranslation = false;
                    for (const [chinese, english] of Object.entries(chineseToEnglish)) {
                        if (watermarkText.includes(chinese)) {
                            translatedText = translatedText.replace(new RegExp(chinese, 'g'), english);
                            hasTranslation = true;
                        }
                    }
                    finalWatermarkText = hasTranslation ? translatedText : 'WATERMARK';
                }
            }
            else {
                // 对于纯英文文本，使用Helvetica字体
                font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
                finalWatermarkText = watermarkText;
            }
            // 遍历所有页面添加水印
            for (const page of pages) {
                const { width, height } = page.getSize();
                // 获取文本的实际宽度和高度
                const textWidth = font.widthOfTextAtSize(finalWatermarkText, fontSize);
                const textHeight = font.heightAtSize(fontSize);
                // 根据repeatCount动态生成水印位置
                const positions = [];
                // 如果只有1个水印，放在中心位置
                if (repeatCount === 1) {
                    positions.push({
                        x: (width - textWidth) / 2,
                        y: (height - textHeight) / 2
                    });
                }
                // 如果有2个水印，放在上下位置
                else if (repeatCount === 2) {
                    positions.push({
                        x: (width - textWidth) / 2,
                        y: height * 0.75 - textHeight / 2
                    }, {
                        x: (width - textWidth) / 2,
                        y: height * 0.25 - textHeight / 2
                    });
                }
                // 如果有3个水印，使用默认的左中右布局
                else if (repeatCount === 3) {
                    positions.push({
                        x: width * 0.25 - textWidth / 2,
                        y: height * 0.5 - textHeight / 2
                    }, {
                        x: (width - textWidth) / 2,
                        y: (height - textHeight) / 2
                    }, {
                        x: width * 0.75 - textWidth / 2,
                        y: height * 0.5 - textHeight / 2
                    });
                }
                // 如果有4个水印，使用四角布局
                else if (repeatCount === 4) {
                    positions.push({
                        x: width * 0.25 - textWidth / 2,
                        y: height * 0.75 - textHeight / 2
                    }, {
                        x: width * 0.75 - textWidth / 2,
                        y: height * 0.75 - textHeight / 2
                    }, {
                        x: width * 0.25 - textWidth / 2,
                        y: height * 0.25 - textHeight / 2
                    }, {
                        x: width * 0.75 - textWidth / 2,
                        y: height * 0.25 - textHeight / 2
                    });
                }
                // 如果有5个或更多水印，使用网格布局
                else {
                    // 计算行数和列数
                    const cols = Math.ceil(Math.sqrt(repeatCount));
                    const rows = Math.ceil(repeatCount / cols);
                    // 生成网格布局的水印位置
                    for (let i = 0; i < repeatCount && i < 9; i++) { // 限制最多9个水印
                        const row = Math.floor(i / cols);
                        const col = i % cols;
                        positions.push({
                            x: width * (col + 1) / (cols + 1) - textWidth / 2,
                            y: height * (row + 1) / (rows + 1) - textHeight / 2
                        });
                    }
                }
                // 根据生成的位置添加水印文本
                positions.forEach((position) => {
                    page.drawText(finalWatermarkText, {
                        x: position.x,
                        y: position.y,
                        size: fontSize,
                        opacity: opacity,
                        rotate: (0, pdf_lib_1.degrees)(rotation), // 使用动态旋转角度
                        color: (0, pdf_lib_1.rgb)(0.7, 0.7, 0.7),
                        font: font,
                    });
                });
            }
            // 保存带水印的PDF
            const pdfBytes = await pdfDoc.save();
            // 确保输出目录存在
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            // 写入文件
            fs.writeFileSync(outputPath, pdfBytes);
            console.log(`水印已添加到PDF: ${outputPath}`);
        }
        catch (error) {
            console.error('添加水印失败:', error);
            throw new Error(`添加水印失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async insertBlankPage(options) {
        try {
            const { pdfPath, pageIndex, outputPath } = options;
            // 读取原始PDF文件
            const existingPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(existingPdfBytes);
            // 获取页面总数
            const pageCount = pdfDoc.getPageCount();
            // 验证页面索引
            if (pageIndex < 0 || pageIndex > pageCount) {
                throw new Error(`页面索引无效: ${pageIndex}。有效范围: 0-${pageCount}`);
            }
            // 获取第一页的尺寸作为空白页的尺寸
            const firstPage = pdfDoc.getPage(0);
            const { width, height } = firstPage.getSize();
            // 创建空白页
            const blankPage = pdfDoc.insertPage(pageIndex, [width, height]);
            // 可选：为空白页添加背景色（白色）
            blankPage.drawRectangle({
                x: 0,
                y: 0,
                width: width,
                height: height,
                color: (0, pdf_lib_1.rgb)(1, 1, 1),
            });
            // 保存PDF
            const pdfBytes = await pdfDoc.save();
            // 确保输出目录存在
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            // 写入文件
            fs.writeFileSync(outputPath, pdfBytes);
            console.log(`空白页已插入到PDF第${pageIndex + 1}页: ${outputPath}`);
        }
        catch (error) {
            console.error('插入空白页失败:', error);
            throw new Error(`插入空白页失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async addText(options) {
        try {
            const { pdfPath, text, x, y, pageIndex, outputPath } = options;
            // 读取原始PDF文件
            const existingPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(existingPdfBytes);
            // 获取页面总数
            const pageCount = pdfDoc.getPageCount();
            // 验证页面索引
            if (pageIndex < 0 || pageIndex >= pageCount) {
                throw new Error(`页面索引无效: ${pageIndex}。有效范围: 0-${pageCount - 1}`);
            }
            // 获取指定页面
            const page = pdfDoc.getPage(pageIndex);
            const { width, height } = page.getSize();
            // 验证坐标范围
            if (x < 0 || x > width || y < 0 || y > height) {
                throw new Error(`坐标超出页面范围。页面尺寸: ${width}x${height}, 提供坐标: (${x}, ${y})`);
            }
            // 嵌入字体以支持中文
            let font;
            let finalText = text;
            try {
                // 尝试使用Helvetica字体，如果包含中文则会失败
                font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
                // 测试是否能编码文本
                font.encodeText(text);
            }
            catch (error) {
                // 如果包含中文字符，使用Symbol字体作为fallback
                console.warn('文本包含特殊字符，使用默认字体可能显示异常');
                font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
                // 过滤掉无法编码的字符
                const filteredText = text.split('').filter(char => {
                    try {
                        font.encodeText(char);
                        return true;
                    }
                    catch {
                        return false;
                    }
                }).join('');
                if (filteredText.length === 0) {
                    // 如果所有字符都无法编码，使用默认文本
                    finalText = 'TEXT';
                }
                else {
                    finalText = filteredText;
                }
            }
            // 添加文本到指定位置
            page.drawText(finalText, {
                x: x,
                y: y,
                size: 12, // 默认字体大小
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
                font: font,
            });
            // 保存PDF
            const pdfBytes = await pdfDoc.save();
            // 确保输出目录存在
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            // 写入文件
            fs.writeFileSync(outputPath, pdfBytes);
            console.log(`文本已添加到PDF第${pageIndex + 1}页位置(${x}, ${y}): ${outputPath}`);
        }
        catch (error) {
            console.error('添加文本失败:', error);
            throw new Error(`添加文本失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async createImagesZip(imagePaths, outputZipPath) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputZipPath);
            const archive = archiver.create('zip', {
                zlib: { level: 9 } // 设置压缩级别
            });
            output.on('close', () => {
                console.log(`ZIP文件已创建: ${archive.pointer()} 字节`);
                resolve(outputZipPath);
            });
            archive.on('error', (err) => {
                reject(err);
            });
            archive.pipe(output);
            // 添加所有图片到ZIP文件
            imagePaths.forEach((imagePath, index) => {
                if (fs.existsSync(imagePath)) {
                    const fileName = `page-${index + 1}.png`;
                    archive.file(imagePath, { name: fileName });
                }
            });
            archive.finalize();
        });
    }
}
exports.PdfService = PdfService;
//# sourceMappingURL=pdfService.js.map