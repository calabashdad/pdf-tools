import { Request, Response } from 'express';
import { PDFService } from '../services/pdfService';
import path from 'path';
import fs from 'fs/promises';

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
      
      await PDFService.addWatermark(inputPath, watermarkText, outputPath);
      
      res.json({
        message: '水印添加成功',
        downloadUrl: `/uploads/${path.basename(outputPath)}`
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
      
      // 创建输出目录
      await fs.mkdir(outputDir, { recursive: true });
      
      const imagePaths = await PDFService.convertToImages(inputPath, outputDir);
      
      const imageUrls = imagePaths.map(imagePath => 
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
      
      await PDFService.insertBlankPage(inputPath, parseInt(pageIndex), outputPath);
      
      res.json({
        message: '空白页插入成功',
        downloadUrl: `/uploads/${path.basename(outputPath)}`
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
      
      await PDFService.addText(
        inputPath, 
        text, 
        parseInt(x), 
        parseInt(y), 
        parseInt(pageIndex), 
        outputPath
      );
      
      res.json({
        message: '文字添加成功',
        downloadUrl: `/uploads/${path.basename(outputPath)}`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加文字时发生未知错误';
      res.status(500).json({ error: errorMessage });
    }
  }
}