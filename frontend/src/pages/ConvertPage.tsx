import React, { useState } from 'react';
import { Upload, Button, Card, Typography, message, Progress } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

export const ConvertPage: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedImages, setConvertedImages] = useState<string[]>([]);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf',
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error('只能上传 PDF 文件！');
      }
      return isPDF;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        setUploading(true);
        setProgress(0);
        
        const formData = new FormData();
        formData.append('pdf', file as File);
        
        // 模拟进度
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);
        
        const response = await fetch('http://localhost:3001/api/pdf/convert-to-images', {
          method: 'POST',
          body: formData,
        });
        
        clearInterval(progressInterval);
        setProgress(100);
        
        if (response.ok) {
          const result = await response.json();
          setConvertedImages(result.images || []);
          onSuccess?.(result);
          message.success('PDF 转换成功！');
        } else {
          throw new Error('转换失败');
        }
      } catch (error) {
        onError?.(error as Error);
        message.error('转换失败，请重试');
      } finally {
        setUploading(false);
      }
    },
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Title level={2}>PDF 转图片</Title>
        <Paragraph className="text-gray-600">
          将 PDF 文档的每一页转换为高质量的图片文件
        </Paragraph>
      </div>

      <Card>
        <Dragger {...uploadProps} disabled={uploading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 PDF 文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个 PDF 文件上传，文件将被转换为图片格式
          </p>
        </Dragger>
        
        {uploading && (
          <div className="mt-4">
            <Progress percent={progress} status="active" />
            <p className="text-center mt-2">正在转换中...</p>
          </div>
        )}
        
        {convertedImages.length > 0 && (
          <div className="mt-6">
            <Title level={4}>转换结果</Title>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {convertedImages.map((image, index) => (
                <div key={index} className="border rounded p-2">
                  <img 
                    src={`http://localhost:3001${image}`} 
                    alt={`Page ${index + 1}`}
                    className="w-full h-auto"
                  />
                  <Button 
                    type="link" 
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `http://localhost:3001${image}`;
                      link.download = `page-${index + 1}.png`;
                      link.click();
                    }}
                  >
                    下载
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};