"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    console.error('错误:', error);
    if (error.message.includes('只允许上传PDF文件')) {
        return res.status(400).json({ error: '只允许上传PDF文件' });
    }
    if (error.message.includes('File too large')) {
        return res.status(400).json({ error: '文件大小超过限制' });
    }
    res.status(500).json({ error: '服务器内部错误' });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map