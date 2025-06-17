const API_BASE_URL = 'http://localhost:3001/api/pdf';

export const pdfService = {
  async addWatermark(file: File, watermarkText: string, rotation?: number, opacity?: number, repeatCount?: number, fontSize?: number) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('watermarkText', watermarkText);
    
    if (rotation !== undefined) {
      formData.append('rotation', rotation.toString());
    }
    
    if (opacity !== undefined) {
      formData.append('opacity', opacity.toString());
    }
    
    if (repeatCount !== undefined) {
      formData.append('repeatCount', repeatCount.toString());
    }
    
    if (fontSize !== undefined) {
      formData.append('fontSize', fontSize.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/watermark`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    return response.json();
  },
  
  async convertToImages(file: File) {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch(`${API_BASE_URL}/convert-to-images`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    return response.json();
  },
  
  async insertBlankPage(file: File, pageIndex: number) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('pageIndex', pageIndex.toString());
    
    const response = await fetch(`${API_BASE_URL}/insert-blank-page`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    return response.json();
  },
  
  async addText(file: File, text: string, x: number, y: number, pageIndex: number) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('text', text);
    formData.append('x', x.toString());
    formData.append('y', y.toString());
    formData.append('pageIndex', pageIndex.toString());
    
    const response = await fetch(`${API_BASE_URL}/add-text`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    return response.json();
  },
  
  async downloadImagesZip(imageFolder: string) {
    const response = await fetch(`${API_BASE_URL}/download-images-zip/${imageFolder}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '下载失败');
    }
    
    return response.blob();
  },

  async extractTables(file: File) {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch(`${API_BASE_URL}/extract-tables`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    return response.json();
  }
};