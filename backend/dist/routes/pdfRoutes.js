"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfRoutes = void 0;
const express_1 = require("express");
const pdfController_1 = require("../controllers/pdfController");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
exports.pdfRoutes = router;
router.post('/watermark', upload_1.upload.single('pdf'), pdfController_1.PDFController.addWatermark);
router.post('/convert-to-images', upload_1.upload.single('pdf'), pdfController_1.PDFController.convertToImages);
router.post('/insert-blank-page', upload_1.upload.single('pdf'), pdfController_1.PDFController.insertBlankPage);
router.post('/add-text', upload_1.upload.single('pdf'), pdfController_1.PDFController.addText);
router.post('/extract-tables', upload_1.upload.single('pdf'), pdfController_1.PDFController.extractTables);
router.get('/download-images-zip/:imageFolder', pdfController_1.PDFController.downloadImagesZip);
router.get('/download/:filename', pdfController_1.PDFController.downloadPdf);
router.get('/download-excel/:filename', pdfController_1.PDFController.downloadExcel);
//# sourceMappingURL=pdfRoutes.js.map