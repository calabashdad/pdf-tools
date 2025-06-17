import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileTextOutlined, PictureOutlined, EditOutlined, HomeOutlined, TableOutlined } from '@ant-design/icons';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/watermark',
      icon: <FileTextOutlined />,
      label: '添加水印'
    },
    {
      key: '/convert',
      icon: <PictureOutlined />,
      label: 'PDF转图片'
    },
    {
      key: '/edit',
      icon: <EditOutlined />,
      label: '编辑PDF'
    },
    {
      key: '/table-extract',
      icon: <TableOutlined />,
      label: '表格提取'
    }
  ];

  return (
    <div className="flex items-center justify-between">
      <div className="text-xl font-bold text-blue-600">
        PDF编辑工具
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        className="border-none"
      />
    </div>
  );
};