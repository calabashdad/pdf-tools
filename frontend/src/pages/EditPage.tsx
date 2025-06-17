import React, { useState } from 'react';
import { Upload, Button, Card, Typography, Form, Input, InputNumber, message, Space } from 'antd';
import { InboxOutlined, DownloadOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

export const EditPage: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [editedPdfUrl, setEditedPdfUrl] = useState<string>('');
  const [form] = Form.useForm();

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf',
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error('只能上传 PDF 文件！');
        return false;
      }
      setPdfFile(file as File);
      return false; // 阻止自动上传
    },
  };

  const handleAddText = async (values: any) => {
    if (!pdfFile) {
      message.error('请先上传 PDF 文件');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('text', values.text);
      formData.append('x', values.x.toString());
      formData.append('y', values.y.toString());
      formData.append('page', (values.page - 1).toString()); // 转换为0索引

      const response = await fetch('http://localhost:3001/api/pdf/add-text', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setEditedPdfUrl(url);
        message.success('文本添加成功！');
      } else {
        throw new Error('添加文本失败');
      }
    } catch (error) {
      message.error('添加文本失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleAddBlankPage = async () => {
    if (!pdfFile) {
      message.error('请先上传 PDF 文件');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const response = await fetch('http://localhost:3001/api/pdf/insert-blank-page', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setEditedPdfUrl(url);
        message.success('空白页添加成功！');
      } else {
        throw new Error('添加空白页失败');
      }
    } catch (error) {
      message.error('添加空白页失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Title level={2}>PDF 编辑</Title>
        <Paragraph className="text-gray-600">
          编辑 PDF 文档，添加文本内容或插入空白页
        </Paragraph>
      </div>

      <Space direction="vertical" size="large" className="w-full">
        <Card title="上传 PDF 文件">
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽 PDF 文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个 PDF 文件上传
            </p>
          </Dragger>
          {pdfFile && (
            <p className="mt-2 text-green-600">已选择文件: {pdfFile.name}</p>
          )}
        </Card>

        <Card title="添加文本" extra={<EditOutlined />}>
          <Form form={form} onFinish={handleAddText} layout="vertical">
            <Form.Item
              name="text"
              label="文本内容"
              rules={[{ required: true, message: '请输入要添加的文本' }]}
            >
              <TextArea rows={3} placeholder="输入要添加到 PDF 的文本" />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item
                name="page"
                label="页码"
                rules={[{ required: true, message: '请输入页码' }]}
                initialValue={1}
              >
                <InputNumber min={1} placeholder="页码" className="w-full" />
              </Form.Item>
              <Form.Item
                name="x"
                label="X 坐标"
                rules={[{ required: true, message: '请输入 X 坐标' }]}
                initialValue={50}
              >
                <InputNumber min={0} placeholder="X 坐标" className="w-full" />
              </Form.Item>
              <Form.Item
                name="y"
                label="Y 坐标"
                rules={[{ required: true, message: '请输入 Y 坐标' }]}
                initialValue={50}
              >
                <InputNumber min={0} placeholder="Y 坐标" className="w-full" />
              </Form.Item>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={uploading}>
                添加文本
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="插入空白页" extra={<PlusOutlined />}>
          <Paragraph className="text-gray-600 mb-4">
            在 PDF 文档末尾插入一个空白页
          </Paragraph>
          <Button 
            type="primary" 
            onClick={handleAddBlankPage} 
            loading={uploading}
            disabled={!pdfFile}
          >
            插入空白页
          </Button>
        </Card>

        {editedPdfUrl && (
          <Card title="编辑结果">
            <div className="text-center">
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                size="large"
                onClick={async () => {
                  try {
                    const fullUrl = editedPdfUrl.startsWith('http') ? editedPdfUrl : `http://localhost:3001${editedPdfUrl}`;
                    const response = await fetch(fullUrl);
                    if (!response.ok) {
                      throw new Error('下载失败');
                    }
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'edited.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    message.success('文件下载成功!');
                  } catch (error) {
                    message.error('下载失败，请重试');
                  }
                }}
              >
                下载编辑后的 PDF
              </Button>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};