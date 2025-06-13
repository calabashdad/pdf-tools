"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFController = void 0;
const pdfService_1 = require("../services/pdfService");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
class PDFController {
    // 添加水印
    static async addWatermark(req, res) {
        try {
            const { watermarkText } = req.body;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: '请上传PDF文件' });
            }
            const inputPath = file.path;
            const outputPath = path_1.default.join('uploads', `watermarked-${file.filename}`);
            const pdfService = new pdfService_1.PdfService();
            await pdfService.addWatermark({ pdfPath: inputPath, watermarkText, outputPath });
            res.json({
                message: '水印添加成功',
                downloadUrl: `/uploads/watermarked-${file.filename}`
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '添加水印时发生未知错误';
            res.status(500).json({ error: errorMessage });
        }
    }
    // PDF转图片
    static async convertToImages(req, res) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: '请上传PDF文件' });
            }
            const inputPath = file.path;
            const outputDir = path_1.default.join('uploads', 'images', path_1.default.parse(file.filename).name);
            // 创建输出目录 - 使用fsPromises
            await fs_2.promises.mkdir(outputDir, { recursive: true });
            const pdfService = new pdfService_1.PdfService();
            const imagePaths = await pdfService.convertToImages({ pdfPath: inputPath, outputPath: outputDir });
            const imageUrls = imagePaths.map((imagePath) => `/uploads/images/${path_1.default.parse(file.filename).name}/${path_1.default.basename(imagePath)}`);
            res.json({
                message: 'PDF转图片成功',
                images: imageUrls
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'PDF转图片时发生未知错误';
            res.status(500).json({ error: errorMessage });
        }
    }
    // 插入空白页
    static async insertBlankPage(req, res) {
        try {
            const { pageIndex } = req.body;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: '请上传PDF文件' });
            }
            const inputPath = file.path;
            const outputPath = path_1.default.join('uploads', `blank-page-${file.filename}`);
            const pdfService = new pdfService_1.PdfService();
            await pdfService.insertBlankPage({ pdfPath: inputPath, pageIndex: parseInt(pageIndex), outputPath });
            res.json({
                message: '空白页插入成功',
                downloadUrl: `/uploads/${path_1.default.basename(outputPath)}`
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '插入空白页时发生未知错误';
            res.status(500).json({ error: errorMessage });
        }
    }
    // 添加文字
    static async addText(req, res) {
        try {
            const { text, x, y, pageIndex } = req.body;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: '请上传PDF文件' });
            }
            const inputPath = file.path;
            const outputPath = path_1.default.join('uploads', `text-added-${file.filename}`);
            const pdfService = new pdfService_1.PdfService();
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
                downloadUrl: `/uploads/${path_1.default.basename(outputPath)}`
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '添加文字时发生未知错误';
            res.status(500).json({ error: errorMessage });
        }
    }
    // 下载所有转换的图片为ZIP文件
    static async downloadImagesZip(req, res) {
        try {
            const { imageFolder } = req.params;
            if (!imageFolder) {
                return res.status(400).json({ error: '请提供图片文件夹名称' });
            }
            const imagesDir = path_1.default.join('uploads', 'images', imageFolder);
            if (!fs_1.default.existsSync(imagesDir)) {
                return res.status(404).json({ error: '图片文件夹不存在' });
            }
            // 获取文件夹中的所有PNG文件
            const files = fs_1.default.readdirSync(imagesDir);
            const imagePaths = files
                .filter((file) => file.endsWith('.png'))
                .map((file) => path_1.default.join(imagesDir, file));
            if (imagePaths.length === 0) {
                return res.status(404).json({ error: '没有找到图片文件' });
            }
            const zipFileName = `${imageFolder}-images.zip`;
            const zipPath = path_1.default.join('uploads', 'temp', zipFileName);
            // 确保临时目录存在
            await fs_2.promises.mkdir(path_1.default.dirname(zipPath), { recursive: true });
            const pdfService = new pdfService_1.PdfService();
            await pdfService.createImagesZip(imagePaths, zipPath);
            // 设置响应头
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
            // 发送文件
            const fileStream = fs_1.default.createReadStream(zipPath);
            fileStream.pipe(res);
            // 文件发送完成后删除临时ZIP文件
            fileStream.on('end', () => {
                fs_1.default.unlink(zipPath, (err) => {
                    if (err)
                        console.error('删除临时ZIP文件失败:', err);
                });
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建ZIP文件时发生未知错误';
            res.status(500).json({ error: errorMessage });
        }
    }
}
exports.PDFController = PDFController;
//# sourceMappingURL=pdfController.js.map