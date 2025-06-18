import { Request, Response } from 'express';
export declare class PDFController {
    static addWatermark(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static convertToImages(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static insertBlankPage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static addText(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static downloadImagesZip(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static downloadPdf(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=pdfController.d.ts.map