import React from 'react';
import { Card, Row, Col, Button, Typography } from 'antd';
import { FileTextOutlined, EditOutlined, PictureOutlined, ToolOutlined, TableOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'PDF 水印',
      description: '为您的 PDF 文档添加文字或图片水印',
      icon: <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      path: '/watermark'
    },
    {
      title: 'PDF 转图片',
      description: '将 PDF 页面转换为高质量图片',
      icon: <PictureOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      path: '/convert'
    },
    {
      title: 'PDF 编辑',
      description: '编辑 PDF 内容，添加文本和页面',
      icon: <EditOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
      path: '/edit'
    },
    {
      title: '表格提取',
      description: '提取PDF中的表格并导出为Excel文件',
      icon: <TableOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
      path: '/table-extract'
    }
  ];

  return (
    <div className="p-8">
      <div className="text-center mb-12">
        <Title level={1}>PDF 工具箱</Title>
        <Paragraph className="text-lg text-gray-600">
          专业的 PDF 处理工具，支持水印添加、格式转换和内容编辑
        </Paragraph>
      </div>

      <Row gutter={[24, 24]} justify="center">
        {features.map((feature, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              hoverable
              className="text-center h-full"
              onClick={() => navigate(feature.path)}
            >
              <div className="mb-4">{feature.icon}</div>
              <Title level={3}>{feature.title}</Title>
              <Paragraph className="text-gray-600">
                {feature.description}
              </Paragraph>
              <Button type="primary" size="large">
                开始使用
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};