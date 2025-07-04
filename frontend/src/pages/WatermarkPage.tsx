import React, { useState } from 'react';
import { Card, Input, Button, message, Space, Typography, Slider, Row, Col } from 'antd';
import { FileUpload } from '../components/FileUpload';
import { pdfService } from '../services/pdfService';

const { Title } = Typography;

export const WatermarkPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('');
  const [rotation, setRotation] = useState(-45);
  const [opacity, setOpacity] = useState(0.3);
  const [repeatCount, setRepeatCount] = useState(3);
  const [fontSize, setFontSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleAddWatermark = async () => {
    if (!file || !watermarkText.trim()) {
      message.error('请选择文件并输入水印文字');
      return;
    }

    setLoading(true);
    try {
      const result = await pdfService.addWatermark(file, watermarkText, rotation, opacity, repeatCount, fontSize);
      setDownloadUrl(result.downloadUrl);
      message.success('水印添加成功!');
    } catch (error: any) {
      message.error('添加水印失败: ' + (error?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (downloadUrl) {
      try {
        const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `http://localhost:3001${downloadUrl}`;
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error('下载失败');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'watermarked.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        message.success('文件下载成功!');
      } catch (error) {
        message.error('下载失败，请重试');
      }
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
          
          <Row gutter={16}>
            <Col span={6}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  旋转角度: {rotation}°
                </label>
                <Slider
                  min={-180}
                  max={180}
                  step={5}
                  value={rotation}
                  onChange={setRotation}
                  tooltip={{ formatter: (value) => `${value || 0}°` }}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  透明度: {Math.round(opacity * 100)}%
                </label>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={opacity}
                  onChange={setOpacity}
                  tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重复次数: {repeatCount}个
                </label>
                <Slider
                  min={1}
                  max={9}
                  step={1}
                  value={repeatCount}
                  onChange={setRepeatCount}
                  tooltip={{ formatter: (value) => `${value || 1}个` }}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  字体大小: {fontSize}px
                </label>
                <Slider
                  min={12}
                  max={120}
                  step={2}
                  value={fontSize}
                  onChange={setFontSize}
                  tooltip={{ formatter: (value) => `${value || 50}px` }}
                />
              </div>
            </Col>
          </Row>
          
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
            <div className="mt-4">
              <div className="mb-4">
                <Title level={4}>预览效果</Title>
                <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                  <iframe
                    src={downloadUrl.startsWith('http') ? `${downloadUrl}?preview=true` : `http://localhost:3001${downloadUrl}?preview=true`}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="PDF预览"
                  />
                </div>
              </div>
              <Button
                type="default"
                size="large"
                onClick={handleDownload}
              >
                下载文件
              </Button>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};