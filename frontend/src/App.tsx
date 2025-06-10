import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { WatermarkPage } from './pages/WatermarkPage';
import { ConvertPage } from './pages/ConvertPage';
import { EditPage } from './pages/EditPage';
import 'antd/dist/reset.css';
import './App.css';

const { Header, Content } = Layout;

function App() {
  return (
    <Router>
      <Layout className="min-h-screen">
        <Header className="bg-white shadow-sm">
          <Navbar />
        </Header>
        <Content className="p-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/watermark" element={<WatermarkPage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/edit" element={<EditPage />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;