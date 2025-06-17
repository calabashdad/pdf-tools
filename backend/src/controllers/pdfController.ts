import { Request, Response } from 'express';
import { PdfService } from '../services/pdfService';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

export class PDFController {
  // 添加水印
  static async addWatermark(req: Request, res: Response) {
    try {
      const { watermarkText } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: '请上传PDF文件' });
      }
      
      const inputPath = file.path;
      const outputPath = path.join('uploads', `watermarked-${file.filename}`);
      
      const pdfService = new PdfService();
      await pdfService.addWatermark({ pdfPath: inputPath, watermarkText, outputPath });
      
      res.json({
        message: '水印添加成功',
        downloadUrl: `/api/pdf/download/watermarked-${file.filename}`,
        filename: `watermarked-${file.filename}`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加水印时发生未知错误';
      res.status(500).json({ error: errorMessage });
    }
  }
  
  // PDF转图片
  static async convertToImages(req: Request, res: Response) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: '请上传PDF文件' });
      }
      
      const inputPath = file.path;
      const outputDir = path.join('uploads', 'images', path.parse(file.filename).name);
      
      // 创建输出目录 - 使用fsPromises
      await fsPromises.mkdir(outputDir, { recursive: true });
      
      const pdfService = new PdfService();
      const imagePaths = await pdfService.convertToImages({ pdfPath: inputPath, outputPath: outputDir });
      
      const imageUrls = imagePaths.map((imagePath: string) => 
        `/uploads/images/${path.parse(file.filename).name}/${path.basename(imagePath)}`
      );
      
      res.json({
        message: 'PDF转图片成功',
        images: imageUrls
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF转图片时发生未知错误';
      res.status(500).json({ error: errorMessage });
    }
  }
  
  // 插入空白页
  static async insertBlankPage(req: Request, res: Response) {
    try {
      const { pageIndex } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: '请上传PDF文件' });
      }
      
      const inputPath = file.path;
      const outputPath = path.join('uploads', `blank-page-${file.filename}`);
      
      const pdfService = new PdfService();
      await pdfService.insertBlankPage({ pdfPath: inputPath, pageIndex: parseInt(pageIndex), outputPath });
      
      res.json({
        message: '空白页插入成功',
        downloadUrl: `/api/pdf/download/${path.basename(outputPath)}`,
        filename: path.basename(outputPath)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '插入空白页时发生未知错误';
      res.status(500).json({ error: errorMessage });
    }
  }
  
  // 添加文字
  static async addText(req: Request, res: Response) {
    try {
      const { text, x, y, pageIndex } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: '请上传PDF文件' });
      }
      
      const inputPath = file.path;
      const outputPath = path.join('uploads', `text-added-${file.filename}`);
      
      const pdfService = new PdfService();
      await pdfService.addText({
        pdfPath: inputPath,
        text,
        x: parseInt(x),
        y: parseInt(y),
        pageIndex: parseInt(pageIndex),
        outputPath
      });
      
      res.json({
        message: '文字添加成功',
        downloadUrl: `/api/pdf/download/${path.basename(outputPath)}`,
        filename: path.basename(outputPath)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加文字时发生未知错误';
      res.status(500).json({ error: errorMessage });
    }
  }
  
  // 下载所有转换的图片为ZIP文件
  static async downloadImagesZip(req: Request, res: Response) {
    try {
      const { imageFolder } = req.params;
      
      if (!imageFolder) {
        return res.status(400).json({ error: '请提供图片文件夹名称' });
      }
      
      const imagesDir = path.join('uploads', 'images', imageFolder);
      
      if (!fs.existsSync(imagesDir)) {
        return res.status(404).json({ error: '图片文件夹不存在' });
      }
      
      // 获取文件夹中的所有PNG文件
      const files = fs.readdirSync(imagesDir);
      const imagePaths = files
        .filter((file: string) => file.endsWith('.png'))
        .map((file: string) => path.join(imagesDir, file));
      
      if (imagePaths.length === 0) {
        return res.status(404).json({ error: '没有找到图片文件' });
      }
      
      const zipFileName = `${imageFolder}-images.zip`;
      const zipPath = path.join('uploads', 'temp', zipFileName);
      
      // 确保临时目录存在
      await fsPromises.mkdir(path.dirname(zipPath), { recursive: true });
      
      const pdfService = new PdfService();
      await pdfService.createImagesZip(imagePaths, zipPath);
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
      
      // 发送文件
      const fileStream = fs.createReadStream(zipPath);
      fileStream.pipe(res);
      
      // 文件发送完成后删除临时ZIP文件
      fileStream.on('end', () => {
        fs.unlink(zipPath, (err: any) => {
          if (err) console.error('删除临时ZIP文件失败:', err);
        });
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建ZIP文件时发生未知错误';
      res.status(500).json({ error: errorMessage });
    }
  }

  // 下载PDF文件
  static async downloadPdf(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json({ error: '请提供文件名' });
      }

      const filePath = path.join('uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
      }

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // 发送文件
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('文件流错误:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: '文件下载失败' });
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载文件时发生未知错误';
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      }
    }
  }
}