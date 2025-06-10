import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';

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
            
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            
            const imagePaths: string[] = [];
            
            // 为每一页生成图片
            for (let i = 0; i < pageCount; i++) {
                const imagePath = path.join(outputPath, `page-${i + 1}.png`);
                
                // 创建只包含当前页面的新PDF
                const singlePagePdf = await PDFDocument.create();
                const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
                singlePagePdf.addPage(copiedPage);
                
                // 将单页PDF转换为base64
                const pdfBytes = await singlePagePdf.save();
                const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
                
                // 使用puppeteer渲染PDF
                const html = `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <style>
                                body { margin: 0; padding: 0; }
                                embed { width: 100vw; height: 100vh; }
                            </style>
                        </head>
                        <body>
                            <embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
                        </body>
                    </html>
                `;
                
                await page.setContent(html);
                await page.setViewport({ width: 1200, height: 1600 });
                // 使用 Promise 替代，更兼容各版本 Puppeteer
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待PDF加载
                await page.screenshot({ 
                    path: imagePath as `${string}.png`, 
                    fullPage: false,
                    clip: { x: 0, y: 0, width: 1200, height: 1600 }
                });
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
        // 暂时抛出错误，提示需要实现
        throw new Error('addWatermark 方法尚未实现');
    }
    
    async insertBlankPage(options: InsertBlankPageOptions): Promise<void> {
        // 暂时抛出错误，提示需要实现
        throw new Error('insertBlankPage 方法尚未实现');
    }
    
    async addText(options: AddTextOptions): Promise<void> {
        // 暂时抛出错误，提示需要实现
        throw new Error('addText 方法尚未实现');
    }
}