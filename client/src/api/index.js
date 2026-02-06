const API_BASE = '/api';

export const api = {
  // Referencias
  async getReferences() {
    const res = await fetch(`${API_BASE}/references`);
    if (!res.ok) throw new Error('Error al obtener referencias');
    return res.json();
  },

  async getReference(id) {
    const res = await fetch(`${API_BASE}/references/${id}`);
    if (!res.ok) throw new Error('Referencia no encontrada');
    return res.json();
  },

  async createReference(data) {
    const formData = new FormData();

    Object.keys(data).forEach(key => {
      if (key === 'tags') {
        formData.append(key, JSON.stringify(data[key]));
      } else if (key === 'file' && data[key]) {
        formData.append(key, data[key]);
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    const res = await fetch(`${API_BASE}/references`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Error al crear referencia');
    return res.json();
  },

  async updateReference(id, data) {
    const res = await fetch(`${API_BASE}/references/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar referencia');
    return res.json();
  },

  async deleteReference(id) {
    const res = await fetch(`${API_BASE}/references/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar referencia');
    return res.json();
  },

  // Tags
  async getTags() {
    const res = await fetch(`${API_BASE}/tags`);
    if (!res.ok) throw new Error('Error al obtener tags');
    return res.json();
  },

  async createTag(data) {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear tag');
    return res.json();
  },

  // Búsqueda
  async search(query) {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error('Error en la búsqueda');
    return res.json();
  },

  // Estadísticas
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },

  // Asistente IA
  async getAiStatus() {
    const res = await fetch(`${API_BASE}/ai/status`);
    if (!res.ok) throw new Error('Error al obtener estado de IA');
    return res.json();
  },

  async aiSearch(query) {
    const res = await fetch(`${API_BASE}/ai/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('Error en búsqueda IA');
    return res.json();
  },

  async configureAi(apiKey) {
    const res = await fetch(`${API_BASE}/ai/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) throw new Error('Error al configurar IA');
    return res.json();
  },
};

export default api;
