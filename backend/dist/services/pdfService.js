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
        // 暂时抛出错误，提示需要实现
        throw new Error('addWatermark 方法尚未实现');
    }
    async insertBlankPage(options) {
        // 暂时抛出错误，提示需要实现
        throw new Error('insertBlankPage 方法尚未实现');
    }
    async addText(options) {
        // 暂时抛出错误，提示需要实现
        throw new Error('addText 方法尚未实现');
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