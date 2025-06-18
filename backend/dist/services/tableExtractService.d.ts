interface ExtractTablesOptions {
    pdfPath: string;
    outputPath: string;
}
interface TableData {
    page: number;
    tableIndex: number;
    headers: string[];
    rows: string[][];
}
export declare class TableExtractService {
    extractTables(options: ExtractTablesOptions): Promise<TableData[]>;
    private extractTablesWithOCR;
    private extractTablesFromText;
    private scoreTable;
    private parseTableWithSeparator;
    private preprocessText;
    private tryAlternativeTableExtraction;
    private findSequentialPattern;
    private findKeywordBasedTable;
    private hasNumberTextPattern;
    private smartSplitTableRow;
    private isTableRow;
    private parseTableData;
    private cleanTableRows;
    private checkColumnAlignment;
    private checkNumericPattern;
    private checkHeaderPattern;
    private detectEnhancedTablePatterns;
    private writeToExcel;
}
export {};
//# sourceMappingURL=tableExtractService.d.ts.map