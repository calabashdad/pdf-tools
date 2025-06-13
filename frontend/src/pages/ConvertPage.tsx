import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Card, Typography, message, Progress, Modal } from 'antd';
import { InboxOutlined, EyeOutlined, CloudDownloadOutlined, ZoomInOutlined, ZoomOutOutlined, UndoOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { pdfService } from '../services/pdfService';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

export const ConvertPage: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedImages, setConvertedImages] = useState<string[]>([]);
  const [imageFolder, setImageFolder] = useState<string>('');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

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
          // 从第一个图片URL中提取文件夹名称
          if (result.images && result.images.length > 0) {
            const firstImagePath = result.images[0];
            const folderMatch = firstImagePath.match(/\/uploads\/images\/([^\/]+)\//); 
            if (folderMatch) {
              setImageFolder(folderMatch[1]);
            }
          }
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
  
  const handleDownloadAll = async () => {
    if (!imageFolder) {
      message.error('没有可下载的图片');
      return;
    }
    
    try {
      setDownloadingZip(true);
      const blob = await pdfService.downloadImagesZip(imageFolder);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${imageFolder}-images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('所有图片下载成功！');
    } catch (error) {
      message.error('下载失败，请重试');
    } finally {
      setDownloadingZip(false);
    }
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
            <div className="flex justify-between items-center mb-4">
              <Title level={4}>转换结果</Title>
              <Button 
                type="primary" 
                icon={<CloudDownloadOutlined />}
                onClick={handleDownloadAll}
                loading={downloadingZip}
                size="large"
              >
                一键下载所有图片
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {convertedImages.map((image, index) => (
                <div key={index} className="border rounded p-2 cursor-pointer hover:shadow-lg transition-shadow">
                  <img 
                    src={`http://localhost:3001${image}`} 
                    alt={`Page ${index + 1}`}
                    className="w-full h-auto hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setPreviewImage(`http://localhost:3001${image}`);
                      setPreviewTitle(`第 ${index + 1} 页`);
                      setPreviewVisible(true);
                    }}
                  />
                  <div className="text-center mt-2 text-sm text-gray-600">
                    第 {index + 1} 页
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      <Modal
        open={previewVisible}
        title={
          <div className="flex justify-between items-center">
            <span>{previewTitle}</span>
            <div className="flex gap-2">
              <Button 
                size="small" 
                icon={<ZoomOutOutlined />} 
                onClick={() => setScale(prev => Math.max(0.1, prev - 0.1))}
                disabled={scale <= 0.1}
              />
              <span className="text-sm px-2 py-1">{Math.round(scale * 100)}%</span>
              <Button 
                size="small" 
                icon={<ZoomInOutlined />} 
                onClick={() => setScale(prev => Math.min(5, prev + 0.1))}
                disabled={scale >= 5}
              />
              <Button 
                 size="small" 
                 icon={<UndoOutlined />} 
                 onClick={() => {
                   setScale(1);
                   setImagePosition({ x: 0, y: 0 });
                 }}
               />
            </div>
          </div>
        }
        footer={null}
        onCancel={() => {
           setPreviewVisible(false);
           setScale(1);
           setImagePosition({ x: 0, y: 0 });
         }}
        width={900}
        centered
        styles={{
           body: {
             maxHeight: '80vh',
             overflow: 'hidden',
             padding: '20px'
           }
         }}
      >
        <div 
           className="flex justify-center items-center"
           style={{ 
             height: '60vh',
             overflow: 'hidden',
             cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default')
           }}
           onWheel={(e) => {
             e.preventDefault();
             const delta = e.deltaY > 0 ? -0.1 : 0.1;
             setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
           }}
           onMouseDown={(e) => {
             if (scale > 1) {
               setIsDragging(true);
               setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
             }
           }}
           onMouseMove={(e) => {
             if (isDragging && scale > 1) {
               setImagePosition({
                 x: e.clientX - dragStart.x,
                 y: e.clientY - dragStart.y
               });
             }
           }}
           onMouseUp={() => {
             setIsDragging(false);
           }}
           onMouseLeave={() => {
             setIsDragging(false);
           }}
         >
           <img 
             ref={imageRef}
             src={previewImage} 
             alt={previewTitle}
             style={{ 
               transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${scale})`,
               transformOrigin: 'center',
               transition: isDragging ? 'none' : 'transform 0.1s ease-out',
               maxWidth: 'none',
               height: 'auto',
               userSelect: 'none'
             }}
             draggable={false}
           />
         </div>
      </Modal>
    </div>
  );
};