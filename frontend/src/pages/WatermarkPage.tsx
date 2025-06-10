import React, { useState } from 'react';
import { Card, Input, Button, message, Space, Typography } from 'antd';
import { FileUpload } from '../components/FileUpload';
import { pdfService } from '../services/pdfService';

const { Title } = Typography;

export const WatermarkPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleAddWatermark = async () => {
    if (!file || !watermarkText.trim()) {
      message.error('请选择文件并输入水印文字');
      return;
    }

    setLoading(true);
    try {
      const result = await pdfService.addWatermark(file, watermarkText);
      setDownloadUrl(result.downloadUrl);
      message.success('水印添加成功!');
    } catch (error) {
      message.error('添加水印失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = `http://localhost:3001${downloadUrl}`;
      link.download = 'watermarked.pdf';
      link.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Title level={2}>PDF添加水印</Title>
      
      <Card className="mb-6">
        <FileUpload onFileSelect={setFile} />
        
        {file && (
          <div className="mb-4 p-3 bg-green-50 rounded">
            已选择文件: {file.name}
          </div>
        )}
        
        <Space direction="vertical" className="w-full">
          <Input
            placeholder="请输入水印文字"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            size="large"
          />
          
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleAddWatermark}
            disabled={!file || !watermarkText.trim()}
          >
            添加水印
          </Button>
          
          {downloadUrl && (
            <Button
              type="default"
              size="large"
              onClick={handleDownload}
            >
              下载文件
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};