import express from 'express';
import cors from 'cors';
import { pdfRoutes } from './routes/pdfRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// 路由
app.use('/api/pdf', pdfRoutes);

// 错误处理
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});