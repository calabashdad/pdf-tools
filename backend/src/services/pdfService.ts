import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import pdf2pic from 'pdf2pic';

export class PDFService {
  // 添加水印
  static async addWatermark(
    inputPath: string, 
    watermarkText: string, 
    outputPath: string
  ): Promise<void> {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // 添加水印文字
        page.drawText(watermarkText, {
          x: width / 2 - 100,
          y: height / 2,
          size: 30,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.3,
          rotate: { angle: 45 * (Math.PI / 180) }
        });
      });
      
      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, modifiedPdfBytes);
    } catch (error) {
      throw new Error(`添加水印失败: ${error.message}`);
    }
  }
  
  // PDF转图片
  static async convertToImages(
    inputPath: string, 
    outputDir: string
  ): Promise<string[]> {
    try {
      const convert = pdf2pic.fromPath(inputPath, {
        density: 300,
        saveFilename: "page",
        savePath: outputDir,
        format: "png",
        width: 2000,
        height: 2000
      });
      
      const results = await convert.bulk(-1);
      return results.map(result => result.path);
    } catch (error) {
      throw new Error(`PDF转图片失败: ${error.message}`);
    }
  }
  
  // 插入空白页
  static async insertBlankPage(
    inputPath: string, 
    pageIndex: number, 
    outputPath: string
  ): Promise<void> {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const blankPage = pdfDoc.insertPage(pageIndex);
      blankPage.setSize(595.28, 841.89); // A4 size
      
      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, modifiedPdfBytes);
    } catch (error) {
      throw new Error(`插入空白页失败: ${error.message}`);
    }
  }
  
  // 添加文字
  static async addText(
    inputPath: string,
    text: string,
    x: number,
    y: number,
    pageIndex: number,
    outputPath: string
  ): Promise<void> {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const page = pdfDoc.getPage(pageIndex);
      
      page.drawText(text, {
        x,
        y,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, modifiedPdfBytes);
    } catch (error) {
      throw new Error(`添加文字失败: ${error.message}`);
    }
  }
}