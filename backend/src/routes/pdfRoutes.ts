import { Router } from 'express';
import { PDFController } from '../controllers/pdfController';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/watermark', upload.single('pdf'), PDFController.addWatermark);
router.post('/convert-to-images', upload.single('pdf'), PDFController.convertToImages);
router.post('/insert-blank-page', upload.single('pdf'), PDFController.insertBlankPage);
router.post('/add-text', upload.single('pdf'), PDFController.addText);
router.get('/download-images-zip/:imageFolder', PDFController.downloadImagesZip);

export { router as pdfRoutes };