"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pdfRoutes_1 = require("./routes/pdfRoutes");
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static('uploads'));
// 路由
app.use('/api/pdf', pdfRoutes_1.pdfRoutes);
// 错误处理
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});
//# sourceMappingURL=app.js.map