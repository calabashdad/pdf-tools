import { Router } from 'express';
import { PDFController } from '../controllers/pdfController';
import { upload } from '../app';

const router = Router();

router.post('/watermark', upload.single('pdf'), PDFController.addWatermark);
router.post('/convert-to-images', upload.single('pdf'), PDFController.convertToImages);
router.post('/insert-blank-page', upload.single('pdf'), PDFController.insertBlankPage);
router.post('/add-text', upload.single('pdf'), PDFController.addText);

export { router as pdfRoutes };