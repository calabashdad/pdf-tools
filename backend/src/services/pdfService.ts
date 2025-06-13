import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as archiver from 'archiver';

interface ConvertToImagesOptions {
    pdfPath: string;
    outputPath: string;
}

interface AddWatermarkOptions {
    pdfPath: string;
    watermarkText: string;
    outputPath: string;
}

interface InsertBlankPageOptions {
    pdfPath: string;
    pageIndex: number;
    outputPath: string;
}

interface AddTextOptions {
    pdfPath: string;
    text: string;
    x: number;
    y: number;
    pageIndex: number;
    outputPath: string;
}

export class PdfService {
    async convertToImages(options: ConvertToImagesOptions): Promise<string[]> {
        try {
            const { pdfPath, outputPath } = options;
            
            // 确保输出目录存在
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
            }

            // 读取PDF文件
            const pdfBuffer = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            const page = await browser.newPage();
            
            const imagePaths: string[] = [];
            
            // 为每一页生成图片
            for (let i = 0; i < pageCount; i++) {
                const imagePath = path.join(outputPath, `page-${i + 1}.png`);
                
                // 获取当前页面的尺寸
                const currentPage = pdfDoc.getPage(i);
                const { width: pageWidth, height: pageHeight } = currentPage.getSize();
                
                // 创建只包含当前页面的新PDF
                const singlePagePdf = await PDFDocument.create();
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
                        path: imagePath as `${string}.png`,
                        type: 'png'
                    });
                } else {
                    // 如果canvas方法失败，回退到页面截图
                    const bodySize = await page.evaluate(() => {
                        const body = (document as any).body;
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
                        path: imagePath as `${string}.png`,
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
        } catch (error) {
            console.error('PDF转图片失败:', error);
            throw new Error(`PDF转图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    
    async addWatermark(options: AddWatermarkOptions): Promise<void> {
        try {
            const { pdfPath, watermarkText, outputPath } = options;
            
            // 读取原始PDF文件
            const existingPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            
            // 获取所有页面
            const pages = pdfDoc.getPages();
            
            // 为每一页添加水印
            for (const page of pages) {
                const { width, height } = page.getSize();
                
                // 设置水印文本样式
                const fontSize = 50;
                const opacity = 0.3;
                
                // 嵌入字体以支持中文
                let font: any;
                let finalWatermarkText = watermarkText;
                try {
                    // 尝试使用Helvetica字体，如果包含中文则会失败
                    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    // 测试是否能编码水印文本
                    font.encodeText(watermarkText);
                } catch (error) {
                    // 如果包含中文字符，使用Symbol字体作为fallback
                    // 注意：这只是临时解决方案，实际应用中应该嵌入支持中文的字体文件
                    console.warn('水印文本包含特殊字符，使用默认字体可能显示异常');
                    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    // 过滤掉无法编码的字符
                    const filteredText = watermarkText.split('').filter(char => {
                        try {
                            font.encodeText(char);
                            return true;
                        } catch {
                            return false;
                        }
                    }).join('');
                    
                    if (filteredText.length === 0) {
                        // 如果所有字符都无法编码，使用默认水印文本
                        finalWatermarkText = 'WATERMARK';
                    } else {
                        finalWatermarkText = filteredText;
                    }
                }
                
                // 计算水印位置（居中并稍微偏下）
                const textWidth = finalWatermarkText.length * fontSize * 0.6; // 估算文本宽度
                const x = (width - textWidth) / 2;
                const y = height / 2 - fontSize / 2;
                
                // 添加水印文本
                page.drawText(finalWatermarkText, {
                    x: x,
                    y: y,
                    size: fontSize,
                    opacity: opacity,
                    rotate: degrees(-45), // 45度倾斜
                    color: rgb(0.7, 0.7, 0.7),
                    font: font,
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
        } catch (error) {
            console.error('添加水印失败:', error);
            throw new Error(`添加水印失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    
    async insertBlankPage(options: InsertBlankPageOptions): Promise<void> {
        try {
            const { pdfPath, pageIndex, outputPath } = options;
            
            // 读取原始PDF文件
            const existingPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            
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
                color: rgb(1, 1, 1),
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
        } catch (error) {
            console.error('插入空白页失败:', error);
            throw new Error(`插入空白页失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    
    async addText(options: AddTextOptions): Promise<void> {
        try {
            const { pdfPath, text, x, y, pageIndex, outputPath } = options;
            
            // 读取原始PDF文件
            const existingPdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            
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
        let font: any;
        let finalText = text;
            try {
                // 尝试使用Helvetica字体，如果包含中文则会失败
                font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                // 测试是否能编码文本
                font.encodeText(text);
            } catch (error) {
                // 如果包含中文字符，使用Symbol字体作为fallback
                console.warn('文本包含特殊字符，使用默认字体可能显示异常');
                font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                // 过滤掉无法编码的字符
                const filteredText = text.split('').filter(char => {
                    try {
                        font.encodeText(char);
                        return true;
                    } catch {
                        return false;
                    }
                }).join('');
                
                if (filteredText.length === 0) {
                    // 如果所有字符都无法编码，使用默认文本
                    finalText = 'TEXT';
                } else {
                    finalText = filteredText;
                }
            }
            
            // 添加文本到指定位置
            page.drawText(finalText, {
                x: x,
                y: y,
                size: 12, // 默认字体大小
                color: rgb(0, 0, 0),
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
        } catch (error) {
            console.error('添加文本失败:', error);
            throw new Error(`添加文本失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    
    async createImagesZip(imagePaths: string[], outputZipPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputZipPath);
            const archive = archiver.create('zip', {
            zlib: { level: 9 } // 设置压缩级别
        });
            
            output.on('close', () => {
                console.log(`ZIP文件已创建: ${archive.pointer()} 字节`);
                resolve(outputZipPath);
            });
            
            archive.on('error', (err: Error) => {
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