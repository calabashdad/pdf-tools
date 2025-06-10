import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  accept = '.pdf' 
}) => {
  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept,
    beforeUpload: (file) => {
      if (file.type !== 'application/pdf') {
        message.error('只能上传PDF文件!');
        return false;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        message.error('文件大小不能超过50MB!');
        return false;
      }
      
      onFileSelect(file);
      return false; // 阻止自动上传
    },
    onDrop(e) {
      console.log('拖拽文件', e.dataTransfer.files);
    },
  };

  return (
    <Dragger {...uploadProps} className="mb-4">
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">点击或拖拽PDF文件到此区域上传</p>
      <p className="ant-upload-hint">
        支持单个文件上传，文件大小不超过50MB
      </p>
    </Dragger>
  );
};