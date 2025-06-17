import React, { useState } from 'react';
import { Card, Button, message, Typography, Progress, Table, Space, Alert } from 'antd';
import { FileUpload } from '../components/FileUpload';
import { pdfService } from '../services/pdfService';
import { DownloadOutlined, TableOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface TableData {
  page: number;
  tableIndex: number;
  headers: string[];
  rows: string[][];
}

export const TableExtractPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedTables, setExtractedTables] = useState<TableData[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExtractTables = async () => {
    if (!file) {
      message.error('请选择PDF文件');
      return;
    }

    setLoading(true);
    setProgress(0);
    
    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);

      const result = await pdfService.extractTables(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setExtractedTables(result.tables);
      setDownloadUrl(result.downloadUrl);
      
      if (result.tables.length === 0) {
        message.warning(result.message || '未在PDF中检测到表格结构');
      } else {
        message.success(result.message || '表格提取成功！');
      }
    } catch (error: any) {
      message.error('表格提取失败: ' + (error?.message || '未知错误'));
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
        link.download = 'extracted_tables.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        message.success('Excel文件下载成功!');
      } catch (error) {
        message.error('下载失败，请重试');
      }
    }
  };

  const renderTable = (tableData: TableData, index: number) => {
    const columns = tableData.headers.map((header, idx) => ({
      title: header || `列 ${idx + 1}`,
      dataIndex: idx.toString(),
      key: idx.toString(),
      width: 150,
    }));

    const dataSource = tableData.rows.map((row, rowIdx) => {
      const rowData: any = { key: rowIdx };
      row.forEach((cell, cellIdx) => {
        rowData[cellIdx.toString()] = cell;
      });
      return rowData;
    });

    return (
      <Card 
        key={index}
        title={`第 ${tableData.page} 页 - 表格 ${tableData.tableIndex + 1}`}
        className="mb-4"
        size="small"
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: true, y: 300 }}
          size="small"
          bordered
        />
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="mb-6">
        <div className="text-center mb-6">
          <TableOutlined className="text-4xl text-blue-500 mb-4" />
          <Title level={2}>PDF表格提取</Title>
          <p className="text-gray-600">将PDF文档中的表格提取并导出为Excel文件</p>
        </div>

        <div className="mb-6">
          <FileUpload
            onFileSelect={setFile}
            accept=".pdf"
          />
        </div>

        {loading && (
          <div className="mb-6">
            <Progress percent={progress} status="active" />
            <p className="text-center mt-2">正在提取表格...</p>
          </div>
        )}

        <div className="text-center">
          <Space size="large">
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleExtractTables}
              disabled={!file}
              icon={<TableOutlined />}
            >
              提取表格
            </Button>

            {downloadUrl && extractedTables.length > 0 && (
              <Button
                type="default"
                size="large"
                onClick={handleDownload}
                icon={<DownloadOutlined />}
              >
                下载Excel文件
              </Button>
            )}
          </Space>
        </div>
        
        {/* 无表格提示 */}
        {!loading && extractedTables.length === 0 && file && (
          <div className="mt-6">
            <Alert
              message="未检测到表格"
              description="PDF中没有检测到表格结构。请确保PDF包含清晰的表格格式，如：行列对齐的数据、明显的分隔符等。"
              type="info"
              showIcon
            />
          </div>
        )}
      </Card>

      {extractedTables.length > 0 && (
        <Card title={`提取结果 (共 ${extractedTables.length} 个表格)`} className="mb-6">
          <div className="max-h-96 overflow-y-auto">
            {extractedTables.map((table, index) => renderTable(table, index))}
          </div>
        </Card>
      )}
    </div>
  );
};