import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import archiver from 'archiver';

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
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            const imagePaths: string[] = [];
            
            // 为每一页生成图片
            for (let i = 0; i < pageCount; i++) {
                const imagePath = path.join(outputPath, `page-${i + 1}.png`);
                
                // 获取当前页面的尺寸
                const currentPage = pdfDoc.getPage(i);
                const { width: pageWidth, height: pageHeight } = currentPage.getSize();
                
                // 计算合适的视口尺寸，保持PDF页面的宽高比
                const scale = 2; // 提高分辨率
                const viewportWidth = Math.round(pageWidth * scale);
                const viewportHeight = Math.round(pageHeight * scale);
                
                // 创建只包含当前页面的新PDF
                const singlePagePdf = await PDFDocument.create();
                const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
                singlePagePdf.addPage(copiedPage);
                
                // 将单页PDF转换为base64
                const pdfBytes = await singlePagePdf.save();
                const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
                
                // 使用puppeteer渲染PDF，移除侧边空白
                const html = `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                    margin: 0; 
                                    padding: 0; 
                                    width: 100vw; 
                                    height: 100vh;
                                    overflow: hidden;
                                }
                                embed { 
                                    width: 100%; 
                                    height: 100%; 
                                    border: none;
                                    display: block;
                                }
                            </style>
                        </head>
                        <body>
                            <embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
                        </body>
                    </html>
                `;
                
                await page.setContent(html);
                await page.setViewport({ 
                    width: viewportWidth, 
                    height: viewportHeight,
                    deviceScaleFactor: 1
                });
                
                // 等待PDF加载完成
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 截图，使用完整页面尺寸，避免侧边空白
                await page.screenshot({ 
                    path: imagePath as `${string}.png`, 
                    fullPage: true,
                    type: 'png',
                    omitBackground: false
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
    
    async createImagesZip(imagePaths: string[], outputZipPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputZipPath);
            const archive = archiver('zip', {
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